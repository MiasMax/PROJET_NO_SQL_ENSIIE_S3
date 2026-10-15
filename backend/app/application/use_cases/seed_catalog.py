"""
Use Case : Peuplement initial du catalogue et du marketplace (Seed).
Injecte des cartes réelles avec images HD officielles et crée les premières annonces.
"""
from typing import List
from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.value_objects.card_condition import CardCondition
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.repositories.cache_repository import CacheRepository


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

    async def execute(self, cards: List[Card], initial_listings: List[Listing]) -> dict:
        # 1. Sauvegarde des cartes de référence dans MongoDB
        saved_cards_count = await self.card_repo.bulk_save(cards)

        # 2. Création et synchronisation des premières annonces
        listings_count = 0
        for listing in initial_listings:
            await self.listing_repo.save(listing)
            await self.search_repo.index_listing(listing)
            await self.cache_repo.increment_counter("stats:active_listings", 1)
            await self.cache_repo.push_recent_item("listings:recent_ids", listing.id)
            listings_count += 1

        # Invalidation cache
        await self.cache_repo.delete("cache:marketplace:recent")

        return {
            "cards_seeded": saved_cards_count,
            "listings_seeded": listings_count,
        }
