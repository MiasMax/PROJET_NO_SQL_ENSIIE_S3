"""
Data transfer objects for orders and purchases.
"""

from pydantic import BaseModel, Field


class PurchaseListingRequest(BaseModel):
    buyer_name: str = Field("Acheteur", min_length=1, max_length=50, description="Buyer name or handle")
    buyer_id: str | None = Field(None, description="Buyer account identifier if authenticated")


class OrderResponse(BaseModel):
    id: str
    listing_id: str
    card_id: str
    card_name: str
    price: float
    seller_name: str
    buyer_name: str
    timestamp: str
    buyer_balance: float | None = Field(None, description="Remaining balance of buyer account")

