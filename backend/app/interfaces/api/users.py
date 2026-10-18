"""
User accounts, authentication, sessions, and watchlist router (MongoDB + Redis).
Manages member profiles, registration, login/logout, wallet operations, and favorites.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.domain.entities.user import User, hash_password, verify_password
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.interfaces.dependencies import (
    get_cache_repository,
    get_listing_repository,
    get_order_repository,
    get_user_repository,
)

# Documented demo password for the seeded administrator account. Non-admin seed
# trainers (sacha, ondine) stay passwordless for one-click demo switching; the
# admin account must authenticate so it cannot be assumed by an anonymous caller.
DEMO_ADMIN_PASSWORD = "PokeAdmin2026!"

router = APIRouter(prefix="/api/users", tags=["Users & Authentication (MongoDB + Redis)"])

# In-memory registry fallback for demo & test environments
USERS_STORE: dict[str, dict[str, Any]] = {
    "sacha": {
        "id": "sacha",
        "username": "sacha",
        "name": "Sacha",
        "email": "sacha@pokevinted.fr",
        "password_hash": "",
        "role": "Dresseur Kanto",
        "balance": 250.0,
        "is_admin": False,
        "created_at": datetime.now(UTC).isoformat(),
    },
    "ondine": {
        "id": "ondine",
        "username": "ondine",
        "name": "Ondine",
        "email": "ondine@pokevinted.fr",
        "password_hash": "",
        "role": "Championne Azuria",
        "balance": 480.0,
        "is_admin": False,
        "created_at": datetime.now(UTC).isoformat(),
    },
    "chen": {
        "id": "chen",
        "username": "chen",
        "name": "Professeur Chen",
        "email": "admin@pokevinted.fr",
        "password_hash": hash_password(DEMO_ADMIN_PASSWORD),
        "role": "Administrateur",
        "balance": 1500.0,
        "is_admin": True,
        "created_at": datetime.now(UTC).isoformat(),
    },
}

ACTIVE_USER_ID: str = "sacha"


def find_user(identifier: str | None) -> dict[str, Any] | None:
    """Find registered user by identifier, username, or display name."""
    if not identifier:
        return None
    clean = identifier.lower().strip()
    if clean in USERS_STORE:
        return USERS_STORE[clean]
    for u in USERS_STORE.values():
        if u["username"].lower() == clean or u["name"].lower() == clean:
            return u
    for u in USERS_STORE.values():
        if u["id"] in clean or clean in u["id"]:
            return u
    return None


def debit_user_balance(identifier: str | None, amount: float) -> tuple[dict[str, Any] | None, float | None]:
    """
    Atomically debits the user's account balance.
    Returns (updated_user_dict, new_balance).
    Raises HTTPException(400) if balance is insufficient.
    """
    user = find_user(identifier)
    if not user:
        return None, None

    if user["balance"] < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Solde insuffisant pour finaliser cet achat. Solde actuel : {user['balance']:.2f} €, montant requis : {amount:.2f} €.",
        )

    user["balance"] = round(user["balance"] - amount, 2)
    return user, user["balance"]


def reset_seed_users() -> None:
    """Reset default seed user balances."""
    if "sacha" in USERS_STORE:
        USERS_STORE["sacha"]["balance"] = 250.0
    if "ondine" in USERS_STORE:
        USERS_STORE["ondine"]["balance"] = 480.0
    if "chen" in USERS_STORE:
        USERS_STORE["chen"]["balance"] = 1500.0


def credit_user_balance(identifier: str | None, amount: float) -> None:
    """Atomically credits seller account balance if registered."""
    user = find_user(identifier)
    if user:
        user["balance"] = round(user["balance"] + amount, 2)


class SwitchUserRequest(BaseModel):
    user_id: str


class RegisterUserRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=30)
    name: str = Field(..., min_length=2, max_length=50)
    email: str = Field("", max_length=100)
    password: str = Field("", max_length=100)
    role: str = Field("Dresseur", max_length=40)
    balance: float = Field(150.0, ge=0.0, le=100000.0)
    is_admin: bool = False


class LoginUserRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field("", max_length=100)


class RechargeWalletRequest(BaseModel):
    amount: float = Field(..., gt=0.0, le=10000.0)


@router.get("", response_model=list[dict[str, Any]])
async def list_users():
    """List all registered members and administrators."""
    return [
        {k: v for k, v in u.items() if k != "password_hash"}
        for u in USERS_STORE.values()
    ]


@router.post("/register", response_model=dict[str, Any])
async def register_user(
    payload: RegisterUserRequest,
    cache_repo: CacheRepository = Depends(get_cache_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Register a new marketplace member or administrator and initialize session."""
    global ACTIVE_USER_ID
    user_id = payload.username.lower().strip().replace(" ", "_")

    # Check persistence and store
    if user_id in USERS_STORE:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé.")

    existing_in_repo = await user_repo.get_by_id(user_id)
    if existing_in_repo:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé.")

    new_user = User.create(
        username=payload.username,
        name=payload.name,
        email=payload.email or f"{user_id}@pokevinted.fr",
        password=payload.password,
        role=payload.role,
        balance=payload.balance,
        is_admin=payload.is_admin,
        user_id=user_id,
    )

    # Persist in MongoDB
    try:
        await user_repo.save(new_user)
    except Exception:
        pass  # In-memory demo fallback

    user_dict: dict[str, Any] = new_user.to_dict()
    user_dict_with_pwd = new_user.to_dict(include_private=True)
    USERS_STORE[user_id] = user_dict_with_pwd
    ACTIVE_USER_ID = user_id

    token = f"sess_{user_id}_{uuid.uuid4().hex[:12]}"
    session_data = {**user_dict, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data


@router.post("/login", response_model=dict[str, Any])
async def login_user(
    payload: LoginUserRequest,
    cache_repo: CacheRepository = Depends(get_cache_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Authenticate registered member with username and password, returns session token."""
    global ACTIVE_USER_ID
    clean_username = payload.username.strip().lower()

    # Find user in store or repository
    target_user_dict = None
    if clean_username in USERS_STORE:
        target_user_dict = USERS_STORE[clean_username]
    else:
        for u in USERS_STORE.values():
            if u["username"].lower() == clean_username or u.get("email", "").lower() == clean_username:
                target_user_dict = u
                break

    if not target_user_dict:
        # Check database
        user_entity = await user_repo.get_by_username(clean_username)
        if not user_entity and "@" in clean_username:
            user_entity = await user_repo.get_by_email(clean_username)
        if user_entity:
            target_user_dict = user_entity.to_dict(include_private=True)
            USERS_STORE[user_entity.id] = target_user_dict

    if not target_user_dict:
        raise HTTPException(status_code=401, detail="Identifiants incorrects (aucun compte trouvé pour ce pseudo).")

    # Password verification.
    #  - Administrator accounts MUST authenticate with a valid password (no bypass).
    #  - Accounts that have a password set must match it.
    #  - Passwordless non-admin seed trainers stay one-click loginable for the demo.
    stored_hash = target_user_dict.get("password_hash", "")
    if target_user_dict.get("is_admin"):
        if not stored_hash or not verify_password(payload.password, stored_hash):
            raise HTTPException(status_code=401, detail="Mot de passe administrateur incorrect.")
    elif stored_hash:
        if not verify_password(payload.password, stored_hash):
            raise HTTPException(status_code=401, detail="Mot de passe incorrect.")

    ACTIVE_USER_ID = target_user_dict["id"]
    token = f"sess_{target_user_dict['id']}_{uuid.uuid4().hex[:12]}"
    public_user = {k: v for k, v in target_user_dict.items() if k != "password_hash"}
    session_data = {**public_user, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data


@router.post("/logout")
async def logout_user(
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """Invalidate session token in Redis and log out."""
    if x_session_token:
        await cache_repo.delete_user_session(x_session_token)
    return {"status": "success", "message": "Déconnexion réussie"}


@router.get("/me")
async def get_current_user(
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """Retrieve current logged-in user profile from Redis session."""
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session:
            user_id = session.get("id")
            if user_id in USERS_STORE:
                session["balance"] = USERS_STORE[user_id]["balance"]
            return session

    # Default fallback session for tests or initial guest session
    user_id = ACTIVE_USER_ID if ACTIVE_USER_ID in USERS_STORE else "sacha"
    default_user = {k: v for k, v in USERS_STORE[user_id].items() if k != "password_hash"}
    token = f"sess_{default_user['id']}"
    session_data = {**default_user, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data


@router.post("/wallet/recharge")
async def recharge_wallet(
    payload: RechargeWalletRequest,
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Top up account wallet balance."""
    if payload.amount <= 0 or payload.amount > 10000.0:
        raise HTTPException(
            status_code=400,
            detail="Le montant de recharge doit être strictement positif et inférieur ou égal à 10 000,00 €.",
        )

    user_id = ACTIVE_USER_ID
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session and session.get("id"):
            user_id = session["id"]

    user = find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    user["balance"] = round(user["balance"] + payload.amount, 2)

    # Persist in DB
    user_entity = await user_repo.get_by_id(user_id)
    if user_entity:
        user_entity.credit_balance(payload.amount)
        await user_repo.save(user_entity)

    # Update session in Redis
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session:
            session["balance"] = user["balance"]
            await cache_repo.set_user_session(x_session_token, session, ttl_seconds=86400)

    return {
        "status": "success",
        "user_id": user_id,
        "amount_added": payload.amount,
        "new_balance": user["balance"],
    }


@router.get("/me/orders")
async def get_my_orders(
    x_session_token: str | None = Header(None),
    buyer_name: str | None = Query(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
    order_repo: OrderRepository = Depends(get_order_repository),
):
    """Fetch order purchase history for current logged-in user."""
    resolved_name = buyer_name
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session:
            resolved_name = session.get("name") or session.get("username")

    all_orders = await order_repo.list_orders(limit=100)
    if not resolved_name:
        return [o.to_dict() for o in all_orders]

    clean_target = resolved_name.lower().strip()
    user_orders = [
        o.to_dict()
        for o in all_orders
        if clean_target in o.buyer_name.lower() or o.buyer_name.lower() in clean_target
    ]
    return user_orders


@router.get("/me/listings")
async def get_my_listings(
    x_session_token: str | None = Header(None),
    seller_name: str | None = Query(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
    listing_repo: ListingRepository = Depends(get_listing_repository),
):
    """Fetch all marketplace listings (active and sold) created by the current logged-in user."""
    resolved_name = seller_name
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session:
            resolved_name = session.get("name") or session.get("username")

    all_listings = await listing_repo.list_listings(limit=1000)
    if not resolved_name:
        return [item.to_dict() for item in all_listings]

    clean_target = resolved_name.lower().strip()
    user_listings = [
        item.to_dict()
        for item in all_listings
        if clean_target in item.seller_name.lower() or item.seller_name.lower() in clean_target
    ]
    return user_listings


@router.post("/switch")
async def switch_user(
    payload: SwitchUserRequest,
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Switch active trainer account and persist session in Redis."""
    global ACTIVE_USER_ID
    user_id = payload.user_id.lower().strip()
    if user_id not in USERS_STORE:
        raise HTTPException(status_code=400, detail="Profil utilisateur inconnu.")

    user = USERS_STORE[user_id]
    # Quick trainer switching is a demo convenience and must never hand out an
    # admin session: administrator access requires an authenticated login.
    if user.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail="Un compte administrateur requiert une connexion sécurisée avec mot de passe.",
        )
    ACTIVE_USER_ID = user_id
    token = f"sess_{user_id}_{uuid.uuid4().hex[:8]}"
    public_user = {k: v for k, v in user.items() if k != "password_hash"}
    session_data = {**public_user, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data


@router.get("/favorites", response_model=list[str])
async def get_user_favorites(
    user_id: str = "sacha",
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Fetch user favorite card IDs stored in a Redis Set (SMEMBERS)."""
    return await cache_repo.get_favorites(user_id)


@router.post("/favorites/{listing_id}")
async def toggle_favorite(
    listing_id: str,
    user_id: str = "sacha",
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """
    Toggle a single marketplace listing in the user's favorites using atomic Redis
    Set operations (SADD / SREM). Favorites track individual listings, so two offers
    of the same card are favorited independently.
    """
    favorites = await cache_repo.get_favorites(user_id)
    if listing_id in favorites:
        await cache_repo.remove_favorite(user_id, listing_id)
        is_favorite = False
    else:
        await cache_repo.add_favorite(user_id, listing_id)
        is_favorite = True

    return {
        "status": "success",
        "listing_id": listing_id,
        "is_favorite": is_favorite,
        "storage": "redis_set",
    }
