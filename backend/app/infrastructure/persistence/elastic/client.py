"""
Elasticsearch async client and index mapping configuration.
"""

import logging

from elasticsearch import AsyncElasticsearch

logger = logging.getLogger(__name__)

LISTINGS_INDEX = "pokevinted_listings"
HEALTH_INDEX = "pokevinted_health"

HEALTH_MAPPING = {
    "mappings": {
        "properties": {
            "@timestamp": {"type": "date"},
            "service": {"type": "keyword"},
            "container": {"type": "keyword"},
            "status": {"type": "integer"},
            "status_label": {"type": "keyword"},
            "latency_ms": {"type": "float"},
        }
    }
}

LISTINGS_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "card_id": {"type": "keyword"},
            "card_name": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "suggest": {"type": "search_as_you_type"},
                },
            },
            "set_name": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "rarity": {"type": "keyword"},
            "image_url": {"type": "keyword", "index": False},
            "price": {"type": "float"},
            "condition": {"type": "keyword"},
            "seller_name": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "description": {"type": "text"},
            "status": {"type": "keyword"},
            "buyer_name": {"type": "keyword"},
            "created_at": {"type": "date"},
            "sold_at": {"type": "date"},
        }
    }
}


class ElasticClientManager:
    client: AsyncElasticsearch | None = None

    @classmethod
    def connect(cls, host: str = "http://localhost:9200") -> AsyncElasticsearch:
        if cls.client is None:
            logger.info("Connecting to Elasticsearch at: %s", host)
            cls.client = AsyncElasticsearch(hosts=[host], request_timeout=10)
        return cls.client

    @classmethod
    async def init_indices(cls) -> None:
        """Create the listings index mapping when missing."""
        if cls.client is None:
            return
        exists = await cls.client.indices.exists(index=LISTINGS_INDEX)
        if not exists:
            await cls.client.indices.create(index=LISTINGS_INDEX, body=LISTINGS_MAPPING)
            logger.info("Elasticsearch index '%s' initialized.", LISTINGS_INDEX)

        health_exists = await cls.client.indices.exists(index=HEALTH_INDEX)
        if not health_exists:
            await cls.client.indices.create(index=HEALTH_INDEX, body=HEALTH_MAPPING)
            logger.info("Elasticsearch index '%s' initialized.", HEALTH_INDEX)

    @classmethod
    async def close(cls) -> None:
        if cls.client:
            await cls.client.close()
            cls.client = None
            logger.info("Elasticsearch connection closed.")
