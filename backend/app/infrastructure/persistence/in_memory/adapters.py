"""
In-memory repository adapters.
Enables full standalone functionality for local demonstration, offline development,
and integration testing without requiring external Docker dependencies (MongoDB, Redis, Elasticsearch).
"""

import fnmatch
from typing import Any

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
from app.domain.value_objects.listing_status import ListingStatus


class InMemoryCardRepository(CardRepository):
    def __init__(self, cards: list[Card]):
        self.cards = {c.id: c for c in cards}

    async def get_by_id(self, card_id: str) -> Card | None:
        if card_id in self.cards:
            return self.cards[card_id]
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


class InMemoryListingRepository(ListingRepository):
    def __init__(self, listings: list[Listing] | None = None):
        self.listings: dict[str, Listing] = {lst.id: lst for lst in (listings or [])}

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


class InMemorySearchRepository(SearchRepository):
    def __init__(self, listings: list[Listing] | None = None):
        self.indexed: dict[str, Listing] = {lst.id: lst for lst in (listings or [])}

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


class InMemoryCacheRepository(CacheRepository):
    def __init__(self, listings: list[Listing] | None = None):
        lsts = listings or []
        self.counters: dict[str, float] = {
            "stats:total_listings_created": float(len(lsts)),
            "stats:active_listings": float(len(lsts)),
            "stats:total_orders_completed": 0.0,
            "stats:total_volume_eur": 0.0,
        }
        self.lists: dict[str, list[str]] = {
            "listings:recent_ids": [item.id for item in lsts[-10:]]
        }
        self.cache: dict[str, Any] = {}
        self.trending: dict[str, int] = {
            "sv3pt5-006": 42,
            "sv3pt5-199": 85,
            "sv3-223": 29,
            "sv1-245": 18,
            "sv3pt5-151": 63,
        }
        self.listing_trending: dict[str, int] = {}
        self.favorites: dict[str, set[str]] = {
            "sacha": {"sv3pt5-151"},
            "ondine": {"sv3pt5-025"},
        }
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

    async def track_listing_view(self, listing_id: str) -> None:
        self.listing_trending[listing_id] = self.listing_trending.get(listing_id, 0) + 1

    async def get_trending_listing_ids(self, limit: int = 5) -> list[dict[str, Any]]:
        sorted_items = sorted(self.listing_trending.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [{"listing_id": k, "views": v} for k, v in sorted_items]

    async def remove_trending_listing(self, listing_id: str) -> None:
        self.listing_trending.pop(listing_id, None)

    async def seed_trending_listings(self, scores: dict[str, int]) -> None:
        self.listing_trending.update(scores)

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
        keys_to_del = [k for k in self.cache.keys() if fnmatch.fnmatch(k, pattern)]
        for k in keys_to_del:
            self.cache.pop(k, None)

    async def get_stats(self) -> dict[str, Any]:
        return {
            "used_memory_human": "1.45M",
            "connected_clients": 2,
            "uptime_in_seconds": 3600,
            "total_commands_processed": 1420,
        }


class InMemoryOrderRepository(OrderRepository):
    def __init__(self, orders: list[Order] | None = None):
        self.orders: dict[str, Order] = {o.id: o for o in (orders or [])}

    async def save(self, order: Order) -> None:
        self.orders[order.id] = order

    async def get_by_id(self, order_id: str) -> Order | None:
        return self.orders.get(order_id)

    async def list_orders(self, limit: int = 50, skip: int = 0) -> list[Order]:
        return list(self.orders.values())[skip : skip + limit]

    async def count(self) -> int:
        return len(self.orders)


class InMemoryUserRepository(UserRepository):
    def __init__(self, users: list[User] | None = None):
        self.users: dict[str, User] = {u.id: u for u in (users or [])}

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
