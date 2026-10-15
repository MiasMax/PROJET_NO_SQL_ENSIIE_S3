"""
Entité Annonce Marketplace (Listing).
Représente la mise en vente d'un exemplaire physique par un utilisateur (style Vinted).
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
    card_id: str  # Référence vers la carte du catalogue
    card_name: str  # Nom dénormalisé pour requêtes rapides
    set_name: str  # Nom de l'extension dénormalisé
    rarity: str  # Rareté dénormalisée
    image_url: str  # Image affichée (photo vendeur ou image HD catalogue)
    price: float  # Prix demandé par le vendeur en €
    condition: CardCondition  # État d'usure
    seller_name: str  # Pseudo du vendeur (ex: 'Sacha_du_Bourg_Palette')
    description: str  # Description textuelle personnalisée
    status: ListingStatus = ListingStatus.ACTIVE
    buyer_name: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    sold_at: str | None = None

    def __post_init__(self):
        # Invariant métier : le prix doit être strictement positif
        if self.price <= 0:
            raise InvalidPriceError(self.price)
        if not self.seller_name or not self.seller_name.strip():
            raise ValueError("Le nom du vendeur est obligatoire.")

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
        """Factory pour initialiser une nouvelle annonce valide."""
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
        """Marque l'annonce comme vendue à un acheteur spécifique."""
        if self.status == ListingStatus.SOLD:
            raise ListingAlreadySoldError(self.id)
        if not buyer_name or not buyer_name.strip():
            raise ValueError("Le nom de l'acheteur est obligatoire pour valider la vente.")

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
