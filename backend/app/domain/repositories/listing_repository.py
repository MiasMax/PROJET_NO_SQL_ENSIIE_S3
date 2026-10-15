"""
Port abstrait du repository Annonces Marketplace (Source de vérité principale, e.g. MongoDB).
"""

from abc import ABC, abstractmethod

from app.domain.entities.listing import Listing
from app.domain.value_objects.listing_status import ListingStatus


class ListingRepository(ABC):
    @abstractmethod
    async def save(self, listing: Listing) -> None:
        """Persiste une nouvelle annonce ou met à jour une existante."""
        pass

    @abstractmethod
    async def get_by_id(self, listing_id: str) -> Listing | None:
        """Récupère une annonce par son ID."""
        pass

    @abstractmethod
    async def list_listings(
        self, status: ListingStatus | None = None, limit: int = 50, skip: int = 0
    ) -> list[Listing]:
        """Récupère la liste des annonces filtrées par statut."""
        pass

    @abstractmethod
    async def count_by_status(self, status: ListingStatus | None = None) -> int:
        """Compte le nombre d'annonces."""
        pass

    @abstractmethod
    async def get_recent(self, limit: int = 10) -> list[Listing]:
        """Récupère les dernières annonces créées."""
        pass
