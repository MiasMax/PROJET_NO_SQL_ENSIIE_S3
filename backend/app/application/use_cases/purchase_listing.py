"""
Purchase Listing Use Case.
Updates state across all three NoSQL datastores:
1. MongoDB: Transition listing to SOLD and create immutable Order record.
2. Elasticsearch: Update listing status in search index.
3. Redis: Decrement active listing counter, increment sales metrics.
"""

from dataclasses import dataclass

from app.domain.entities.order import Order
from app.domain.exceptions import (
    ListingAlreadySoldError,
    ListingNotFoundError,
    SelfPurchaseNotAllowedError,
)
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.listing_status import ListingStatus


@dataclass
class PurchaseListingCommand:
    listing_id: str
    buyer_name: str
    agreed_price: float | None = None


class PurchaseListingUseCase:
    def __init__(
        self,
        listing_repo: ListingRepository,
        order_repo: OrderRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.listing_repo = listing_repo
        self.order_repo = order_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self, command: PurchaseListingCommand) -> Order:
        listing = await self.listing_repo.get_by_id(command.listing_id)
        if not listing:
            raise ListingNotFoundError(command.listing_id)

        if listing.status == ListingStatus.SOLD:
            raise ListingAlreadySoldError(command.listing_id)

        # Invariant: A seller cannot purchase their own listing
        if command.buyer_name.strip().lower() == listing.seller_name.strip().lower():
            raise SelfPurchaseNotAllowedError(listing.seller_name)

        # Concurrency-safe atomic state transition in persistence layer
        updated_listing = await self.listing_repo.mark_as_sold(command.listing_id, command.buyer_name)
        if not updated_listing:
            raise ListingAlreadySoldError(command.listing_id)

        listing = updated_listing

        cond_str = (
            listing.condition.value
            if hasattr(listing.condition, "value")
            else str(listing.condition)
        )
        effective_price = (
            command.agreed_price
            if (command.agreed_price is not None and command.agreed_price > 0)
            else listing.price
        )
        order = Order.create(
            listing_id=listing.id,
            card_id=listing.card_id,
            card_name=listing.card_name,
            price=effective_price,
            seller_name=listing.seller_name,
            buyer_name=command.buyer_name,
            condition=cond_str,
            image_url=listing.image_url,
        )

        # Multi-system persistence
        # 1. MongoDB: Persist immutable order
        await self.order_repo.save(order)

        # 2. Elasticsearch: Update index entry with SOLD status
        await self.search_repo.index_listing(listing)

        # 3. Redis: Update live metrics and invalidate caches
        await self.cache_repo.increment_counter("stats:active_listings", -1)
        await self.cache_repo.increment_counter("stats:total_sales_count", 1)
        await self.cache_repo.increment_float_counter("stats:total_sales_volume", effective_price)
        await self.cache_repo.push_recent_item("orders:recent_ids", order.id, max_items=25)
        # A sold listing is no longer purchasable: drop it from the trending ZSET.
        await self.cache_repo.remove_trending_listing(command.listing_id)
        await self.cache_repo.delete("cache:marketplace:recent")
        await self.cache_repo.delete_pattern("cache:listings:*")
        await self.cache_repo.delete_pattern("cache:analytics:*")

        return order
