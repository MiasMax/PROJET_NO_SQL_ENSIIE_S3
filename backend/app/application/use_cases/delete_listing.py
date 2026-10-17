"""
Delete Listing Use Case.
Handles administrative or seller removal of an offer across all NoSQL datastores:
1. MongoDB: Permanently remove the listing document.
2. Elasticsearch: Delete document from search index pokevinted_listings.
3. Redis: Invalidate query caches and decrement active listing counter if active.
"""

from typing import Any

from app.domain.exceptions import ListingNotFoundError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.listing_status import ListingStatus


class DeleteListingUseCase:
    def __init__(
        self,
        listing_repo: ListingRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.listing_repo = listing_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self, listing_id: str) -> dict[str, Any]:
        listing = await self.listing_repo.get_by_id(listing_id)
        if not listing:
            raise ListingNotFoundError(listing_id)

        # 1. Delete from MongoDB document store
        deleted = await self.listing_repo.delete(listing_id)

        # 2. Delete from Elasticsearch search index
        await self.search_repo.delete_listing(listing_id)

        # 3. Update Redis counters & invalidate cache
        if listing.status == ListingStatus.ACTIVE:
            try:
                await self.cache_repo.increment_counter("counter:listings:active", -1)
            except Exception:
                pass

        await self.cache_repo.delete("cache:marketplace:recent")
        await self.cache_repo.delete_pattern("cache:listings:*")

        return {
            "deleted": deleted,
            "listing_id": listing_id,
            "card_name": listing.card_name,
            "seller_name": listing.seller_name,
            "price": listing.price,
        }
