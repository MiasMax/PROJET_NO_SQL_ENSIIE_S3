"""
Routes API pour les annonces du Marketplace (Création, Recherche, Achat).
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.dtos.listing_dtos import CreateListingRequest, ListingResponse, SearchListingsResponse
from app.application.dtos.order_dtos import PurchaseListingRequest, OrderResponse
from app.application.use_cases.create_listing import CreateListingUseCase, CreateListingCommand
from app.application.use_cases.purchase_listing import PurchaseListingUseCase, PurchaseListingCommand
from app.application.use_cases.search_listings import SearchListingsUseCase, SearchListingsQuery
from app.domain.repositories.listing_repository import ListingRepository
from app.interfaces.dependencies import (
    get_create_listing_use_case,
    get_purchase_listing_use_case,
    get_search_listings_use_case,
    get_listing_repository,
    get_cache_repository,
)

router = APIRouter(prefix="/api/listings", tags=["Marketplace Listings"])


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: CreateListingRequest,
    create_uc: CreateListingUseCase = Depends(get_create_listing_use_case),
):
    """
    Formulaire de mise en vente (Point névralgique de la soutenance NoSQL) :
    Persiste simultanément les données dans MongoDB, Elasticsearch et Redis.
    """
    command = CreateListingCommand(
        card_id=payload.card_id,
        price=payload.price,
        condition=payload.condition.value,
        seller_name=payload.seller_name,
        description=payload.description,
        custom_image_url=payload.custom_image_url,
    )
    listing = await create_uc.execute(command)
    return listing.to_dict()


@router.get("", response_model=SearchListingsResponse)
async def search_listings(
    q: Optional[str] = Query(None, description="Recherche textuelle floue sur nom, série ou vendeur"),
    set_name: Optional[str] = Query(None, description="Filtre par extension"),
    condition: Optional[str] = Query(None, description="Filtre par état (MINT, NEAR_MINT, etc.)"),
    min_price: Optional[float] = Query(None, ge=0, description="Prix minimum"),
    max_price: Optional[float] = Query(None, ge=0, description="Prix maximum"),
    status: Optional[str] = Query("ACTIVE", description="Statut de l'annonce"),
    sort_by: str = Query("created_at", description="Tri : created_at, price, name"),
    sort_order: str = Query("desc", description="Ordre de tri : asc, desc"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search_uc: SearchListingsUseCase = Depends(get_search_listings_use_case),
    cache_repo=Depends(get_cache_repository),
):
    """
    Recherche plein-texte avec Elasticsearch, fallback MongoDB et mise en cache Redis.
    Met en évidence la différence de latence entre Redis Cache HIT (<1ms) et Elasticsearch/Mongo.
    """
    import time
    start_time = time.perf_counter()

    # Clé de cache normalisée
    cache_key = f"cache:listings:{q}:{set_name}:{condition}:{min_price}:{max_price}:{status}:{sort_by}:{sort_order}:{limit}:{skip}"
    cached = await cache_repo.get_json(cache_key)

    if cached:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "total": cached["total"],
            "items": cached["items"],
            "source": "redis_cache",
            "cache_hit": True,
            "response_time_ms": elapsed_ms,
        }

    # Requête métier (Elasticsearch / Mongo)
    query = SearchListingsQuery(
        query=q,
        set_name=set_name,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        skip=skip,
    )
    results = await search_uc.execute(query)
    items_dict = [item.to_dict() for item in results["items"]]

    # Mise en cache Redis pour 45 secondes
    await cache_repo.set_json(cache_key, {"total": results["total"], "items": items_dict}, ttl_seconds=45)

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return {
        "total": results["total"],
        "items": items_dict,
        "source": results.get("source", "elasticsearch"),
        "cache_hit": False,
        "response_time_ms": elapsed_ms,
    }


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing_detail(
    listing_id: str,
    listing_repo: ListingRepository = Depends(get_listing_repository),
):
    """Consulte la fiche d'une annonce spécifique depuis MongoDB."""
    listing = await listing_repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")
    return listing.to_dict()


@router.post("/{listing_id}/purchase", response_model=OrderResponse)
async def purchase_listing(
    listing_id: str,
    payload: PurchaseListingRequest,
    purchase_uc: PurchaseListingUseCase = Depends(get_purchase_listing_use_case),
):
    """
    Achat d'une carte (Style Vinted) :
    Bascule l'annonce à SOLD dans Mongo et Elastic, crée la commande et met à jour les stats Redis.
    """
    command = PurchaseListingCommand(listing_id=listing_id, buyer_name=payload.buyer_name)
    order = await purchase_uc.execute(command)
    return order.to_dict()
