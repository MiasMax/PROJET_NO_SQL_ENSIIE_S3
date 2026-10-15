"""
Client et gestionnaire de connexion Redis (redis.asyncio).
"""

import logging

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class RedisClientManager:
    client: aioredis.Redis | None = None

    @classmethod
    def connect(cls, url: str = "redis://localhost:6379/0") -> aioredis.Redis:
        if cls.client is None:
            logger.info("Connexion à Redis sur : %s", url)
            cls.client = aioredis.from_url(url, encoding="utf-8", decode_responses=True)
        return cls.client

    @classmethod
    async def close(cls) -> None:
        if cls.client:
            await cls.client.aclose()
            cls.client = None
            logger.info("Connexion Redis fermée.")
