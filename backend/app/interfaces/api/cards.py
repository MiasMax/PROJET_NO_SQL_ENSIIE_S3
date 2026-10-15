"""
Routes API pour le catalogue de cartes de référence.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.interfaces.dependencies import get_cache_repository, get_card_repository

router = APIRouter(prefix="/api/cards", tags=["Cards Catalog"])


@router.get("", response_model=list[dict])
async def list_cards(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search: str | None = Query(None, description="Filtrer par nom de Pokémon"),
    card_repo: MongoCardRepository = Depends(get_card_repository),
):
    """Retourne la liste des cartes officielles disponibles dans le catalogue."""
    cards = await card_repo.list_cards(limit=limit, skip=skip, search=search)
    return [c.to_dict() for c in cards]


@router.get("/{card_id}", response_model=dict)
async def get_card_detail(
    card_id: str,
    card_repo: MongoCardRepository = Depends(get_card_repository),
):
    """Détail d'une carte du catalogue."""
    card = await card_repo.get_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Carte Pokémon non trouvée.")
    return card.to_dict()


@router.post("/{card_id}/view")
async def track_card_view(
    card_id: str,
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
):
    """
    Incrémente le score de popularité en temps réel dans Redis (Sorted Set : ZINCRBY).
    Permet un classement instantané sans saturer la base documentaire.
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
    Récupère le Top des cartes les plus consultées calculé en direct par Redis (ZREVRANGE).
    Jointure rapide avec MongoDB pour récupérer les visuels HD.
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
