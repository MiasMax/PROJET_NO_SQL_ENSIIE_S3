"""
Checkout Cart Use Case (Multi-item purchase).
Allows atomic batch purchase of multiple unique card listings from the cart:
1. MongoDB: Transition all listings to SOLD and create immutable Order records.
2. Elasticsearch: Update listing status in search index.
3. Redis: Decrement active listing counter by N, increment sales metrics by sum.
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
class CheckoutCartCommand:
    listing_ids: list[str]
    buyer_name: str


@dataclass
class CheckoutCartResult:
    orders: list[Order]
    total_amount: float
    item_count: int


class CheckoutCartUseCase:
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

    async def execute(self, command: CheckoutCartCommand) -> CheckoutCartResult:
        if not command.listing_ids:
            raise ValueError("Cart is empty.")

        # Deduplicate listing IDs while preserving order
        unique_ids = list(dict.fromkeys(command.listing_ids))

        # 1. Pre-validate all listings
        listings = []
        for lid in unique_ids:
            listing = await self.listing_repo.get_by_id(lid)
            if not listing:
                raise ListingNotFoundError(lid)
            if listing.status == ListingStatus.SOLD:
                raise ListingAlreadySoldError(lid)
            if command.buyer_name.strip().lower() == listing.seller_name.strip().lower():
                raise SelfPurchaseNotAllowedError(listing.seller_name)
            listings.append(listing)

        # 2. Concurrency-safe atomic transition for all listings
        orders: list[Order] = []
        total_amount = 0.0

        for listing in listings:
            updated = await self.listing_repo.mark_as_sold(listing.id, command.buyer_name)
            if not updated:
                raise ListingAlreadySoldError(listing.id)

            cond_str = (
                updated.condition.value
                if hasattr(updated.condition, "value")
                else str(updated.condition)
            )
            order = Order.create(
                listing_id=updated.id,
                card_id=updated.card_id,
                card_name=updated.card_name,
                price=updated.price,
                seller_name=updated.seller_name,
                buyer_name=command.buyer_name,
                condition=cond_str,
                image_url=updated.image_url,
            )
            await self.order_repo.save(order)
            await self.search_repo.index_listing(updated)

            orders.append(order)
            total_amount += updated.price

        total_amount = round(total_amount, 2)

        # 3. Redis live telemetry & cache invalidation
        await self.cache_repo.increment_counter("stats:active_listings", -len(orders))
        await self.cache_repo.increment_counter("stats:total_sales_count", len(orders))
        await self.cache_repo.increment_float_counter("stats:total_sales_volume", total_amount)
        for order in orders:
            await self.cache_repo.push_recent_item("orders:recent_ids", order.id, max_items=25)
        await self.cache_repo.delete("cache:marketplace:recent")
        await self.cache_repo.delete_pattern("cache:listings:*")

        return CheckoutCartResult(
            orders=orders,
            total_amount=total_amount,
            item_count=len(orders),
        )
