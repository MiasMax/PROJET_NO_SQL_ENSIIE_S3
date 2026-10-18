"""
Update Listing Price Use Case.
Handles seller modification of an asking price across all NoSQL datastores:
1. MongoDB: Persist updated price in the 'listings' document collection.
2. Elasticsearch: Update indexed document in 'pokevinted_listings' for instant search visibility.
3. Redis: Invalidate query caches to guarantee fresh price reads.
"""

from dataclasses import dataclass

from app.domain.entities.listing import Listing
from app.domain.exceptions import ListingNotFoundError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.listing_status import ListingStatus


@dataclass
class UpdateListingPriceCommand:
    listing_id: str
    new_price: float
    seller_name: str | None = None


class UpdateListingPriceUseCase:
    def __init__(
        self,
        listing_repo: ListingRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.listing_repo = listing_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self, command: UpdateListingPriceCommand) -> Listing:
        listing = await self.listing_repo.get_by_id(command.listing_id)
        if not listing:
            raise ListingNotFoundError(command.listing_id)

        current_status = listing.status.value if isinstance(listing.status, ListingStatus) else listing.status
        if current_status != ListingStatus.ACTIVE.value:
            raise ValueError(f"Impossible de modifier le prix d'une annonce avec le statut '{current_status}'.")

        # Seller ownership verification
        if not command.seller_name or not command.seller_name.strip():
            raise ValueError("L'identité du vendeur est requise pour modifier le prix d'une annonce.")
        clean_cmd_seller = command.seller_name.strip().lower()
        clean_listing_seller = listing.seller_name.strip().lower()
        if clean_cmd_seller != clean_listing_seller:
            raise ValueError("Seul le vendeur propriétaire de cette annonce peut en modifier le prix.")

        # 1. Update Domain entity price
        listing.update_price(command.new_price)

        # 2. Persist updated document in MongoDB
        await self.listing_repo.save(listing)

        # 3. Update indexed document in Elasticsearch
        await self.search_repo.index_listing(listing)

        # 4. Invalidate Redis query caches
        await self.cache_repo.delete("cache:marketplace:recent")
        await self.cache_repo.delete_pattern("cache:listings:*")

        return listing
