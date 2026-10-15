"""
Marketplace Listing Entity.
Represents an item put up for sale by a user.
"""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.domain.exceptions import InvalidPriceError, ListingAlreadySoldError
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus


@dataclass
class Listing:
    id: str
    card_id: str  # Catalog card reference
    card_name: str  # Denormalized for fast reads
    set_name: str  # Denormalized expansion set
    rarity: str  # Denormalized rarity
    image_url: str  # Display image (seller photo or HD catalog artwork)
    price: float  # Asking price in EUR
    condition: CardCondition  # Wear condition
    seller_name: str  # Seller handle
    description: str  # Custom listing notes
    status: ListingStatus = ListingStatus.ACTIVE
    buyer_name: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    sold_at: str | None = None

    def __post_init__(self):
        if self.price <= 0:
            raise InvalidPriceError(self.price)
        if not self.seller_name or not self.seller_name.strip():
            raise ValueError("Seller name is required.")

    @classmethod
    def create(
        cls,
        card_id: str,
        card_name: str,
        set_name: str,
        rarity: str,
        image_url: str,
        price: float,
        condition: CardCondition,
        seller_name: str,
        description: str = "",
        custom_image_url: str | None = None,
    ) -> "Listing":
        """Factory creating a validated active listing."""
        return cls(
            id=str(uuid.uuid4()),
            card_id=card_id,
            card_name=card_name,
            set_name=set_name,
            rarity=rarity,
            image_url=custom_image_url or image_url,
            price=round(float(price), 2),
            condition=condition,
            seller_name=seller_name.strip(),
            description=description.strip(),
            status=ListingStatus.ACTIVE,
        )

    def mark_as_sold(self, buyer_name: str) -> None:
        """Mark listing as sold to a buyer."""
        if self.status == ListingStatus.SOLD:
            raise ListingAlreadySoldError(self.id)
        if not buyer_name or not buyer_name.strip():
            raise ValueError("Buyer name is required.")

        self.status = ListingStatus.SOLD
        self.buyer_name = buyer_name.strip()
        self.sold_at = datetime.now(UTC).isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "card_id": self.card_id,
            "card_name": self.card_name,
            "set_name": self.set_name,
            "rarity": self.rarity,
            "image_url": self.image_url,
            "price": self.price,
            "condition": self.condition.value
            if isinstance(self.condition, CardCondition)
            else self.condition,
            "seller_name": self.seller_name,
            "description": self.description,
            "status": self.status.value if isinstance(self.status, ListingStatus) else self.status,
            "buyer_name": self.buyer_name,
            "created_at": self.created_at,
            "sold_at": self.sold_at,
        }
