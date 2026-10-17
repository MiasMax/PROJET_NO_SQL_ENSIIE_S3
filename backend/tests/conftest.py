"""
Pytest root configuration and Clean DDD shared test fixtures.
Centralizes domain entity doubles and in-memory repository adapters
for fast, isolated TDD execution adhering strictly to Domain-Driven Design.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.entities.order import Order
from app.domain.entities.user import User
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.repositories.user_repository import UserRepository
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus
from app.infrastructure.seed.cards_dataset import get_default_catalog_cards
from app.interfaces.dependencies import (
    get_cache_repository,
    get_card_repository,
    get_listing_repository,
    get_order_repository,
    get_search_repository,
    get_user_repository,
)
from app.main import app

# ---------------------------------------------------------------------------
# DDD In-Memory Mock Repositories
# ---------------------------------------------------------------------------


class MockCardRepository(CardRepository):
    """In-memory CardRepository adhering strictly to domain interface."""

    def __init__(self, cards: list[Card] | None = None):
        self.cards = {c.id: c for c in (cards or [])}

    async def get_by_id(self, card_id: str) -> Card | None:
        if card_id in self.cards:
            return self.cards[card_id]
        # ID alias resolution for legacy and modern notation
        if "sv3pt5-" in card_id:
            alt = card_id.replace("sv3pt5-", "sv03.5-")
            if alt in self.cards:
                return self.cards[alt]
        elif "sv03.5-" in card_id:
            alt = card_id.replace("sv03.5-", "sv3pt5-")
            if alt in self.cards:
                return self.cards[alt]
        return None

    async def list_cards(self, limit: int = 50, skip: int = 0, search: str | None = None) -> list[Card]:
        cards = list(self.cards.values())
        if search and search.strip():
            cards = [c for c in cards if search.lower() in c.name.lower()]
        return cards[skip : skip + limit]

    async def save(self, card: Card) -> None:
        self.cards[card.id] = card

    async def bulk_save(self, cards: list[Card]) -> int:
        for c in cards:
            self.cards[c.id] = c
        return len(cards)

    async def count(self) -> int:
        return len(self.cards)


class MockListingRepository(ListingRepository):
    """In-memory ListingRepository adhering strictly to domain interface."""

    def __init__(self):
        self.listings: dict[str, Listing] = {}

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

    async def mark_as_sold(self, listing_id: str, buyer_name: str) -> Listing | None:
        item = self.listings.get(listing_id)
        if not item or item.status == ListingStatus.SOLD:
            return None
        item.mark_as_sold(buyer_name)
        return item

    async def delete(self, listing_id: str) -> bool:
        return self.listings.pop(listing_id, None) is not None


class MockSearchRepository(SearchRepository):
    """In-memory SearchRepository simulating Elasticsearch index."""

    def __init__(self):
        self.indexed: dict[str, Listing] = {}

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
    """In-memory CacheRepository simulating Redis Sorted Sets, hashes, and strings."""

    def __init__(self):
        self.counters: dict[str, float] = {}
        self.lists: dict[str, list[str]] = {}
        self.cache: dict[str, Any] = {}
        self.trending: dict[str, int] = {}
        self.favorites: dict[str, set[str]] = {}
        self.sessions: dict[str, dict[str, Any]] = {}

    async def increment_counter(self, key: str, amount: int = 1) -> int:
        self.counters[key] = self.counters.get(key, 0.0) + amount
        return int(self.counters[key])

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

    async def delete_user_session(self, token: str) -> None:
        self.sessions.pop(token, None)

    async def get_json(self, key: str) -> Any | None:
        return self.cache.get(key)

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        self.cache[key] = value

    async def delete(self, key: str) -> None:
        self.cache.pop(key, None)

    async def delete_pattern(self, pattern: str) -> None:
        import fnmatch

        keys_to_delete = [k for k in list(self.cache.keys()) if fnmatch.fnmatch(k, pattern)]
        for k in keys_to_delete:
            self.cache.pop(k, None)

    async def get_stats(self) -> dict[str, Any]:
        return {"used_memory_human": "1.2M", "connected_clients": 1}


class MockUserRepository(UserRepository):
    """In-memory UserRepository adhering strictly to domain interface."""

    def __init__(self, users: list[User] | None = None):
        self.users = {u.id: u for u in (users or [])}

    async def save(self, user: User) -> None:
        self.users[user.id] = user

    async def get_by_id(self, user_id: str) -> User | None:
        return self.users.get(user_id)

    async def get_by_username(self, username: str) -> User | None:
        clean = username.lower().strip()
        for u in self.users.values():
            if u.username.lower() == clean:
                return u
        return None

    async def get_by_email(self, email: str) -> User | None:
        clean = email.lower().strip()
        for u in self.users.values():
            if u.email.lower() == clean:
                return u
        return None

    async def list_users(self, limit: int = 50, skip: int = 0) -> list[User]:
        return list(self.users.values())[skip : skip + limit]

    async def count(self) -> int:
        return len(self.users)


class MockOrderRepository(OrderRepository):
    """In-memory OrderRepository adhering strictly to domain interface."""

    def __init__(self):
        self.orders: dict[str, Order] = {}

    async def save(self, order: Order) -> None:
        self.orders[order.id] = order

    async def get_by_id(self, order_id: str) -> Order | None:
        return self.orders.get(order_id)

    async def list_orders(self, limit: int = 50, skip: int = 0) -> list[Order]:
        return list(self.orders.values())[skip : skip + limit]

    async def count(self) -> int:
        return len(self.orders)


# ---------------------------------------------------------------------------
# Pytest Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_card() -> Card:
    """Standard Charizard ex domain entity."""
    return Card(
        id="sv3pt5-006",
        name="Dracaufeu ex",
        supertype="Pokémon",
        subtypes=["Stage 2", "ex"],
        hp="330",
        types=["Fire"],
        set_id="sv3pt5",
        set_name="151",
        set_series="Écarlate et Violet",
        number="006",
        rarity="Double Rare",
        image_small="https://assets.tcgdex.net/fr/sv/sv03.5/006/low.webp",
        image_large="https://assets.tcgdex.net/fr/sv/sv03.5/006/high.webp",
        market_price=45.50,
    )


@pytest.fixture
def fake_listing(fake_card: Card) -> Listing:
    """Standard active Listing domain entity."""
    return Listing(
        id="listing-test-001",
        card_id=fake_card.id,
        card_name=fake_card.name,
        set_name=fake_card.set_name,
        rarity=fake_card.rarity,
        image_url=fake_card.image_large,
        price=55.0,
        condition=CardCondition.NEAR_MINT,
        seller_name="Sacha_Pallet",
        description="Parfait état, protégé sous sleeve",
        status=ListingStatus.ACTIVE,
    )


@pytest.fixture
def fake_user() -> User:
    """Standard authenticated User domain entity."""
    return User(
        id="user-sacha-001",
        username="sacha",
        email="sacha@bourg-palette.fr",
        hashed_password="hashed_secure_password",
        balance=250.0,
        is_admin=False,
    )


@pytest.fixture
def test_env():
    """
    FastAPI TestClient fixture with isolated in-memory DDD repositories.
    Guarantees hermetic test execution with dependency injection overrides.
    """
    cards = get_default_catalog_cards()
    card_repo = MockCardRepository(cards)
    listing_repo = MockListingRepository()
    search_repo = MockSearchRepository()
    cache_repo = MockCacheRepository()
    order_repo = MockOrderRepository()
    user_repo = MockUserRepository()

    app.dependency_overrides[get_card_repository] = lambda: card_repo
    app.dependency_overrides[get_listing_repository] = lambda: listing_repo
    app.dependency_overrides[get_search_repository] = lambda: search_repo
    app.dependency_overrides[get_cache_repository] = lambda: cache_repo
    app.dependency_overrides[get_order_repository] = lambda: order_repo
    app.dependency_overrides[get_user_repository] = lambda: user_repo

    client = TestClient(app)
    yield {
        "client": client,
        "card_repo": card_repo,
        "listing_repo": listing_repo,
        "search_repo": search_repo,
        "cache_repo": cache_repo,
        "order_repo": order_repo,
        "user_repo": user_repo,
    }

    app.dependency_overrides.clear()
