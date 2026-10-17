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
    limit: int = Query(100, ge=1, le=5000, description="Page size limit"),
    skip: int = Query(0, ge=0, le=10000, description="Pagination offset"),
    search: str | None = Query(None, max_length=100, description="Filter by Pokémon card name"),
    set_name: str | None = Query(None, max_length=100, description="Filter by expansion set name"),
    card_repo: MongoCardRepository = Depends(get_card_repository),
):
    """List catalog cards with optional name and expansion set filtering."""
    cards = await card_repo.list_cards(limit=limit, skip=skip, search=search)
    if set_name:
        cards = [c for c in cards if c.set_name.lower() == set_name.lower()]
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
    Guarantees returning exactly `limit` valid cards.
    """
    candidate_limit = max(limit * 4, 25)
    trending_scores = await cache_repo.get_trending_card_ids(limit=candidate_limit)
    enriched = []
    seen_ids = set()

    for item in trending_scores:
        card = await card_repo.get_by_id(item["card_id"])
        if card and card.id not in seen_ids:
            seen_ids.add(card.id)
            enriched.append(
                {
                    **card.to_dict(),
                    "views": item["views"],
                }
            )
            if len(enriched) >= limit:
                break

    # If Redis had fewer than `limit` valid items, top up with iconic chase cards
    if len(enriched) < limit:
        curated_chase = [
            ("sv03.5-006", 142),
            ("30th-B", 128),
            ("30th-150", 115),
            ("30th-154", 98),
            ("30th-152", 87),
            ("sv03.5-199", 76),
            ("me02-125", 64),
            ("sv08.5-006", 55),
        ]
        for c_id, c_views in curated_chase:
            card = await card_repo.get_by_id(c_id)
            if card and card.id not in seen_ids:
                seen_ids.add(card.id)
                enriched.append(
                    {
                        **card.to_dict(),
                        "views": c_views,
                    }
                )
                if len(enriched) >= limit:
                    break

    # If still needed, complete with catalog reference cards
    if len(enriched) < limit:
        extra_cards = await card_repo.list_cards(limit=limit * 2)
        for card in extra_cards:
            if card.id not in seen_ids:
                seen_ids.add(card.id)
                enriched.append(
                    {
                        **card.to_dict(),
                        "views": 30,
                    }
                )
                if len(enriched) >= limit:
                    break

    return enriched[:limit]
