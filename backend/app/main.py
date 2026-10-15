"""
Point d'entrée principal de l'API FastAPI PokéVinted.
Initialise les connexions NoSQL au démarrage et gère le cycle de vie de l'application.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.domain.exceptions import (
    CardNotFoundError,
    ListingNotFoundError,
    ListingAlreadySoldError,
    InvalidPriceError,
    InvalidConditionError,
)
from app.infrastructure.persistence.mongo.client import MongoClientManager
from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.infrastructure.persistence.mongo.mongo_listing_repository import MongoListingRepository
from app.infrastructure.persistence.elastic.client import ElasticClientManager
from app.infrastructure.persistence.elastic.elastic_search_repository import ElasticSearchRepository
from app.infrastructure.persistence.redis.client import RedisClientManager
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.infrastructure.seed.cards_dataset import get_default_catalog_cards, get_initial_marketplace_listings
from app.application.use_cases.seed_catalog import SeedCatalogUseCase

from app.interfaces.api.cards import router as cards_router
from app.interfaces.api.listings import router as listings_router
from app.interfaces.api.orders import router as orders_router
from app.interfaces.api.admin import router as admin_router
from app.interfaces.api.users import router as users_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pokevinted")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage : Initialisation des connexions
    logger.info("Démarrage de PokéVinted API...")
    try:
        mongo_db = MongoClientManager.connect(settings.MONGO_URI, settings.MONGO_DB)
        redis_client = RedisClientManager.connect(settings.REDIS_URL)
        elastic_client = ElasticClientManager.connect(settings.ELASTICSEARCH_HOST)

        # Initialisation de l'index Elasticsearch si disponible
        try:
            await ElasticClientManager.init_indices()
        except Exception as e:
            logger.warning("Elasticsearch non disponible à l'initialisation : %s", e)

        # Peuplement automatique au premier lancement si catalogue vide
        card_repo = MongoCardRepository(mongo_db)
        existing_cards_count = await card_repo.count()
        if existing_cards_count == 0:
            logger.info("Catalogue vide : amorçage automatique (seed) des cartes et annonces...")
            listing_repo = MongoListingRepository(mongo_db)
            search_repo = ElasticSearchRepository(elastic_client)
            cache_repo = RedisCacheRepository(redis_client)
            seed_uc = SeedCatalogUseCase(card_repo, listing_repo, search_repo, cache_repo)

            cards = get_default_catalog_cards()
            listings = get_initial_marketplace_listings()
            try:
                await seed_uc.execute(cards, listings)
                logger.info("Catalogue et annonces initialisés avec succès !")
            except Exception as e:
                logger.warning("Erreur lors du seed automatique : %s", e)

    except Exception as exc:
        logger.error("Erreur d'initialisation des bases : %s", exc)

    yield

    # Arrêt propre des connexions
    logger.info("Fermeture des connexions NoSQL...")
    try:
        await ElasticClientManager.close()
        await RedisClientManager.close()
        MongoClientManager.close()
    except Exception as exc:
        logger.warning("Erreur lors de la fermeture des connexions : %s", exc)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Marketplace de cartes Pokémon - Projet NoSQL ENSIIE (FastAPI + MongoDB + Elasticsearch + Redis)",
    lifespan=lifespan,
)

# Configuration CORS pour autoriser le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handlers d'exceptions métier
@app.exception_handler(CardNotFoundError)
async def card_not_found_handler(request: Request, exc: CardNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc), "code": "CARD_NOT_FOUND"})


@app.exception_handler(ListingNotFoundError)
async def listing_not_found_handler(request: Request, exc: ListingNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc), "code": "LISTING_NOT_FOUND"})


@app.exception_handler(ListingAlreadySoldError)
async def listing_already_sold_handler(request: Request, exc: ListingAlreadySoldError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "code": "LISTING_ALREADY_SOLD"})


@app.exception_handler(InvalidPriceError)
async def invalid_price_handler(request: Request, exc: InvalidPriceError):
    return JSONResponse(status_code=422, content={"detail": str(exc), "code": "INVALID_PRICE"})


@app.exception_handler(InvalidConditionError)
async def invalid_condition_handler(request: Request, exc: InvalidConditionError):
    return JSONResponse(status_code=422, content={"detail": str(exc), "code": "INVALID_CONDITION"})


# Montage des routes
app.include_router(cards_router)
app.include_router(listings_router)
app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(users_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Vérification de santé de l'API."""
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
