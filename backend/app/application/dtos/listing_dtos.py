"""
Data transfer objects for marketplace listings.
"""

from pydantic import BaseModel, Field

from app.domain.value_objects.card_condition import CardCondition


class CreateListingRequest(BaseModel):
    card_id: str = Field(..., description="Card catalog identifier")
    price: float = Field(..., gt=0, description="Sale price in EUR (must be positive)")
    condition: CardCondition = Field(..., description="Card physical condition")
    seller_name: str = Field(..., min_length=2, max_length=50, description="Seller nickname")
    description: str = Field(default="", max_length=1000, description="Listing description")
    custom_image_url: str | None = Field(default=None, description="Optional custom image URL")


class UpdateListingPriceRequest(BaseModel):
    price: float = Field(..., gt=0, le=100_000, description="New sale price in EUR (must be positive)")
    seller_name: str | None = Field(default=None, description="Optional seller handle performing the edit")


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
