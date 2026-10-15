"""
Search and faceted query repository interface (e.g. Elasticsearch).
"""

from abc import ABC, abstractmethod
from typing import Any

from app.domain.entities.listing import Listing
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus


class SearchRepository(ABC):
    @abstractmethod
    async def index_listing(self, listing: Listing) -> None:
        """Index or update listing in search engine."""
        pass

    @abstractmethod
    async def delete_listing(self, listing_id: str) -> None:
        """Delete listing from search index."""
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
        Execute multi-criteria fuzzy search with aggregations.
        Returns a dict matching: {'total': int, 'items': List[Listing], 'aggregations': dict}.
        """
        pass

    @abstractmethod
    async def get_indexed_count(self) -> int:
        """Return total number of indexed documents."""
        pass

    @abstractmethod
    async def get_aggregations(self) -> dict[str, Any]:
        """
        Compute analytical aggregations:
        - Distribution by status (ACTIVE vs SOLD)
        - Average price and volume by expansion set
        - Breakdown by condition grade and rarity
        """
        pass
