"""
Search Listings Use Case.
Queries Elasticsearch for faceted filters and full-text search,
falling back to MongoDB when Elasticsearch is unavailable.
"""

import logging
from dataclasses import dataclass
from typing import Any

from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus

logger = logging.getLogger(__name__)


@dataclass
class SearchListingsQuery:
    query: str | None = None
    set_name: str | None = None
    condition: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    status: str | None = "ACTIVE"
    sort_by: str = "created_at"
    sort_order: str = "desc"
    limit: int = 20
    skip: int = 0


class SearchListingsUseCase:
    def __init__(
        self,
        search_repo: SearchRepository,
        listing_repo: ListingRepository,
        cache_repo: CacheRepository,
    ):
        self.search_repo = search_repo
        self.listing_repo = listing_repo
        self.cache_repo = cache_repo

    async def execute(self, query_params: SearchListingsQuery) -> dict[str, Any]:
        cond_enum = None
        if query_params.condition:
            try:
                cond_enum = CardCondition(query_params.condition.upper())
            except ValueError:
                pass

        status_enum = ListingStatus.ACTIVE
        if query_params.status:
            try:
                status_enum = ListingStatus(query_params.status.upper())
            except ValueError:
                pass

        # 1. Primary path: Elasticsearch full-text query
        try:
            results = await self.search_repo.search_listings(
                query=query_params.query,
                set_name=query_params.set_name,
                condition=cond_enum,
                min_price=query_params.min_price,
                max_price=query_params.max_price,
                status=status_enum,
                sort_by=query_params.sort_by,
                sort_order=query_params.sort_order,
                limit=query_params.limit,
                skip=query_params.skip,
            )
            return results
        except Exception as exc:
            logger.warning("Elasticsearch unavailable, falling back to MongoDB: %s", exc)

        # 2. Resilient fallback: MongoDB query
        listings = await self.listing_repo.list_listings(
            status=status_enum,
            limit=query_params.limit,
            skip=query_params.skip,
        )
        total = await self.listing_repo.count_by_status(status=status_enum)

        return {
            "total": total,
            "items": listings,
            "source": "mongodb_fallback",
        }
