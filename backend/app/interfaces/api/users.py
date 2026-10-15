"""
User Sessions and Watchlist Router (Redis).
Highlights Redis features:
- Ephemeral user sessions with TTL.
- Favorite cards stored as Redis Sets (SADD, SREM, SMEMBERS).
"""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.interfaces.dependencies import get_cache_repository

router = APIRouter(prefix="/api/users", tags=["User Sessions & Watchlist (Redis)"])

# Preset demo trainer profiles
PRESET_USERS = {
    "sacha": {"id": "sacha", "name": "Sacha du Bourg-Palette", "role": "Kanto Trainer", "balance": 250.0},
    "ondine": {"id": "ondine", "name": "Ondine d'Azuria", "role": "Cerulean Gym Leader", "balance": 480.0},
    "chen": {"id": "chen", "name": "Professeur Chen", "role": "Pokémon Professor", "balance": 1500.0},
}


class SwitchUserRequest(BaseModel):
    user_id: str


@router.get("/me")
async def get_current_user(
    x_session_token: str | None = Header(None),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """Retrieve current logged-in user profile from Redis session."""
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session:
            return session

    # Default fallback session: Sacha
    default_user = PRESET_USERS["sacha"]
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
    user_id = payload.user_id.lower()
    if user_id not in PRESET_USERS:
        raise HTTPException(status_code=400, detail="Unknown trainer profile.")

    user = PRESET_USERS[user_id]
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
