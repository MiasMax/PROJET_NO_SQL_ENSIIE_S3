"""
P2P Messaging API Router.
Enables buyer-seller negotiation threads anchored to specific listings.
Messages persisted in MongoDB 'messages' collection; unread counts cached in Redis.
Includes low-latency in-memory fallback and offline demo support to ensure instant responsiveness.
"""

import asyncio
import os
import re
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.config import settings
from app.domain.repositories.cache_repository import CacheRepository
from app.infrastructure.persistence.mongo.client import MongoClientManager
from app.infrastructure.persistence.redis.client import RedisClientManager
from app.interfaces.dependencies import get_cache_repository

router = APIRouter(prefix="/api/messages", tags=["P2P Messaging"])

# In-memory fallback datastores when running in offline/demo mode without MongoDB/Redis
_IN_MEMORY_MESSAGES: list[dict[str, Any]] = []
_IN_MEMORY_UNREAD: dict[str, int] = {}

# Offline / Demo mode and circuit breaker state
_OFFLINE_DEMO_MODE: bool = False
_MONGO_HEALTHY: bool | None = None
_REDIS_HEALTHY: bool | None = None
_LAST_MONGO_CHECK: float = 0.0
_LAST_REDIS_CHECK: float = 0.0
CIRCUIT_COOLDOWN_SECONDS: float = 30.0
OPERATION_TIMEOUT_SECONDS: float = 0.25


def set_offline_demo_mode(enabled: bool) -> None:
    """Explicitly enable or disable offline demo mode (instant in-memory store)."""
    global _OFFLINE_DEMO_MODE
    _OFFLINE_DEMO_MODE = enabled


def is_offline_demo_mode() -> bool:
    return _OFFLINE_DEMO_MODE or os.environ.get("DEMO_MODE", "").lower() in ("1", "true", "yes")


def _can_try_mongo() -> bool:
    if is_offline_demo_mode():
        return False
    global _MONGO_HEALTHY, _LAST_MONGO_CHECK
    if _MONGO_HEALTHY is False and (time.time() - _LAST_MONGO_CHECK) < CIRCUIT_COOLDOWN_SECONDS:
        return False
    return True


def _can_try_redis() -> bool:
    if is_offline_demo_mode():
        return False
    global _REDIS_HEALTHY, _LAST_REDIS_CHECK
    if _REDIS_HEALTHY is False and (time.time() - _LAST_REDIS_CHECK) < CIRCUIT_COOLDOWN_SECONDS:
        return False
    return True


def _record_mongo_failure() -> None:
    global _MONGO_HEALTHY, _LAST_MONGO_CHECK
    _MONGO_HEALTHY = False
    _LAST_MONGO_CHECK = time.time()


def _record_mongo_success() -> None:
    global _MONGO_HEALTHY
    _MONGO_HEALTHY = True


def _record_redis_failure() -> None:
    global _REDIS_HEALTHY, _LAST_REDIS_CHECK
    _REDIS_HEALTHY = False
    _LAST_REDIS_CHECK = time.time()


def _record_redis_success() -> None:
    global _REDIS_HEALTHY
    _REDIS_HEALTHY = True


# ─── Seed Helper ──────────────────────────────────────────────────────────

def seed_demo_messages() -> None:
    """Populate default realistic buyer-seller conversations for demo mode."""
    if _IN_MEMORY_MESSAGES:
        return

    now = datetime.now(UTC)
    c1 = _conversation_id("sv03.5-006", "Sacha", "Ondine")
    c2 = _conversation_id("30th-B", "Sacha", "Pierre")

    # Conv 1: Ondine offering to buy Dracaufeu from Sacha
    _IN_MEMORY_MESSAGES.extend([
        {
            "_id": "seed-msg-1",
            "conversation_id": c1,
            "listing_id": "sv03.5-006",
            "sender_name": "Ondine",
            "recipient_name": "Sacha",
            "content": "Bonjour Sacha ! Ta carte Dracaufeu ex est-elle toujours sous sleeve Ultra Pro ?",
            "offer_price": None,
            "offer_type": "chat",
            "read": True,
            "sent_at": now - timedelta(hours=2, minutes=10),
        },
        {
            "_id": "seed-msg-2",
            "conversation_id": c1,
            "listing_id": "sv03.5-006",
            "sender_name": "Sacha",
            "recipient_name": "Ondine",
            "content": "Salut Ondine ! Oui, protégée dès la sortie de booster, état Near Mint impeccable et envoi sous toploader rigide garanti.",
            "offer_price": None,
            "offer_type": "chat",
            "read": True,
            "sent_at": now - timedelta(hours=1, minutes=40),
        },
        {
            "_id": "seed-msg-3",
            "conversation_id": c1,
            "listing_id": "sv03.5-006",
            "sender_name": "Ondine",
            "recipient_name": "Sacha",
            "content": "Super ! Je te fais une offre directe à 42,00 € pour finaliser la commande rapidement.",
            "offer_price": 42.0,
            "offer_type": "offer",
            "read": False,
            "sent_at": now - timedelta(minutes=25),
        },
    ])
    _IN_MEMORY_UNREAD[_unread_key("Sacha", c1)] = 1

    # Conv 2: Sacha chatting with Pierre about Mew 30th
    _IN_MEMORY_MESSAGES.extend([
        {
            "_id": "seed-msg-4",
            "conversation_id": c2,
            "listing_id": "30th-B",
            "sender_name": "Sacha",
            "recipient_name": "Pierre",
            "content": "Salut Pierre, as-tu des photos supplémentaires du dos de la carte Mew 30th Anniversary ?",
            "offer_price": None,
            "offer_type": "chat",
            "read": True,
            "sent_at": now - timedelta(hours=5),
        },
        {
            "_id": "seed-msg-5",
            "conversation_id": c2,
            "listing_id": "30th-B",
            "sender_name": "Pierre",
            "recipient_name": "Sacha",
            "content": "Salut ! Le centrage est 50/50 et aucun blanchiment sur les bordures. Tu peux commander en toute confiance.",
            "offer_price": None,
            "offer_type": "chat",
            "read": True,
            "sent_at": now - timedelta(hours=4, minutes=30),
        },
    ])


# ─── DTOs ─────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    listing_id: str = Field(..., description="Listing this conversation is about")
    sender_name: str = Field(..., min_length=1, max_length=60)
    recipient_name: str = Field(..., min_length=1, max_length=60)
    content: str = Field(..., min_length=1, max_length=2000)
    # Optional offer negotiation payload
    offer_price: float | None = Field(None, ge=0.01, description="Counter-offer price in euros")
    offer_type: str | None = Field(None, description="'offer' | 'accept' | 'decline' | 'chat'")


# ─── Helpers ──────────────────────────────────────────────────────────────

def _get_db():
    return MongoClientManager.connect(settings.MONGO_URI, settings.MONGO_DB)


def _get_redis():
    return RedisClientManager.connect(settings.REDIS_URL)


def _canonical_name(name: str) -> str:
    n = name.strip().lower()
    if n in ("ondine", "ondine_azuria", "championne_azuria", "ondine azuria"):
        return "ondine"
    if n in ("sacha", "red", "red_pallet", "dresseur_kanto", "sacha ketchum"):
        return "sacha"
    if n in ("chen", "professeur_chen", "professeur chen", "admin"):
        return "chen"
    if n in ("pierre", "pierre_argenta", "pierre argenta"):
        return "pierre"
    return n


def _conversation_id(listing_id: str, user_a: str, user_b: str) -> str:
    """Deterministic conversation ID: ordering is canonical (sorted names)."""
    pair = tuple(sorted([_canonical_name(user_a), _canonical_name(user_b)]))
    return f"conv:{listing_id}:{pair[0]}:{pair[1]}"


def _unread_key(username: str, conv_id: str) -> str:
    return f"unread:{_canonical_name(username)}:{conv_id}"


def _extract_sent_at(doc: dict[str, Any]) -> datetime:
    val = doc.get("sent_at")
    if isinstance(val, datetime):
        return val
    return datetime.min.replace(tzinfo=UTC)


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def send_message(
    payload: SendMessageRequest,
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """
    Persist a message (or negotiation offer) to MongoDB.
    Increments the recipient's unread counter in Redis via INCR.
    Falls back instantly to in-memory store in demo mode or when offline.
    """
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session and not session.get("is_admin"):
            caller_name = (session.get("name") or session.get("username") or "").lower().strip()
            caller_id = str(session.get("id", "")).lower().strip()
            sender = payload.sender_name.lower().strip()
            if caller_name != sender and caller_id != sender:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usurpation d'identité interdite : l'expéditeur doit correspondre à votre compte connecté.",
                )

    msg_id = str(uuid.uuid4())
    conv_id = _conversation_id(payload.listing_id, payload.sender_name, payload.recipient_name)
    now = datetime.now(UTC)

    doc: dict[str, Any] = {
        "_id": msg_id,
        "conversation_id": conv_id,
        "listing_id": payload.listing_id,
        "sender_name": payload.sender_name.strip(),
        "recipient_name": payload.recipient_name.strip(),
        "content": payload.content.strip(),
        "offer_price": payload.offer_price,
        "offer_type": payload.offer_type or "chat",
        "read": False,
        "sent_at": now,
    }

    persisted_mongo = False
    if _can_try_mongo():
        try:
            db = _get_db()
            await asyncio.wait_for(db["messages"].insert_one(doc), timeout=OPERATION_TIMEOUT_SECONDS)
            persisted_mongo = True
            _record_mongo_success()
        except Exception:
            _record_mongo_failure()

    if not persisted_mongo:
        _IN_MEMORY_MESSAGES.append(dict(doc))

    # Bump unread counter for recipient
    unread_key = _unread_key(payload.recipient_name, conv_id)
    persisted_redis = False
    if _can_try_redis():
        try:
            redis = _get_redis()
            await asyncio.wait_for(redis.incr(unread_key), timeout=OPERATION_TIMEOUT_SECONDS)
            persisted_redis = True
            _record_redis_success()
        except Exception:
            _record_redis_failure()

    if not persisted_redis:
        _IN_MEMORY_UNREAD[unread_key] = _IN_MEMORY_UNREAD.get(unread_key, 0) + 1

    return {
        "id": msg_id,
        "conversation_id": conv_id,
        "sent_at": now.isoformat(),
    }


@router.get("/conversations")
async def list_conversations(
    username: str = Query(..., description="Authenticated user name"),
    limit: int = Query(20, ge=1, le=100),
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """
    Return all conversation threads the user participates in, enriched with
    the latest message and unread count.
    """
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session and not session.get("is_admin"):
            caller_name = (session.get("name") or session.get("username") or "").lower().strip()
            caller_id = str(session.get("id", "")).lower().strip()
            target = username.lower().strip()
            if caller_name != target and caller_id != target:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Accès refusé : vous ne pouvez pas consulter les conversations d'un autre utilisateur.",
                )

    safe_username = re.escape(username.strip())
    docs: list[dict[str, Any]] = []
    mongo_success = False

    if _can_try_mongo():
        try:
            db = _get_db()
            pipeline = [
                {
                    "$match": {
                        "$or": [
                            {"sender_name": {"$regex": f"^{safe_username}$", "$options": "i"}},
                            {"recipient_name": {"$regex": f"^{safe_username}$", "$options": "i"}},
                        ]
                    }
                },
                {"$sort": {"sent_at": -1}},
                {
                    "$group": {
                        "_id": "$conversation_id",
                        "listing_id": {"$first": "$listing_id"},
                        "last_message": {"$first": "$content"},
                        "last_offer_price": {"$first": "$offer_price"},
                        "last_offer_type": {"$first": "$offer_type"},
                        "sender_name": {"$first": "$sender_name"},
                        "recipient_name": {"$first": "$recipient_name"},
                        "last_at": {"$first": "$sent_at"},
                        "total_messages": {"$sum": 1},
                    }
                },
                {"$sort": {"last_at": -1}},
                {"$limit": limit},
            ]
            docs = await asyncio.wait_for(
                db["messages"].aggregate(pipeline).to_list(length=limit),
                timeout=OPERATION_TIMEOUT_SECONDS,
            )
            mongo_success = True
            _record_mongo_success()
        except Exception:
            _record_mongo_failure()

    if not mongo_success:
        grouped: dict[str, list[dict[str, Any]]] = {}
        for m in _IN_MEMORY_MESSAGES:
            s = _canonical_name(str(m.get("sender_name", "")))
            r = _canonical_name(str(m.get("recipient_name", "")))
            u = _canonical_name(username)
            if s == u or r == u:
                cid = str(m.get("conversation_id", ""))
                grouped.setdefault(cid, []).append(m)
        for cid, msgs in grouped.items():
            sorted_msgs = sorted(
                msgs,
                key=_extract_sent_at,
                reverse=True,
            )
            first = sorted_msgs[0]
            docs.append({
                "_id": cid,
                "listing_id": first.get("listing_id"),
                "last_message": first.get("content"),
                "last_offer_price": first.get("offer_price"),
                "last_offer_type": first.get("offer_type"),
                "sender_name": first.get("sender_name"),
                "recipient_name": first.get("recipient_name"),
                "last_at": first.get("sent_at"),
                "total_messages": len(msgs),
            })

    results = []
    for doc in docs:
        conv_id = doc["_id"]
        unread = 0
        unread_key = _unread_key(username, conv_id)

        if _can_try_redis():
            try:
                redis = _get_redis()
                unread_raw = await asyncio.wait_for(redis.get(unread_key), timeout=OPERATION_TIMEOUT_SECONDS)
                unread = int(unread_raw) if unread_raw else 0
                _record_redis_success()
            except Exception:
                _record_redis_failure()
                unread = _IN_MEMORY_UNREAD.get(unread_key, 0)
        else:
            unread = _IN_MEMORY_UNREAD.get(unread_key, 0)

        other = (
            doc["recipient_name"]
            if str(doc["sender_name"]).lower() == username.lower()
            else doc["sender_name"]
        )

        sent_time = doc["last_at"]
        sent_iso = sent_time.isoformat() if isinstance(sent_time, datetime) else str(sent_time) if sent_time else None

        results.append(
            {
                "conversation_id": conv_id,
                "listing_id": doc["listing_id"],
                "other_party": other,
                "last_message": doc["last_message"],
                "last_offer_price": doc["last_offer_price"],
                "last_offer_type": doc["last_offer_type"],
                "last_at": sent_iso,
                "total_messages": doc["total_messages"],
                "unread": unread,
            }
        )

    return results


@router.get("/thread")
async def get_thread(
    listing_id: str = Query(...),
    user_a: str = Query(..., description="First participant"),
    user_b: str = Query(..., description="Second participant"),
    limit: int = Query(100, ge=1, le=500),
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """
    Fetch all messages in a conversation thread, sorted chronologically.
    Marks all messages as read for user_a by resetting their unread counter.
    """
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session and not session.get("is_admin"):
            caller_name = (session.get("name") or session.get("username") or "").lower().strip()
            caller_id = str(session.get("id", "")).lower().strip()
            ua = user_a.lower().strip()
            ub = user_b.lower().strip()
            is_participant = (
                caller_name == ua
                or caller_id == ua
                or caller_name == ub
                or caller_id == ub
            )
            if not is_participant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Accès refusé : vous n'êtes pas participant à cette conversation.",
                )

    conv_id = _conversation_id(listing_id, user_a, user_b)
    docs: list[dict[str, Any]] = []
    mongo_success = False

    if _can_try_mongo():
        try:
            db = _get_db()
            cursor = (
                db["messages"]
                .find({"conversation_id": conv_id})
                .sort("sent_at", 1)
                .limit(limit)
            )
            docs = await asyncio.wait_for(cursor.to_list(length=limit), timeout=OPERATION_TIMEOUT_SECONDS)
            mongo_success = True
            _record_mongo_success()
        except Exception:
            _record_mongo_failure()

    if not mongo_success:
        matched = [d for d in _IN_MEMORY_MESSAGES if d.get("conversation_id") == conv_id]
        docs = sorted(
            matched,
            key=_extract_sent_at,
        )[:limit]

    # Mark read: reset unread counter for user_a
    unread_key = _unread_key(user_a, conv_id)
    if _can_try_redis():
        try:
            redis = _get_redis()
            await asyncio.wait_for(redis.delete(unread_key), timeout=OPERATION_TIMEOUT_SECONDS)
            _record_redis_success()
        except Exception:
            _record_redis_failure()
            _IN_MEMORY_UNREAD.pop(unread_key, None)
    else:
        _IN_MEMORY_UNREAD.pop(unread_key, None)

    # Mark messages as read in persistence store
    if _can_try_mongo():
        try:
            db = _get_db()
            await asyncio.wait_for(
                db["messages"].update_many(
                    {"conversation_id": conv_id, "recipient_name": user_a, "read": False},
                    {"$set": {"read": True}},
                ),
                timeout=OPERATION_TIMEOUT_SECONDS,
            )
            _record_mongo_success()
        except Exception:
            _record_mongo_failure()

    for m in _IN_MEMORY_MESSAGES:
        if m.get("conversation_id") == conv_id and m.get("recipient_name", "").lower() == user_a.lower():
            m["read"] = True

    return {
        "conversation_id": conv_id,
        "messages": [
            {
                "id": d["_id"],
                "sender_name": d["sender_name"],
                "recipient_name": d["recipient_name"],
                "content": d["content"],
                "offer_price": d.get("offer_price"),
                "offer_type": d.get("offer_type", "chat"),
                "read": d.get("read", False),
                "sent_at": d["sent_at"].isoformat() if isinstance(d.get("sent_at"), datetime) else str(d.get("sent_at") or ""),
            }
            for d in docs
        ],
    }


@router.get("/unread-count")
async def get_unread_count(
    username: str = Query(...),
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """
    Sum of all unread message counters for a user.
    """
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if session and not session.get("is_admin"):
            caller_name = (session.get("name") or session.get("username") or session.get("id") or "").lower().strip()
            target = username.lower().strip()
            if caller_name != target and caller_name not in target and target not in caller_name:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Accès refusé : vous ne pouvez pas consulter les notifications d'un autre utilisateur.",
                )

    if _can_try_redis():
        try:
            redis = _get_redis()
            safe_prefix = _canonical_name(username)
            pattern = f"unread:{safe_prefix}:*"
            total = 0
            async for key in redis.scan_iter(pattern):
                val = await asyncio.wait_for(redis.get(key), timeout=OPERATION_TIMEOUT_SECONDS)
                if val:
                    total += int(val)
            _record_redis_success()
            return {"username": username, "unread_total": total}
        except Exception:
            _record_redis_failure()

    prefix = f"unread:{_canonical_name(username)}:"
    total = sum(v for k, v in _IN_MEMORY_UNREAD.items() if k.startswith(prefix))
    return {"username": username, "unread_total": total}
