"""
Data transfer objects for orders and purchases.
"""

from pydantic import BaseModel, Field


class PurchaseListingRequest(BaseModel):
    buyer_name: str = Field("Acheteur", min_length=1, max_length=50, description="Buyer name or handle")
    buyer_id: str | None = Field(None, description="Buyer account identifier if authenticated")
    agreed_price: float | None = Field(None, ge=0.01, description="Agreed negotiated price if accepted via chat offer")


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


class CheckoutCartRequest(BaseModel):
    listing_ids: list[str] = Field(..., min_length=1, max_length=50, description="List of listing IDs to purchase")
    buyer_name: str = Field("Acheteur", min_length=1, max_length=50, description="Buyer name or handle")
    buyer_id: str | None = Field(None, description="Buyer account identifier if authenticated")


class CheckoutCartResponse(BaseModel):
    orders: list[OrderResponse]
    total_amount: float
    item_count: int
    buyer_name: str
    buyer_balance: float | None = Field(None, description="Remaining balance of buyer account")

