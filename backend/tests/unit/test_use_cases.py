"""
Unit tests for domain use cases.
Validates multi-store persistence orchestration across MongoDB, Elasticsearch, and Redis.
"""

from typing import Any

import pytest

from app.application.use_cases.create_listing import CreateListingCommand, CreateListingUseCase
from app.application.use_cases.get_admin_stats import GetAdminStatsUseCase
from app.application.use_cases.purchase_listing import PurchaseListingCommand, PurchaseListingUseCase
from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.entities.order import Order
from app.domain.exceptions import CardNotFoundError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.listing_status import ListingStatus

# --- In-memory repository mocks for fast unit test execution ---


class MockCardRepository(CardRepository):
    def __init__(self, cards: list[Card] = None):
        self.cards = {c.id: c for c in (cards or [])}

    async def get_by_id(self, card_id: str) -> Card | None:
        return self.cards.get(card_id)

    async def list_cards(self, limit: int = 50, skip: int = 0, search: str | None = None) -> list[Card]:
        return list(self.cards.values())[skip : skip + limit]

    async def save(self, card: Card) -> None:
        self.cards[card.id] = card

    async def bulk_save(self, cards: list[Card]) -> int:
        for c in cards:
            self.cards[c.id] = c
        return len(cards)

    async def count(self) -> int:
        return len(self.cards)


class MockListingRepository(ListingRepository):
    def __init__(self):
        self.listings = {}

    async def save(self, listing: Listing) -> None:
        self.listings[listing.id] = listing

    async def get_by_id(self, listing_id: str) -> Listing | None:
        return self.listings.get(listing_id)

    async def list_listings(
        self, status: ListingStatus | None = None, limit: int = 50, skip: int = 0
    ) -> list[Listing]:
        items = list(self.listings.values())
        if status:
            items = [item for item in items if item.status == status]
        return items[skip : skip + limit]

    async def count_by_status(self, status: ListingStatus | None = None) -> int:
        if status:
            return sum(1 for item in self.listings.values() if item.status == status)
        return len(self.listings)

    async def get_recent(self, limit: int = 10) -> list[Listing]:
        return list(self.listings.values())[-limit:]


class MockSearchRepository(SearchRepository):
    def __init__(self):
        self.indexed = {}

    async def index_listing(self, listing: Listing) -> None:
        self.indexed[listing.id] = listing

    async def delete_listing(self, listing_id: str) -> None:
        self.indexed.pop(listing_id, None)

    async def search_listings(self, **kwargs) -> dict[str, Any]:
        return {"total": len(self.indexed), "items": list(self.indexed.values())}

    async def get_indexed_count(self) -> int:
        return len(self.indexed)

    async def get_aggregations(self) -> dict[str, Any]:
        return {
            "by_status": {"buckets": [{"key": "ACTIVE", "doc_count": len(self.indexed)}]},
            "by_condition": {"buckets": [{"key": "NEAR_MINT", "doc_count": len(self.indexed)}]},
            "by_set": {
                "buckets": [{"key": "151", "doc_count": len(self.indexed), "avg_price": {"value": 45.0}}]
            },
        }


class MockCacheRepository(CacheRepository):
    def __init__(self):
        self.counters = {}
        self.lists = {}
        self.cache = {}
        self.trending = {}
        self.favorites = {}
        self.sessions = {}

    async def increment_counter(self, key: str, amount: int = 1) -> int:
        self.counters[key] = self.counters.get(key, 0) + amount
        return self.counters[key]

    async def increment_float_counter(self, key: str, amount: float) -> float:
        self.counters[key] = round(self.counters.get(key, 0.0) + amount, 2)
        return self.counters[key]

    async def get_counter(self, key: str) -> float:
        return self.counters.get(key, 0.0)

    async def push_recent_item(self, list_key: str, item_id: str, max_items: int = 20) -> None:
        if list_key not in self.lists:
            self.lists[list_key] = []
        self.lists[list_key].insert(0, item_id)
        self.lists[list_key] = self.lists[list_key][:max_items]

    async def get_recent_items(self, list_key: str, limit: int = 10) -> list[str]:
        return self.lists.get(list_key, [])[:limit]

    async def track_card_view(self, card_id: str) -> None:
        self.trending[card_id] = self.trending.get(card_id, 0) + 1

    async def get_trending_card_ids(self, limit: int = 5) -> list[dict[str, Any]]:
        sorted_items = sorted(self.trending.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [{"card_id": k, "views": v} for k, v in sorted_items]

    async def add_favorite(self, user_id: str, card_id: str) -> None:
        if user_id not in self.favorites:
            self.favorites[user_id] = set()
        self.favorites[user_id].add(card_id)

    async def remove_favorite(self, user_id: str, card_id: str) -> None:
        if user_id in self.favorites:
            self.favorites[user_id].discard(card_id)

    async def get_favorites(self, user_id: str) -> list[str]:
        return list(self.favorites.get(user_id, set()))

    async def set_user_session(self, token: str, user_data: dict[str, Any], ttl_seconds: int = 86400) -> None:
        self.sessions[token] = user_data

    async def get_user_session(self, token: str) -> dict[str, Any] | None:
        return self.sessions.get(token)

    async def get_json(self, key: str) -> Any | None:
        return self.cache.get(key)

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        self.cache[key] = value

    async def delete(self, key: str) -> None:
        self.cache.pop(key, None)

    async def get_stats(self) -> dict[str, Any]:
        return {"used_memory_human": "1.2M", "connected_clients": 1}


class MockOrderRepository(OrderRepository):
    def __init__(self):
        self.orders = {}

    async def save(self, order: Order) -> None:
        self.orders[order.id] = order

    async def get_by_id(self, order_id: str) -> Order | None:
        return self.orders.get(order_id)

    async def list_orders(self, limit: int = 50, skip: int = 0) -> list[Order]:
        return list(self.orders.values())[skip : skip + limit]

    async def count(self) -> int:
        return len(self.orders)


# --- Async test fixtures and cases ---


@pytest.fixture
def fake_card():
    return Card(
        id="sv3pt5-006",
        name="Dracaufeu ex",
        supertype="Pokémon",
        subtypes=["Stage 2", "ex"],
        hp="330",
        types=["Fire"],
        set_id="sv3pt5",
        set_name="151",
        set_series="Scarlet & Violet",
        number="006",
        rarity="Double Rare",
        image_small="https://images.pokemontcg.io/sv3pt5/6.png",
        image_large="https://images.pokemontcg.io/sv3pt5/6_hires.png",
        market_price=45.50,
    )


@pytest.mark.asyncio
async def test_create_listing_orchestrates_multi_system_persistence(fake_card):
    # Setup
    card_repo = MockCardRepository([fake_card])
    listing_repo = MockListingRepository()
    search_repo = MockSearchRepository()
    cache_repo = MockCacheRepository()

    use_case = CreateListingUseCase(card_repo, listing_repo, search_repo, cache_repo)

    command = CreateListingCommand(
        card_id="sv3pt5-006",
        price=55.0,
        condition="NEAR_MINT",
        seller_name="Sacha",
        description="Carte neuve sortie de booster",
    )

    # Execution
    created_listing = await use_case.execute(command)

    # 1. MongoDB verification (persisted listing entity)
    assert created_listing.id in listing_repo.listings
    saved_in_mongo = listing_repo.listings[created_listing.id]
    assert saved_in_mongo.price == 55.0
    assert saved_in_mongo.card_name == "Dracaufeu ex"

    # 2. Elasticsearch verification (indexed searchable document)
    assert created_listing.id in search_repo.indexed
    indexed_in_elastic = search_repo.indexed[created_listing.id]
    assert indexed_in_elastic.seller_name == "Sacha"

    # 3. Redis verification (atomic counters and recent feed)
    assert cache_repo.counters["stats:active_listings"] == 1
    assert cache_repo.counters["stats:total_listings_created"] == 1
    assert created_listing.id in cache_repo.lists["listings:recent_ids"]


@pytest.mark.asyncio
async def test_create_listing_fails_if_card_not_in_catalog():
    card_repo = MockCardRepository([])
    listing_repo = MockListingRepository()
    search_repo = MockSearchRepository()
    cache_repo = MockCacheRepository()

    use_case = CreateListingUseCase(card_repo, listing_repo, search_repo, cache_repo)
    command = CreateListingCommand(
        card_id="carte-inconnue",
        price=10.0,
        condition="MINT",
        seller_name="Pierre",
    )

    with pytest.raises(CardNotFoundError):
        await use_case.execute(command)


@pytest.mark.asyncio
async def test_purchase_listing_updates_all_stores(fake_card):
    # Initial setup with 1 reference card and 1 active listing
    card_repo = MockCardRepository([fake_card])
    listing_repo = MockListingRepository()
    search_repo = MockSearchRepository()
    cache_repo = MockCacheRepository()
    order_repo = MockOrderRepository()

    # Initial listing creation
    create_uc = CreateListingUseCase(card_repo, listing_repo, search_repo, cache_repo)
    listing = await create_uc.execute(
        CreateListingCommand(
            card_id="sv3pt5-006",
            price=60.0,
            condition="MINT",
            seller_name="Sacha",
        )
    )

    # Purchase execution
    purchase_uc = PurchaseListingUseCase(listing_repo, order_repo, search_repo, cache_repo)
    order = await purchase_uc.execute(PurchaseListingCommand(listing_id=listing.id, buyer_name="Regis"))

    # 1. MongoDB verification (marked as SOLD)
    updated_listing = listing_repo.listings[listing.id]
    assert updated_listing.status == ListingStatus.SOLD
    assert updated_listing.buyer_name == "Regis"
    assert order.id in order_repo.orders

    # 2. Elasticsearch verification (updated index document)
    assert search_repo.indexed[listing.id].status == ListingStatus.SOLD

    # 3. Redis verification (decremented active count and incremented volume)
    assert cache_repo.counters["stats:active_listings"] == 0
    assert cache_repo.counters["stats:total_sales_count"] == 1
    assert cache_repo.counters["stats:total_sales_volume"] == 60.0
    assert order.id in cache_repo.lists["orders:recent_ids"]


@pytest.mark.asyncio
async def test_admin_stats_shows_multi_nosql_metrics(fake_card):
    card_repo = MockCardRepository([fake_card])
    listing_repo = MockListingRepository()
    search_repo = MockSearchRepository()
    cache_repo = MockCacheRepository()
    order_repo = MockOrderRepository()

    admin_uc = GetAdminStatsUseCase(listing_repo, order_repo, card_repo, search_repo, cache_repo)
    stats = await admin_uc.execute()

    assert stats["summary"]["total_catalog_cards"] == 1
    assert stats["systems"]["mongodb"]["status"] == "HEALTHY"
    assert stats["systems"]["elasticsearch"]["status"] == "HEALTHY"
    assert stats["systems"]["redis"]["status"] == "HEALTHY"
    assert len(stats["terminal_commands"]) == 3
