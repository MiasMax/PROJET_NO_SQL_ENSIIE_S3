"""
Cards Catalog API Router.
Handles reference card browsing, view tracking, and trending rankings.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.interfaces.dependencies import get_cache_repository, get_card_repository

router = APIRouter(prefix="/api/cards", tags=["Cards Catalog"])


@router.get("", response_model=list[dict])
async def list_cards(
    limit: int = Query(50, ge=1, le=100, description="Page size limit"),
    skip: int = Query(0, ge=0, le=5000, description="Pagination offset"),
    search: str | None = Query(None, max_length=100, description="Filter by Pokémon card name"),
    card_repo: MongoCardRepository = Depends(get_card_repository),
):
    """List catalog cards with optional name filtering."""
    cards = await card_repo.list_cards(limit=limit, skip=skip, search=search)
    return [c.to_dict() for c in cards]


@router.get("/{card_id}", response_model=dict)
async def get_card_detail(
    card_id: str,
    card_repo: MongoCardRepository = Depends(get_card_repository),
):
    """Retrieve detailed metadata for a catalog card."""
    card = await card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found.")
    return card.to_dict()


@router.post("/{card_id}/view")
async def track_card_view(
    card_id: str,
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """
    Increment real-time card view counter in Redis Sorted Set (ZINCRBY).
    Maintains instantaneous trending ranks without stressing the document database.
    """
    await cache_repo.track_card_view(card_id)
    return {"status": "tracked", "card_id": card_id}


@router.get("/trending/top", response_model=list[dict])
async def get_trending_cards(
    limit: int = Query(5, ge=1, le=10),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
    card_repo: MongoCardRepository = Depends(get_card_repository),
):
    """
    Retrieve top trending cards computed via Redis Sorted Set (ZREVRANGE).
    Enriches IDs with MongoDB catalog details and artwork.
    """
    trending_scores = await cache_repo.get_trending_card_ids(limit=limit)
    enriched = []
    for item in trending_scores:
        card = await card_repo.get_by_id(item["card_id"])
        if card:
            enriched.append(
                {
                    **card.to_dict(),
                    "views": item["views"],
                }
            )
    return enriched
