"""
Redis async client manager (redis.asyncio).
"""

import logging
import re

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


def _mask_redis_url(url: str) -> str:
    """Mask password credentials in Redis connection logs."""
    return re.sub(r"://:([^@]+)@", r"://:******@", url)


class RedisClientManager:
    client: aioredis.Redis | None = None

    @classmethod
    def connect(cls, url: str = "redis://localhost:6379/0") -> aioredis.Redis:
        if cls.client is None:
            logger.info("Connecting to Redis at: %s", _mask_redis_url(url))
            cls.client = aioredis.from_url(url, encoding="utf-8", decode_responses=True)
        return cls.client

    @classmethod
    async def close(cls) -> None:
        if cls.client:
            await cls.client.aclose()
            cls.client = None
            logger.info("Redis connection closed.")
