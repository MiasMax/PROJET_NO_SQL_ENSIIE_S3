"""
Port abstrait du moteur de recherche textuelle et filtrage avancé (e.g. Elasticsearch).
"""

from abc import ABC, abstractmethod
from typing import Any

from app.domain.entities.listing import Listing
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus


class SearchRepository(ABC):
    @abstractmethod
    async def index_listing(self, listing: Listing) -> None:
        """Indexe ou met à jour une annonce dans le moteur de recherche."""
        pass

    @abstractmethod
    async def delete_listing(self, listing_id: str) -> None:
        """Supprime une annonce de l'index de recherche."""
        pass

    @abstractmethod
    async def search_listings(
        self,
        query: str | None = None,
        set_name: str | None = None,
        condition: CardCondition | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        status: ListingStatus | None = ListingStatus.ACTIVE,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        skip: int = 0,
    ) -> dict[str, Any]:
        """
        Recherche multicritères et floue avec aggregations.
        Retourne un dictionnaire {'total': int, 'items': List[Listing], 'aggregations': dict}.
        """
        pass

    @abstractmethod
    async def get_indexed_count(self) -> int:
        """Nombre total de documents indexés."""
        pass

    @abstractmethod
    async def get_aggregations(self) -> dict[str, Any]:
        """
        Calcule les agrégations analytiques via Elasticsearch :
        - Répartition par statut (ACTIVE vs SOLD)
        - Prix moyen et volumétrie par extension (set_name)
        - Distribution par état d'usure et rareté
        """
        pass
