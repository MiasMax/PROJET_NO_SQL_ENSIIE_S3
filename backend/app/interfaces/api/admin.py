"""
Admin and Supervision API Router.
Provides aggregated NoSQL metrics, Elasticsearch aggregations, and catalog re-seeding.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.dtos.stats_dtos import AdminStatsResponse
from app.application.use_cases.delete_listing import DeleteListingUseCase
from app.application.use_cases.get_admin_stats import GetAdminStatsUseCase
from app.application.use_cases.seed_catalog import SeedCatalogUseCase
from app.infrastructure.seed.cards_dataset import get_default_catalog_cards, get_initial_marketplace_listings
from app.interfaces.dependencies import (
    get_admin_stats_use_case,
    get_delete_listing_use_case,
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
    from app.interfaces.api.users import reset_seed_users

    reset_seed_users()
    cards = get_default_catalog_cards()
    listings = get_initial_marketplace_listings()
    result = await seed_uc.execute(cards, listings)
    return {
        "status": "success",
        "message": "Catalog and marketplace successfully seeded",
        "details": result,
    }


@router.delete("/listings/{listing_id}", status_code=status.HTTP_200_OK)
async def delete_listing_admin(
    listing_id: str,
    delete_uc: DeleteListingUseCase = Depends(get_delete_listing_use_case),
):
    """
    Moderation action: permanently delete any marketplace listing.
    Removes document from MongoDB, unindexes from Elasticsearch,
    and purges Redis query cache.
    """
    try:
        result = await delete_uc.execute(listing_id)
        return {
            "status": "success",
            "message": f"Listing '{listing_id}' has been permanently deleted.",
            "details": result,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


