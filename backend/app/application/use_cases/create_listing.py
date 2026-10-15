"""
Create Listing Use Case.
Persists across MongoDB, Elasticsearch, and Redis:
1. MongoDB: Canonical document store (truth source).
2. Elasticsearch: Full-text search index with typo tolerance.
3. Redis: Atomic listing counters and cache invalidation.
"""

from dataclasses import dataclass

from app.domain.entities.listing import Listing
from app.domain.exceptions import CardNotFoundError, InvalidConditionError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.card_condition import CardCondition


@dataclass
class CreateListingCommand:
    card_id: str
    price: float
    condition: str
    seller_name: str
    description: str = ""
    custom_image_url: str | None = None


class CreateListingUseCase:
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

    async def execute(self, command: CreateListingCommand) -> Listing:
        # Validate that referenced card exists in catalog
        card = await self.card_repo.get_by_id(command.card_id)
        if not card:
            raise CardNotFoundError(command.card_id)

        try:
            condition = CardCondition(command.condition.upper())
        except ValueError:
            raise InvalidConditionError(command.condition) from None

        listing = Listing.create(
            card_id=card.id,
            card_name=card.name,
            set_name=card.set_name,
            rarity=card.rarity,
            image_url=card.image_large or card.image_small,
            price=command.price,
            condition=condition,
            seller_name=command.seller_name,
            description=command.description,
            custom_image_url=command.custom_image_url,
        )

        # Multi-system persistence
        # 1. MongoDB: Save authoritative listing document
        await self.listing_repo.save(listing)

        # 2. Elasticsearch: Synchronous search index update
        await self.search_repo.index_listing(listing)

        # 3. Redis: Atomic counter increment, feed push, and cache invalidation
        await self.cache_repo.increment_counter("stats:active_listings", 1)
        await self.cache_repo.increment_counter("stats:total_listings_created", 1)
        await self.cache_repo.push_recent_item("listings:recent_ids", listing.id, max_items=25)
        await self.cache_repo.delete("cache:marketplace:recent")

        return listing
