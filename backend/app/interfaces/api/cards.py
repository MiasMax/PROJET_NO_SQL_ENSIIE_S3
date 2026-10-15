"""
Routes API pour le catalogue de cartes de référence.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.interfaces.dependencies import get_card_repository

router = APIRouter(prefix="/api/cards", tags=["Cards Catalog"])


@router.get("", response_model=List[dict])
async def list_cards(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Filtrer par nom de Pokémon"),
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
