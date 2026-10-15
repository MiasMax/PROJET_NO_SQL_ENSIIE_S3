"""
Admin and Supervision API Router.
Provides aggregated NoSQL metrics, Elasticsearch aggregations, and catalog re-seeding.
"""

from fastapi import APIRouter, Depends

from app.application.dtos.stats_dtos import AdminStatsResponse
from app.application.use_cases.get_admin_stats import GetAdminStatsUseCase
from app.application.use_cases.seed_catalog import SeedCatalogUseCase
from app.infrastructure.seed.cards_dataset import get_default_catalog_cards, get_initial_marketplace_listings
from app.interfaces.dependencies import (
    get_admin_stats_use_case,
    get_search_repository,
    get_seed_catalog_use_case,
)

router = APIRouter(prefix="/api/admin", tags=["Admin & Supervision"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    stats_uc: GetAdminStatsUseCase = Depends(get_admin_stats_use_case),
):
    """Real-time financial summaries, datastore health metrics, and CLI check commands."""
    return await stats_uc.execute()


@router.get("/aggregations")
async def get_elasticsearch_aggregations(
    search_repo=Depends(get_search_repository),
):
    """
    Direct analytical aggregations from Elasticsearch.
    Demonstrates shared JSON document structures driving analytics in Grafana and API views.
    """
    try:
        aggs = await search_repo.get_aggregations()
        return {"status": "success", "aggregations": aggs}
    except Exception as exc:
        return {"status": "error", "message": str(exc), "aggregations": {}}


@router.post("/seed")
async def trigger_seed(
    seed_uc: SeedCatalogUseCase = Depends(get_seed_catalog_use_case),
):
    """Populate or re-initialize catalog cards and initial marketplace listings."""
    cards = get_default_catalog_cards()
    listings = get_initial_marketplace_listings()
    result = await seed_uc.execute(cards, listings)
    return {
        "status": "success",
        "message": "Catalog and marketplace successfully seeded",
        "details": result,
    }
