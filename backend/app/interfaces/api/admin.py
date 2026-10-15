"""
Routes API pour la vue Admin (Bilan d'activité et Supervision NoSQL).
Fournit les métriques combinées Mongo + Elastic + Redis et les commandes d'inspection terminal.
"""
from fastapi import APIRouter, Depends
from app.application.dtos.stats_dtos import AdminStatsResponse
from app.application.use_cases.get_admin_stats import GetAdminStatsUseCase
from app.application.use_cases.seed_catalog import SeedCatalogUseCase
from app.infrastructure.seed.cards_dataset import get_default_catalog_cards, get_initial_marketplace_listings
from app.interfaces.dependencies import get_admin_stats_use_case, get_seed_catalog_use_case, get_search_repository

router = APIRouter(prefix="/api/admin", tags=["Admin & Supervision"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    stats_uc: GetAdminStatsUseCase = Depends(get_admin_stats_use_case),
):
    """Bilan complet des métriques financières et de l'état des 3 bases NoSQL."""
    return await stats_uc.execute()


@router.get("/aggregations")
async def get_elasticsearch_aggregations(
    search_repo=Depends(get_search_repository),
):
    """
    Agrégations analytiques directes depuis Elasticsearch.
    Démontre la puissance du format JSON partagé entre MongoDB et Elasticsearch
    pour alimenter des tableaux de bord analytiques complexes et Grafana.
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
    """Ré-initialise ou peuple le catalogue avec les cartes officielles et annonces de démo."""
    cards = get_default_catalog_cards()
    listings = get_initial_marketplace_listings()
    result = await seed_uc.execute(cards, listings)
    return {
        "status": "success",
        "message": "Peuplement du catalogue et du marketplace effectué avec succès",
        "details": result,
    }
