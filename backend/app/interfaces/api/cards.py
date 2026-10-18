"""
Cards Catalog API Router.
Handles reference card browsing, view tracking, and trending rankings.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.interfaces.dependencies import get_card_repository

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
