"""
FastAPI dependency injection wiring.
Instantiates database adapters and passes them to domain use cases.
"""

from fastapi import Depends

from app.application.use_cases.create_listing import CreateListingUseCase
from app.application.use_cases.get_admin_stats import GetAdminStatsUseCase
from app.application.use_cases.purchase_listing import PurchaseListingUseCase
from app.application.use_cases.search_listings import SearchListingsUseCase
from app.application.use_cases.seed_catalog import SeedCatalogUseCase
from app.config import settings
from app.infrastructure.persistence.elastic.client import ElasticClientManager
from app.infrastructure.persistence.elastic.elastic_search_repository import ElasticSearchRepository
from app.infrastructure.persistence.mongo.client import MongoClientManager
from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.infrastructure.persistence.mongo.mongo_listing_repository import MongoListingRepository
from app.infrastructure.persistence.mongo.mongo_order_repository import MongoOrderRepository
from app.infrastructure.persistence.redis.client import RedisClientManager
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository


def get_mongo_db():
    return MongoClientManager.connect(settings.MONGO_URI, settings.MONGO_DB)


def get_elastic_client():
    return ElasticClientManager.connect(settings.ELASTICSEARCH_HOST)


def get_redis_client():
    return RedisClientManager.connect(settings.REDIS_URL)


def get_card_repository(db=Depends(get_mongo_db)) -> MongoCardRepository:
    return MongoCardRepository(db)


def get_listing_repository(db=Depends(get_mongo_db)) -> MongoListingRepository:
    return MongoListingRepository(db)


def get_order_repository(db=Depends(get_mongo_db)) -> MongoOrderRepository:
    return MongoOrderRepository(db)


def get_search_repository(elastic=Depends(get_elastic_client)) -> ElasticSearchRepository:
    return ElasticSearchRepository(elastic)


def get_cache_repository(redis_client=Depends(get_redis_client)) -> RedisCacheRepository:
    return RedisCacheRepository(redis_client)


def get_create_listing_use_case(
    card_repo: MongoCardRepository = Depends(get_card_repository),
    listing_repo: MongoListingRepository = Depends(get_listing_repository),
    search_repo: ElasticSearchRepository = Depends(get_search_repository),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
) -> CreateListingUseCase:
    return CreateListingUseCase(card_repo, listing_repo, search_repo, cache_repo)


def get_purchase_listing_use_case(
    listing_repo: MongoListingRepository = Depends(get_listing_repository),
    order_repo: MongoOrderRepository = Depends(get_order_repository),
    search_repo: ElasticSearchRepository = Depends(get_search_repository),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
) -> PurchaseListingUseCase:
    return PurchaseListingUseCase(listing_repo, order_repo, search_repo, cache_repo)


def get_search_listings_use_case(
    search_repo: ElasticSearchRepository = Depends(get_search_repository),
    listing_repo: MongoListingRepository = Depends(get_listing_repository),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
) -> SearchListingsUseCase:
    return SearchListingsUseCase(search_repo, listing_repo, cache_repo)


def get_admin_stats_use_case(
    listing_repo: MongoListingRepository = Depends(get_listing_repository),
    order_repo: MongoOrderRepository = Depends(get_order_repository),
    card_repo: MongoCardRepository = Depends(get_card_repository),
    search_repo: ElasticSearchRepository = Depends(get_search_repository),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
) -> GetAdminStatsUseCase:
    return GetAdminStatsUseCase(listing_repo, order_repo, card_repo, search_repo, cache_repo)


def get_seed_catalog_use_case(
    card_repo: MongoCardRepository = Depends(get_card_repository),
    listing_repo: MongoListingRepository = Depends(get_listing_repository),
    search_repo: ElasticSearchRepository = Depends(get_search_repository),
    cache_repo: RedisCacheRepository = Depends(get_cache_repository),
) -> SeedCatalogUseCase:
    return SeedCatalogUseCase(card_repo, listing_repo, search_repo, cache_repo)
