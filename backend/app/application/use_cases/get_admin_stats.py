"""
Use Case : Bilan Admin & Supervision NoSQL en temps réel.
Agrège les métriques des 3 moteurs de persistance (Mongo, Elastic, Redis)
et fournit les commandes exactes pour vérification en terminal par le professeur.
"""
from dataclasses import dataclass
from typing import Dict, Any, List

from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.repositories.cache_repository import CacheRepository
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

    async def execute(self) -> Dict[str, Any]:
        # --- 1. MÉTRIQUES MONGODB ---
        mongo_cards_count = await self.card_repo.count()
        mongo_total_listings = await self.listing_repo.count_by_status(None)
        mongo_active_listings = await self.listing_repo.count_by_status(ListingStatus.ACTIVE)
        mongo_sold_listings = await self.listing_repo.count_by_status(ListingStatus.SOLD)
        mongo_orders_count = await self.order_repo.count()

        # --- 2. MÉTRIQUES ELASTICSEARCH ---
        try:
            elastic_indexed_docs = await self.search_repo.get_indexed_count()
            elastic_status = "HEALTHY"
        except Exception:
            elastic_indexed_docs = 0
            elastic_status = "UNAVAILABLE"

        # --- 3. MÉTRIQUES REDIS ---
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

        # --- 4. RÉCONCILIATION & COHÉRENCE MULTI-SYSTÈMES ---
        consistency_check = {
            "is_in_sync": (mongo_total_listings == elastic_indexed_docs),
            "mongo_total_listings": mongo_total_listings,
            "elastic_indexed_docs": elastic_indexed_docs,
        }

        # --- 5. GUIDE D'INSPECTION TERMINAL (Pour la soutenance) ---
        terminal_commands = [
            {
                "system": "MongoDB",
                "command": "docker exec -it pokevinted-mongodb mongosh pokevinted --eval 'db.listings.find({}, {card_name:1, price:1, status:1}).pretty()'",
                "description": "Inspecte les annonces persistées en base documentaire"
            },
            {
                "system": "Elasticsearch",
                "command": "curl -s http://localhost:9200/pokevinted_listings/_search | jq '.hits.hits[]._source | {card_name, price, status}'",
                "description": "Vérifie l'indexation de recherche plein-texte"
            },
            {
                "system": "Redis",
                "command": "docker exec -it pokevinted-redis redis-cli MGET stats:active_listings stats:total_sales_count stats:total_sales_volume",
                "description": "Lit les compteurs atomiques temps réel"
            }
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
