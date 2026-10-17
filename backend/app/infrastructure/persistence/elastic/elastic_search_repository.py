"""
Elasticsearch implementation of SearchRepository.
Executes fuzzy multi-match queries, multi-criteria filters, and aggregations.
"""

from typing import Any

from elasticsearch import AsyncElasticsearch

from app.domain.entities.listing import Listing
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus
from app.infrastructure.persistence.elastic.client import LISTINGS_INDEX


class ElasticSearchRepository(SearchRepository):
    def __init__(self, client: AsyncElasticsearch):
        self.client = client
        self.index_name = LISTINGS_INDEX

    async def index_listing(self, listing: Listing) -> None:
        doc = listing.to_dict()
        # Refresh wait_for ensures instant visibility in read-after-write operations
        await self.client.index(
            index=self.index_name,
            id=listing.id,
            document=doc,
            refresh="wait_for",
        )

    async def delete_listing(self, listing_id: str) -> None:
        await self.client.delete(index=self.index_name, id=listing_id, ignore=[404], refresh="wait_for")

    async def clear(self) -> None:
        """Purge all documents in the Elasticsearch listings index."""
        try:
            await self.client.delete_by_query(
                index=self.index_name,
                body={"query": {"match_all": {}}},
                ignore=[404],
                refresh=True,
            )
        except Exception:
            pass

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
        limit: int = 20,
        skip: int = 0,
    ) -> dict[str, Any]:
        must_clauses: list[dict[str, Any]] = []
        filter_clauses: list[dict[str, Any]] = []

        # 1. Status filter
        if status:
            val = status.value if isinstance(status, ListingStatus) else status
            filter_clauses.append({"term": {"status": val}})

        # 2. Fuzzy text search across card name, set, seller, and description
        if query and query.strip():
            must_clauses.append(
                {
                    "multi_match": {
                        "query": query.strip(),
                        "fields": [
                            "card_name^3",
                            "card_name.suggest^2",
                            "set_name^2",
                            "seller_name",
                            "description",
                        ],
                        "fuzziness": "AUTO",
                    }
                }
            )

        # 3. Set name exact term filter
        if set_name and set_name.strip():
            filter_clauses.append({"term": {"set_name.keyword": set_name.strip()}})

        # 4. Condition filter
        if condition:
            cond_val = condition.value if isinstance(condition, CardCondition) else condition
            filter_clauses.append({"term": {"condition": cond_val}})

        # 5. Price range filter
        if min_price is not None or max_price is not None:
            range_clause = {}
            if min_price is not None:
                range_clause["gte"] = min_price
            if max_price is not None:
                range_clause["lte"] = max_price
            filter_clauses.append({"range": {"price": range_clause}})

        bool_query: dict[str, Any] = {}
        if must_clauses:
            bool_query["must"] = must_clauses
        else:
            bool_query["must"] = [{"match_all": {}}]

        if filter_clauses:
            bool_query["filter"] = filter_clauses

        # Sort order configuration
        sort_field = "created_at"
        if sort_by == "price":
            sort_field = "price"
        elif sort_by == "name":
            sort_field = "card_name.keyword"

        sort_clause = [{sort_field: {"order": sort_order}}]

        response = await self.client.search(
            index=self.index_name,
            query={"bool": bool_query},
            sort=sort_clause,
            from_=skip,
            size=limit,
        )

        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]

        items = [self._to_entity(h["_source"]) for h in hits]
        return {
            "total": total,
            "items": items,
            "source": "elasticsearch",
        }

    async def get_indexed_count(self) -> int:
        res = await self.client.count(index=self.index_name)
        return res["count"]

    async def get_aggregations(self) -> dict[str, Any]:
        """Aggregate listing metrics across status, condition, set, and price."""
        aggs_query = {
            "by_status": {"terms": {"field": "status"}},
            "by_condition": {"terms": {"field": "condition"}},
            "by_rarity": {"terms": {"field": "rarity"}},
            "by_set": {
                "terms": {"field": "set_name.keyword", "size": 10},
                "aggs": {
                    "avg_price": {"avg": {"field": "price"}},
                },
            },
            "price_stats": {"stats": {"field": "price"}},
        }
        res = await self.client.search(
            index=self.index_name,
            size=0,
            aggs=aggs_query,
        )
        return res.get("aggregations", {})

    def _to_entity(self, source: dict) -> Listing:
        return Listing(
            id=source["id"],
            card_id=source["card_id"],
            card_name=source["card_name"],
            set_name=source["set_name"],
            rarity=source.get("rarity", ""),
            image_url=source["image_url"],
            price=float(source["price"]),
            condition=CardCondition(source["condition"]),
            seller_name=source["seller_name"],
            description=source.get("description", ""),
            status=ListingStatus(source.get("status", "ACTIVE")),
            buyer_name=source.get("buyer_name"),
            created_at=source["created_at"],
            sold_at=source.get("sold_at"),
        )
