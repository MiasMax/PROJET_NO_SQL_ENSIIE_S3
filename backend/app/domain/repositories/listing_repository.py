"""
Marketplace listing repository interface.
Authoritative document store contract for listings (e.g. MongoDB).
"""

from abc import ABC, abstractmethod

from app.domain.entities.listing import Listing
from app.domain.value_objects.listing_status import ListingStatus


class ListingRepository(ABC):
    @abstractmethod
    async def save(self, listing: Listing) -> None:
        """Persist a new listing or update an existing one."""
        pass

    @abstractmethod
    async def get_by_id(self, listing_id: str) -> Listing | None:
        """Fetch listing by unique identifier."""
        pass

    @abstractmethod
    async def list_listings(
        self, status: ListingStatus | None = None, limit: int = 50, skip: int = 0
    ) -> list[Listing]:
        """List listings with optional status filtering."""
        pass

    @abstractmethod
    async def count_by_status(self, status: ListingStatus | None = None) -> int:
        """Count total listings matching status."""
        pass

    @abstractmethod
    async def get_recent(self, limit: int = 10) -> list[Listing]:
        """Fetch recently created listings."""
        pass

    @abstractmethod
    async def mark_as_sold(self, listing_id: str, buyer_name: str) -> Listing | None:
        """Atomically transition listing from ACTIVE to SOLD. Returns updated listing or None if already sold."""
        pass

    @abstractmethod
    async def delete(self, listing_id: str) -> bool:
        """Permanently delete a listing from document store. Returns True if deleted, False otherwise."""
        pass

