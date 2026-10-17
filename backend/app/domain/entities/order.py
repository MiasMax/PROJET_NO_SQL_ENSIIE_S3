"""
Order Entity.
Represents an immutable transaction record for a card purchase.
"""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class Order:
    id: str
    listing_id: str
    card_id: str
    card_name: str
    price: float
    seller_name: str
    buyer_name: str
    condition: str = "NEAR_MINT"
    image_url: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    @classmethod
    def create(
        cls,
        listing_id: str,
        card_id: str,
        card_name: str,
        price: float,
        seller_name: str,
        buyer_name: str,
        condition: str = "NEAR_MINT",
        image_url: str = "",
    ) -> "Order":
        return cls(
            id=str(uuid.uuid4()),
            listing_id=listing_id,
            card_id=card_id,
            card_name=card_name,
            price=round(float(price), 2),
            seller_name=seller_name,
            buyer_name=buyer_name,
            condition=condition,
            image_url=image_url,
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "card_id": self.card_id,
            "card_name": self.card_name,
            "price": self.price,
            "seller_name": self.seller_name,
            "buyer_name": self.buyer_name,
            "condition": self.condition,
            "image_url": self.image_url,
            "timestamp": self.timestamp,
        }
