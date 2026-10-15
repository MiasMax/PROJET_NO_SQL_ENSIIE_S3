"""
User accounts, sessions, and watchlist router (Redis).
Manages member profiles, account registration, active sessions, and favorites.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.domain.entities.user import User
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.interfaces.dependencies import get_cache_repository

router = APIRouter(prefix="/api/users", tags=["Users & Sessions (Redis)"])

# Seed user registry (in-memory persistent state across sessions)
USERS_STORE: dict[str, dict[str, Any]] = {
    "sacha": {
        "id": "sacha",
        "username": "sacha",
        "name": "Sacha",
        "role": "Dresseur Kanto",
        "balance": 250.0,
        "is_admin": False,
    },
    "ondine": {
        "id": "ondine",
        "username": "ondine",
        "name": "Ondine",
        "role": "Championne Azuria",
        "balance": 480.0,
        "is_admin": False,
    },
    "chen": {
        "id": "chen",
        "username": "chen",
        "name": "Professeur Chen",
        "role": "Administrateur",
        "balance": 1500.0,
        "is_admin": True,
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
    role: str = Field("Dresseur", max_length=40)
    balance: float = Field(100.0, ge=0.0, le=100000.0)
    is_admin: bool = False


@router.get("", response_model=list[dict[str, Any]])
async def list_users():
    """List all registered members and administrators."""
    return list(USERS_STORE.values())


@router.post("/register", response_model=dict[str, Any])
async def register_user(
    payload: RegisterUserRequest,
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Register a new marketplace member or administrator and initialize session."""
    global ACTIVE_USER_ID
    user_id = payload.username.lower().strip().replace(" ", "_")
    if user_id in USERS_STORE:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé.")

    new_user = User.create(
        username=payload.username,
        name=payload.name,
        role=payload.role,
        balance=payload.balance,
        is_admin=payload.is_admin,
        user_id=user_id,
    )

    user_dict: dict[str, Any] = {
        "id": new_user.id,
        "username": new_user.username,
        "name": new_user.name,
        "role": new_user.role,
        "balance": new_user.balance,
        "is_admin": new_user.is_admin,
    }
    USERS_STORE[user_id] = user_dict
    ACTIVE_USER_ID = user_id

    token = f"sess_{user_id}_{uuid.uuid4().hex[:8]}"
    session_data = {**user_dict, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data


@router.get("/me")
async def get_current_user(
    x_session_token: str | None = Header(None),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Retrieve current logged-in user profile from Redis session."""
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session:
            user_id = session.get("id")
            if user_id in USERS_STORE:
                session["balance"] = USERS_STORE[user_id]["balance"]
            return session

    # Default fallback session: last active user or Sacha
    user_id = ACTIVE_USER_ID if ACTIVE_USER_ID in USERS_STORE else "sacha"
    default_user = USERS_STORE[user_id]
    token = f"sess_{default_user['id']}"
    session_data = {**default_user, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data



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
    ACTIVE_USER_ID = user_id
    token = f"sess_{user_id}_{uuid.uuid4().hex[:8]}"
    session_data = {**user, "token": token}
    await cache_repo.set_user_session(token, session_data, ttl_seconds=86400)
    return session_data


@router.get("/favorites", response_model=list[str])
async def get_user_favorites(
    user_id: str = "sacha",
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Fetch user favorite card IDs stored in a Redis Set (SMEMBERS)."""
    return await cache_repo.get_favorites(user_id)


@router.post("/favorites/{card_id}")
async def toggle_favorite(
    card_id: str,
    user_id: str = "sacha",
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Toggle a card in user favorites using atomic Redis Set operations (SADD / SREM)."""
    favorites = await cache_repo.get_favorites(user_id)
    if card_id in favorites:
        await cache_repo.remove_favorite(user_id, card_id)
        is_favorite = False
    else:
        await cache_repo.add_favorite(user_id, card_id)
        is_favorite = True

    return {
        "status": "success",
        "card_id": card_id,
        "is_favorite": is_favorite,
        "storage": "redis_set",
    }
