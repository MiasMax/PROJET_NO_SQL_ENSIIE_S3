"""
Implémentation Redis de CacheRepository.
Gère les compteurs atomiques, listes récentes (LPUSH/LTRIM) et popularité (ZINCRBY).
"""
import json
from typing import List, Optional, Dict, Any
import redis.asyncio as aioredis
from app.domain.repositories.cache_repository import CacheRepository


class RedisCacheRepository(CacheRepository):
    def __init__(self, client: aioredis.Redis):
        self.client = client

    async def increment_counter(self, key: str, amount: int = 1) -> int:
        return await self.client.incrby(key, amount)

    async def increment_float_counter(self, key: str, amount: float) -> float:
        return float(await self.client.incrbyfloat(key, amount))

    async def get_counter(self, key: str) -> float:
        val = await self.client.get(key)
        if val is None:
            return 0.0
        try:
            return float(val)
        except ValueError:
            return 0.0

    async def push_recent_item(self, list_key: str, item_id: str, max_items: int = 20) -> None:
        async with self.client.pipeline(transaction=True) as pipe:
            pipe.lpush(list_key, item_id)
            pipe.ltrim(list_key, 0, max_items - 1)
            await pipe.execute()

    async def get_recent_items(self, list_key: str, limit: int = 10) -> List[str]:
        return await self.client.lrange(list_key, 0, limit - 1)

    async def track_card_view(self, card_id: str) -> None:
        await self.client.zincrby("cards:trending_views", 1, card_id)

    async def get_trending_card_ids(self, limit: int = 5) -> List[Dict[str, Any]]:
        results = await self.client.zrevrange("cards:trending_views", 0, limit - 1, withscores=True)
        return [{"card_id": card_id, "views": int(score)} for card_id, score in results]

    async def get_json(self, key: str) -> Optional[Any]:
        val = await self.client.get(key)
        if not val:
            return None
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return None

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        await self.client.set(key, json.dumps(value), ex=ttl_seconds)

    async def delete(self, key: str) -> None:
        await self.client.delete(key)

    async def get_stats(self) -> Dict[str, Any]:
        info = await self.client.info()
        return {
            "used_memory_human": info.get("used_memory_human", "N/A"),
            "connected_clients": info.get("connected_clients", 0),
            "uptime_in_seconds": info.get("uptime_in_seconds", 0),
            "total_commands_processed": info.get("total_commands_processed", 0),
        }
