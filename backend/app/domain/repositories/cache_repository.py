"""
Cache, real-time counters, and session repository interface (e.g. Redis).
"""

from abc import ABC, abstractmethod
from typing import Any


class CacheRepository(ABC):
    @abstractmethod
    async def increment_counter(self, key: str, amount: int = 1) -> int:
        """Atomically increment an integer counter."""
        pass

    @abstractmethod
    async def increment_float_counter(self, key: str, amount: float) -> float:
        """Atomically increment a floating-point counter (e.g. sales volume)."""
        pass

    @abstractmethod
    async def get_counter(self, key: str) -> float:
        """Read current counter value."""
        pass

    @abstractmethod
    async def push_recent_item(self, list_key: str, item_id: str, max_items: int = 20) -> None:
        """Push an item to a bounded FIFO list."""
        pass

    @abstractmethod
    async def get_recent_items(self, list_key: str, limit: int = 10) -> list[str]:
        """Fetch latest items from a bounded list."""
        pass

    @abstractmethod
    async def track_card_view(self, card_id: str) -> None:
        """Increment popularity of a card in a Sorted Set (trending)."""
        pass

    @abstractmethod
    async def get_trending_card_ids(self, limit: int = 5) -> list[dict[str, Any]]:
        """Fetch most viewed card IDs with their view count."""
        pass

    @abstractmethod
    async def track_listing_view(self, listing_id: str) -> None:
        """Increment popularity of a marketplace listing in a Sorted Set (trending)."""
        pass

    @abstractmethod
    async def get_trending_listing_ids(self, limit: int = 5) -> list[dict[str, Any]]:
        """Fetch most viewed listing IDs with their view count."""
        pass

    @abstractmethod
    async def remove_trending_listing(self, listing_id: str) -> None:
        """Remove a listing from the trending Sorted Set (e.g. once sold or deleted)."""
        pass

    @abstractmethod
    async def seed_trending_listings(self, scores: dict[str, int]) -> None:
        """Initialize trending Sorted Set with listing_id -> view count scores."""
        pass

    @abstractmethod
    async def add_favorite(self, user_id: str, card_id: str) -> None:
        """Add a card to user favorites Set (Redis SADD)."""
        pass

    @abstractmethod
    async def remove_favorite(self, user_id: str, card_id: str) -> None:
        """Remove a card from user favorites Set (Redis SREM)."""
        pass

    @abstractmethod
    async def get_favorites(self, user_id: str) -> list[str]:
        """Retrieve user favorite card IDs (Redis SMEMBERS)."""
        pass

    @abstractmethod
    async def set_user_session(self, token: str, user_data: dict[str, Any], ttl_seconds: int = 86400) -> None:
        """Store user session with expiration TTL."""
        pass

    @abstractmethod
    async def get_user_session(self, token: str) -> dict[str, Any] | None:
        """Retrieve active user session by token."""
        pass

    @abstractmethod
    async def delete_user_session(self, token: str) -> None:
        """Remove active user session by token."""
        pass

    @abstractmethod
    async def get_json(self, key: str) -> Any | None:
        """Retrieve a cached JSON value."""
        pass

    @abstractmethod
    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Cache a JSON value with expiration TTL."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Invalidate a cache key."""
        pass

    @abstractmethod
    async def delete_pattern(self, pattern: str) -> None:
        """Invalidate all keys matching glob pattern (e.g. cache:listings:*)."""
        pass

    @abstractmethod
    async def get_stats(self) -> dict[str, Any]:
        """Fetch server runtime stats (memory, connections, uptime)."""
        pass
