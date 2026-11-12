"""
PokéVinted FastAPI application entrypoint.
Initializes NoSQL datastores on startup and manages application lifecycle.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.application.use_cases.seed_catalog import SeedCatalogUseCase
from app.config import settings
from app.domain.exceptions import (
    CardNotFoundError,
    InsufficientFundsError,
    InvalidConditionError,
    InvalidCredentialsError,
    InvalidPriceError,
    ListingAlreadySoldError,
    ListingNotFoundError,
    SelfPurchaseNotAllowedError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from app.infrastructure.monitoring.health_monitor import run_health_monitor
from app.infrastructure.persistence.elastic.client import ElasticClientManager
from app.infrastructure.persistence.elastic.elastic_search_repository import ElasticSearchRepository
from app.infrastructure.persistence.mongo.client import MongoClientManager
from app.infrastructure.persistence.mongo.mongo_card_repository import MongoCardRepository
from app.infrastructure.persistence.mongo.mongo_listing_repository import MongoListingRepository
from app.infrastructure.persistence.mongo.mongo_user_repository import MongoUserRepository
from app.infrastructure.persistence.redis.client import RedisClientManager
from app.infrastructure.persistence.redis.redis_cache_repository import RedisCacheRepository
from app.infrastructure.seed.cards_dataset import get_default_catalog_cards, get_initial_marketplace_listings
from app.interfaces.api.admin import router as admin_router
from app.interfaces.api.analytics import router as analytics_router
from app.interfaces.api.cards import router as cards_router
from app.interfaces.api.listings import router as listings_router
from app.interfaces.api.messages import router as messages_router
from app.interfaces.api.orders import router as orders_router
from app.interfaces.api.users import init_users_persistence
from app.interfaces.api.users import router as users_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("pokevinted")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize datastore connections
    logger.info("Starting PokéVinted API...")
    try:
        mongo_db = MongoClientManager.connect(settings.MONGO_URI, settings.MONGO_DB)
        redis_client = RedisClientManager.connect(settings.REDIS_URL)
        elastic_client = ElasticClientManager.connect(settings.ELASTICSEARCH_HOST)

        # Initialize Elasticsearch schema if available
        try:
            await ElasticClientManager.init_indices()
        except Exception as e:
            logger.warning("Elasticsearch unavailable during schema init: %s", e)

        # Auto-seed reference catalog on first start when empty.
        # Run as a background task so the API becomes available (and healthcheck
        # passes) immediately instead of blocking startup on the slow per-document
        # Elasticsearch indexing (refresh=wait_for). The catalog populates shortly after.
        card_repo = MongoCardRepository(mongo_db)
        existing_cards_count = await card_repo.count()
        if existing_cards_count == 0:
            logger.info("Empty catalog detected: scheduling background seed of cards and listings...")
            listing_repo = MongoListingRepository(mongo_db)
            search_repo = ElasticSearchRepository(elastic_client)
            cache_repo = RedisCacheRepository(redis_client)
            seed_uc = SeedCatalogUseCase(card_repo, listing_repo, search_repo, cache_repo)

            cards = get_default_catalog_cards()
            listings = get_initial_marketplace_listings()

            async def _run_seed() -> None:
                try:
                    await seed_uc.execute(cards, listings)
                    logger.info("Catalog and initial listings seeded successfully.")
                except Exception as e:
                    logger.warning("Failed to auto-seed catalog: %s", e)

            # Keep a reference so the task is not garbage-collected mid-flight.
            app.state.seed_task = asyncio.create_task(_run_seed())

        # Ensure registered members and administrator accounts persist across container restarts
        user_repo = MongoUserRepository(mongo_db)
        try:
            await init_users_persistence(user_repo)
            logger.info("User accounts persistence synchronized with MongoDB.")
        except Exception as e:
            logger.warning("Failed to initialize user accounts in MongoDB: %s", e)

        # Container health probe: periodically ping every dependency and record
        # its state into Elasticsearch so Grafana can show an "État des conteneurs"
        # dashboard. Runs as a background task (no new container, no Prometheus).
        app.state.health_task = asyncio.create_task(
            run_health_monitor(
                MongoClientManager.client,
                elastic_client,
                redis_client,
            )
        )

    except Exception as exc:
        logger.error("Failed to initialize database connections: %s", exc)

    yield

    # Shutdown: cleanly close connections
    logger.info("Closing NoSQL connections...")
    health_task = getattr(app.state, "health_task", None)
    if health_task is not None:
        health_task.cancel()
        try:
            await health_task
        except asyncio.CancelledError:
            pass
    try:
        await ElasticClientManager.close()
        await RedisClientManager.close()
        MongoClientManager.close()
    except Exception as exc:
        logger.warning("Error during connection teardown: %s", exc)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Pokémon Card Marketplace - NoSQL Project (FastAPI, MongoDB, Elasticsearch, Redis)",
    lifespan=lifespan,
)

# CORS middleware for frontend communication.
# A wildcard origin and credentials cannot be combined safely (the browser rejects
# it and it would expose the API to any site), so credentials are only enabled when
# an explicit origin allow-list is configured.
_cors_origins = settings.cors_origins
_allow_credentials = "*" not in _cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Enforce defense-in-depth HTTP security headers on all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Domain exception handlers
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


@app.exception_handler(SelfPurchaseNotAllowedError)
async def self_purchase_not_allowed_handler(request: Request, exc: SelfPurchaseNotAllowedError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "code": "SELF_PURCHASE_NOT_ALLOWED"})


@app.exception_handler(InsufficientFundsError)
async def insufficient_funds_handler(request: Request, exc: InsufficientFundsError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "code": "INSUFFICIENT_FUNDS"})


@app.exception_handler(UserNotFoundError)
async def user_not_found_handler(request: Request, exc: UserNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc), "code": "USER_NOT_FOUND"})


@app.exception_handler(UserAlreadyExistsError)
async def user_already_exists_handler(request: Request, exc: UserAlreadyExistsError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "code": "USER_ALREADY_EXISTS"})


@app.exception_handler(InvalidCredentialsError)
async def invalid_credentials_handler(request: Request, exc: InvalidCredentialsError):
    return JSONResponse(status_code=401, content={"detail": str(exc), "code": "INVALID_CREDENTIALS"})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    if errors:
        first = errors[0]
        field = ".".join(str(x) for x in first.get("loc", []) if x not in ("body", "query", "path"))
        msg = first.get("msg", "Données de formulaire invalides.")
        if first.get("type") == "less_than_equal":
            ctx = first.get("ctx", {})
            limit = ctx.get("le")
            detail = f"Le montant maximum autorisé est de {limit:,.2f} €.".replace(",", " ") if limit is not None else msg
        elif first.get("type") == "greater_than":
            ctx = first.get("ctx", {})
            limit = ctx.get("gt")
            detail = f"Le montant doit être supérieur à {limit:,.2f} €.".replace(",", " ") if limit is not None else msg
        else:
            detail = f"Erreur sur le champ '{field}': {msg}" if field else msg
        return JSONResponse(status_code=422, content={"detail": detail})
    return JSONResponse(status_code=422, content={"detail": "Données invalides."})



# Register API routers
app.include_router(cards_router)
app.include_router(listings_router)
app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(analytics_router)
app.include_router(messages_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
