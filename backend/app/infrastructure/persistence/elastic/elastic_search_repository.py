"""
Implémentation Elasticsearch de SearchRepository.
Effectue des recherches multi-champs floues (fuzzy search), filtres et tri.
"""
from typing import List, Optional, Dict, Any
from elasticsearch import AsyncElasticsearch
from app.domain.entities.listing import Listing
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus
from app.domain.repositories.search_repository import SearchRepository
from app.infrastructure.persistence.elastic.client import LISTINGS_INDEX


class ElasticSearchRepository(SearchRepository):
    def __init__(self, client: AsyncElasticsearch):
        self.client = client
        self.index_name = LISTINGS_INDEX

    async def index_listing(self, listing: Listing) -> None:
        doc = listing.to_dict()
        # Indexation avec refresh='wait_for' pour visibilité immédiate dans les tests/terminaux
        await self.client.index(
            index=self.index_name,
            id=listing.id,
            document=doc,
            refresh="wait_for",
        )

    async def delete_listing(self, listing_id: str) -> None:
        await self.client.delete(index=self.index_name, id=listing_id, ignore=[404], refresh="wait_for")

    async def search_listings(
        self,
        query: Optional[str] = None,
        set_name: Optional[str] = None,
        condition: Optional[CardCondition] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        status: Optional[ListingStatus] = ListingStatus.ACTIVE,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        skip: int = 0,
    ) -> Dict[str, Any]:
        must_clauses: List[Dict[str, Any]] = []
        filter_clauses: List[Dict[str, Any]] = []

        # 1. Filtre statut
        if status:
            val = status.value if isinstance(status, ListingStatus) else status
            filter_clauses.append({"term": {"status": val}})

        # 2. Recherche textuelle floue sur nom, extension, vendeur ou description
        if query and query.strip():
            must_clauses.append({
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
            })

        # 3. Filtre par extension (exact match)
        if set_name and set_name.strip():
            filter_clauses.append({"term": {"set_name.keyword": set_name.strip()}})

        # 4. Filtre par état de carte
        if condition:
            cond_val = condition.value if isinstance(condition, CardCondition) else condition
            filter_clauses.append({"term": {"condition": cond_val}})

        # 5. Filtre par tranche de prix
        if min_price is not None or max_price is not None:
            range_clause = {}
            if min_price is not None:
                range_clause["gte"] = min_price
            if max_price is not None:
                range_clause["lte"] = max_price
            filter_clauses.append({"range": {"price": range_clause}})

        bool_query: Dict[str, Any] = {}
        if must_clauses:
            bool_query["must"] = must_clauses
        else:
            bool_query["must"] = [{"match_all": {}}]

        if filter_clauses:
            bool_query["filter"] = filter_clauses

        # Définition du tri
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

    async def get_aggregations(self) -> Dict[str, Any]:
        """Agrégations analytiques Elasticsearch exploitant la structure JSON des annonces."""
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
