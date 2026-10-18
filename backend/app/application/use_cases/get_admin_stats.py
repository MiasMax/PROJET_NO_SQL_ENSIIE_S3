"""
Admin and Supervision Use Case.
Aggregates real-time health metrics across MongoDB, Elasticsearch, and Redis,
and provides authenticated CLI verification commands for evaluation.
"""

from typing import Any

from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.listing_status import ListingStatus


class GetAdminStatsUseCase:
    def __init__(
        self,
        listing_repo: ListingRepository,
        order_repo: OrderRepository,
        card_repo: CardRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.listing_repo = listing_repo
        self.order_repo = order_repo
        self.card_repo = card_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self) -> dict[str, Any]:
        # 1. MongoDB metrics
        mongo_cards_count = await self.card_repo.count()
        mongo_total_listings = await self.listing_repo.count_by_status(None)
        mongo_active_listings = await self.listing_repo.count_by_status(ListingStatus.ACTIVE)
        mongo_sold_listings = await self.listing_repo.count_by_status(ListingStatus.SOLD)
        mongo_orders_count = await self.order_repo.count()

        # 2. Elasticsearch metrics
        try:
            elastic_indexed_docs = await self.search_repo.get_indexed_count()
            elastic_status = "HEALTHY"
        except Exception:
            elastic_indexed_docs = 0
            elastic_status = "UNAVAILABLE"

        # 3. Redis metrics
        try:
            redis_active_counter = await self.cache_repo.get_counter("stats:active_listings")
            redis_sales_count = await self.cache_repo.get_counter("stats:total_sales_count")
            redis_sales_volume = await self.cache_repo.get_counter("stats:total_sales_volume")
            recent_listing_ids = await self.cache_repo.get_recent_items("listings:recent_ids", 5)
            redis_stats = await self.cache_repo.get_stats()
            redis_status = "HEALTHY"
        except Exception:
            redis_active_counter = 0
            redis_sales_count = 0
            redis_sales_volume = 0.0
            recent_listing_ids = []
            redis_stats = {}
            redis_status = "UNAVAILABLE"

        # 4. Multi-system reconciliation check
        consistency_check = {
            "is_in_sync": (mongo_total_listings == elastic_indexed_docs),
            "mongo_total_listings": mongo_total_listings,
            "elastic_indexed_docs": elastic_indexed_docs,
        }

        # 5. Terminal commands for live inspection.
        # SECURITY: never embed the real secrets in the API response (it would leak
        # them to any browser via the network tab). We emit shell variable references
        # instead — the operator's shell substitutes them from their own environment.
        from app.config import settings

        mongo_auth_flag = (
            "-u $MONGO_ROOT_USER -p $MONGO_ROOT_PASSWORD --authenticationDatabase admin "
            if settings.MONGO_ROOT_USER
            else ""
        )
        redis_auth_flag = "-a $REDIS_PASSWORD " if settings.REDIS_PASSWORD else ""

        terminal_commands = [
            {
                "system": "MongoDB",
                "command": f"docker exec -it pokevinted-mongodb mongosh {mongo_auth_flag}{settings.MONGO_DB} --eval 'db.listings.find({{}}, {{card_name:1, price:1, status:1}}).pretty()'",
                "description": "Inspect persisted listings in document store (authenticated)",
            },
            {
                "system": "Elasticsearch",
                "command": "curl -s http://localhost:9200/pokevinted_listings/_search | jq '.hits.hits[]._source | {card_name, price, status}'",
                "description": "Inspect full-text search index (loopback port)",
            },
            {
                "system": "Redis",
                "command": f"docker exec -it pokevinted-redis redis-cli {redis_auth_flag}MGET stats:active_listings stats:total_sales_count stats:total_sales_volume",
                "description": "Read atomic real-time counters (authenticated)",
            },
        ]

        return {
            "summary": {
                "total_sales_volume_eur": round(float(redis_sales_volume), 2),
                "total_orders_completed": int(mongo_orders_count),
                "active_listings_count": int(mongo_active_listings),
                "total_catalog_cards": int(mongo_cards_count),
            },
            "systems": {
                "mongodb": {
                    "status": "HEALTHY",
                    "cards_count": mongo_cards_count,
                    "listings_total": mongo_total_listings,
                    "listings_active": mongo_active_listings,
                    "listings_sold": mongo_sold_listings,
                    "orders_count": mongo_orders_count,
                },
                "elasticsearch": {
                    "status": elastic_status,
                    "indexed_listings": elastic_indexed_docs,
                    "index_name": "pokevinted_listings",
                },
                "redis": {
                    "status": redis_status,
                    "active_listings_counter": int(redis_active_counter),
                    "sales_count_counter": int(redis_sales_count),
                    "sales_volume_counter": round(float(redis_sales_volume), 2),
                    "recent_listing_ids": recent_listing_ids,
                    "used_memory_human": redis_stats.get("used_memory_human", "N/A"),
                },
            },
            "consistency_check": consistency_check,
            "terminal_commands": terminal_commands,
        }
