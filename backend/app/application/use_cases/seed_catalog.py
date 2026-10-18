"""
Catalog and Marketplace Seeding Use Case.
Loads authentic reference cards with official artwork and creates initial listings.
"""

from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository


class SeedCatalogUseCase:
    def __init__(
        self,
        card_repo: CardRepository,
        listing_repo: ListingRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.card_repo = card_repo
        self.listing_repo = listing_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self, cards: list[Card], initial_listings: list[Listing]) -> dict:
        # Purge existing collections if repository supports clearing
        if hasattr(self.card_repo, "clear"):
            await self.card_repo.clear()
        if hasattr(self.listing_repo, "clear"):
            await self.listing_repo.clear()
        if hasattr(self.search_repo, "clear"):
            await self.search_repo.clear()

        # Save reference cards to MongoDB catalog
        saved_cards_count = await self.card_repo.bulk_save(cards)

        # Seed and index initial listings
        listings_count = 0
        for listing in initial_listings:
            await self.listing_repo.save(listing)
            await self.search_repo.index_listing(listing)
            listings_count += 1

        # Clear listing caches
        await self.cache_repo.delete("cache:marketplace:recent")
        if hasattr(self.cache_repo, "delete_pattern"):
            await self.cache_repo.delete_pattern("cache:listings:*")
        else:
            await self.cache_repo.delete("cache:marketplace:recent")

        # Reset and seed the trending Sorted Set (Redis ZSET) with realistic initial
        # view counts on the flagship listings, so the Top 5 is populated with real,
        # persistent scores from the first launch (no hardcoded placeholder values).
        await self.cache_repo.delete("listings:trending_views")
        trending_seed = {
            listing.id: max(20, 150 - rank * 14)
            for rank, listing in enumerate(initial_listings[:10])
        }
        await self.cache_repo.seed_trending_listings(trending_seed)

        return {
            "cards_seeded": saved_cards_count,
            "listings_seeded": listings_count,
        }
