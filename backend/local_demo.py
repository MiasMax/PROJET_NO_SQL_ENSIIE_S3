"""
Local development server for PokéVinted with populated in-memory datastores.
Enables end-to-end browser testing and interactive demonstration without external Docker containers.
"""

from typing import Any

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.entities.order import Order
from app.domain.exceptions import (
    CardNotFoundError,
    InvalidConditionError,
    InvalidPriceError,
    ListingAlreadySoldError,
    ListingNotFoundError,
)
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus
from app.infrastructure.seed.cards_dataset import (
    get_default_catalog_cards,
    get_initial_marketplace_listings,
)
from app.interfaces.api.admin import router as admin_router
from app.interfaces.api.cards import router as cards_router
from app.interfaces.api.listings import router as listings_router
from app.interfaces.api.orders import router as orders_router
from app.interfaces.api.users import router as users_router
from app.interfaces.dependencies import (
    get_cache_repository,
    get_card_repository,
    get_listing_repository,
    get_order_repository,
    get_search_repository,
)


class InMemoryCardRepository(CardRepository):
    def __init__(self, cards: list[Card]):
        self.cards = {card.id: card for card in cards}

    async def get_by_id(self, card_id: str) -> Card | None:
        return self.cards.get(card_id)

    async def list_cards(self, limit: int = 50, skip: int = 0, search: str | None = None) -> list[Card]:
        items = list(self.cards.values())
        if search:
            query = search.lower()
            items = [card for card in items if query in card.name.lower() or query in card.set_name.lower()]
        return items[skip : skip + limit]

    async def save(self, card: Card) -> None:
        self.cards[card.id] = card

    async def bulk_save(self, cards: list[Card]) -> int:
        for card in cards:
            self.cards[card.id] = card
        return len(cards)

    async def count(self) -> int:
        return len(self.cards)


class InMemoryListingRepository(ListingRepository):
    def __init__(self, listings: list[Listing]):
        self.listings = {item.id: item for item in listings}

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


class InMemorySearchRepository(SearchRepository):
    def __init__(self, listings: list[Listing]):
        self.indexed = {item.id: item for item in listings}

    async def index_listing(self, listing: Listing) -> None:
        self.indexed[listing.id] = listing

    async def delete_listing(self, listing_id: str) -> None:
        self.indexed.pop(listing_id, None)

    async def search_listings(
        self,
        query: str | None = None,
        set_name: str | None = None,
        condition: CardCondition | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        status: ListingStatus | None = ListingStatus.ACTIVE,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 50,
        skip: int = 0,
    ) -> dict[str, Any]:
        results = list(self.indexed.values())

        if status:
            results = [item for item in results if item.status == status]
        if set_name:
            results = [item for item in results if item.set_name.lower() == set_name.lower()]
        if condition:
            results = [item for item in results if item.condition == condition]
        if min_price is not None:
            results = [item for item in results if item.price >= min_price]
        if max_price is not None:
            results = [item for item in results if item.price <= max_price]
        if query:
            clean_q = query.strip().lower()
            results = [
                item
                for item in results
                if clean_q in item.card_name.lower()
                or clean_q in item.set_name.lower()
                or clean_q in item.seller_name.lower()
                or clean_q in item.description.lower()
            ]

        reverse = sort_order.lower() == "desc"
        if sort_by == "price":
            results.sort(key=lambda x: x.price, reverse=reverse)
        else:
            results.sort(key=lambda x: x.created_at, reverse=reverse)

        total = len(results)
        paginated = results[skip : skip + limit]
        return {"total": total, "items": paginated}

    async def get_indexed_count(self) -> int:
        return len(self.indexed)

    async def get_aggregations(self) -> dict[str, Any]:
        status_counts: dict[str, int] = {}
        cond_counts: dict[str, int] = {}
        set_counts: dict[str, list[float]] = {}

        for item in self.indexed.values():
            stat = item.status.value if hasattr(item.status, "value") else str(item.status)
            cond = item.condition.value if hasattr(item.condition, "value") else str(item.condition)
            status_counts[stat] = status_counts.get(stat, 0) + 1
            cond_counts[cond] = cond_counts.get(cond, 0) + 1
            if item.set_name not in set_counts:
                set_counts[item.set_name] = []
            set_counts[item.set_name].append(item.price)

        return {
            "by_status": {
                "buckets": [{"key": k, "doc_count": v} for k, v in status_counts.items()]
            },
            "by_condition": {
                "buckets": [{"key": k, "doc_count": v} for k, v in cond_counts.items()]
            },
            "by_set": {
                "buckets": [
                    {
                        "key": k,
                        "doc_count": len(prices),
                        "avg_price": {"value": round(sum(prices) / len(prices), 2)},
                    }
                    for k, prices in set_counts.items()
                ]
            },
        }


class InMemoryCacheRepository(CacheRepository):
    def __init__(self, listings: list[Listing]):
        self.counters: dict[str, float] = {
            "stats:total_listings_created": float(len(listings)),
            "stats:active_listings": float(len(listings)),
            "stats:total_orders_completed": 0.0,
            "stats:total_volume_eur": 0.0,
        }
        self.lists: dict[str, list[str]] = {
            "listings:recent_ids": [item.id for item in listings[-10:]]
        }
        self.cache: dict[str, Any] = {}
        self.trending: dict[str, int] = {
            "sv3pt5-006": 42,
            "sv3pt5-199": 85,
            "sv3-223": 29,
            "sv1-245": 18,
            "sv3pt5-151": 63,
        }
        self.favorites: dict[str, set[str]] = {
            "sacha": {"sv3pt5-006", "sv3pt5-151"},
            "ondine": {"sv3pt5-003"},
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
        return {
            "used_memory_human": "1.45M",
            "connected_clients": 2,
            "total_commands_processed": 1420,
        }


class InMemoryOrderRepository(OrderRepository):
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


def create_demo_app() -> FastAPI:
    demo_app = FastAPI(
        title="PokéVinted Demo Server",
        version="1.0.0",
        description="In-memory demonstration server for browser testing",
    )

    demo_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @demo_app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    @demo_app.exception_handler(CardNotFoundError)
    async def card_not_found_handler(request: Request, exc: CardNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc), "code": "CARD_NOT_FOUND"})

    @demo_app.exception_handler(ListingNotFoundError)
    async def listing_not_found_handler(request: Request, exc: ListingNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc), "code": "LISTING_NOT_FOUND"})

    @demo_app.exception_handler(ListingAlreadySoldError)
    async def listing_already_sold_handler(request: Request, exc: ListingAlreadySoldError):
        return JSONResponse(status_code=400, content={"detail": str(exc), "code": "LISTING_ALREADY_SOLD"})

    @demo_app.exception_handler(InvalidPriceError)
    async def invalid_price_handler(request: Request, exc: InvalidPriceError):
        return JSONResponse(status_code=422, content={"detail": str(exc), "code": "INVALID_PRICE"})

    @demo_app.exception_handler(InvalidConditionError)
    async def invalid_condition_handler(request: Request, exc: InvalidConditionError):
        return JSONResponse(status_code=422, content={"detail": str(exc), "code": "INVALID_CONDITION"})

    cards = get_default_catalog_cards()
    listings = get_initial_marketplace_listings()

    card_repo = InMemoryCardRepository(cards)
    listing_repo = InMemoryListingRepository(listings)
    search_repo = InMemorySearchRepository(listings)
    cache_repo = InMemoryCacheRepository(listings)
    order_repo = InMemoryOrderRepository()

    demo_app.dependency_overrides[get_card_repository] = lambda: card_repo
    demo_app.dependency_overrides[get_listing_repository] = lambda: listing_repo
    demo_app.dependency_overrides[get_search_repository] = lambda: search_repo
    demo_app.dependency_overrides[get_cache_repository] = lambda: cache_repo
    demo_app.dependency_overrides[get_order_repository] = lambda: order_repo

    demo_app.include_router(cards_router)
    demo_app.include_router(listings_router)
    demo_app.include_router(orders_router)
    demo_app.include_router(admin_router)
    demo_app.include_router(users_router)

    @demo_app.get("/api/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok",
            "app": "PokéVinted Demo",
            "datastores": {
                "mongodb": "in_memory_ready",
                "elasticsearch": "in_memory_ready",
                "redis": "in_memory_ready",
            },
        }

    return demo_app


demo_app = create_demo_app()

if __name__ == "__main__":
    uvicorn.run(demo_app, host="127.0.0.1", port=8000, log_level="info")
