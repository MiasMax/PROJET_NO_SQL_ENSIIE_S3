"""
Schémas DTO pour les annonces du marketplace (Pydantic V2).
"""

from pydantic import BaseModel, Field

from app.domain.value_objects.card_condition import CardCondition


class CreateListingRequest(BaseModel):
    card_id: str = Field(..., description="ID de la carte Pokémon dans le catalogue")
    price: float = Field(..., gt=0, description="Prix de vente en euros (doit être > 0)")
    condition: CardCondition = Field(..., description="État d'usure de la carte")
    seller_name: str = Field(..., min_length=2, max_length=50, description="Pseudo du vendeur")
    description: str = Field(default="", max_length=1000, description="Description de l'annonce")
    custom_image_url: str | None = Field(default=None, description="URL d'une photo personnalisée")


class ListingResponse(BaseModel):
    id: str
    card_id: str
    card_name: str
    set_name: str
    rarity: str
    image_url: str
    price: float
    condition: str
    seller_name: str
    description: str
    status: str
    buyer_name: str | None = None
    created_at: str
    sold_at: str | None = None


class SearchListingsResponse(BaseModel):
    total: int
    items: list[ListingResponse]
    source: str | None = None
    cache_hit: bool | None = False
    response_time_ms: float | None = 0.0
