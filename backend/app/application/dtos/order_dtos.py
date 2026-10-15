"""
Data transfer objects for orders and purchases.
"""

from pydantic import BaseModel, Field


class PurchaseListingRequest(BaseModel):
    buyer_name: str = Field(..., min_length=2, max_length=50, description="Buyer name or handle")


class OrderResponse(BaseModel):
    id: str
    listing_id: str
    card_id: str
    card_name: str
    price: float
    seller_name: str
    buyer_name: str
    timestamp: str
