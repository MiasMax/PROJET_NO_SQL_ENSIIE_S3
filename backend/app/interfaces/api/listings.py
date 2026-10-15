"""
Marketplace Listings API Router.
Handles listing creation, faceted search, and card purchasing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.dtos.listing_dtos import CreateListingRequest, ListingResponse, SearchListingsResponse
from app.application.dtos.order_dtos import OrderResponse, PurchaseListingRequest
from app.application.use_cases.create_listing import CreateListingCommand, CreateListingUseCase
from app.application.use_cases.purchase_listing import PurchaseListingCommand, PurchaseListingUseCase
from app.application.use_cases.search_listings import SearchListingsQuery, SearchListingsUseCase
from app.domain.repositories.listing_repository import ListingRepository
from app.interfaces.dependencies import (
    get_cache_repository,
    get_create_listing_use_case,
    get_listing_repository,
    get_purchase_listing_use_case,
    get_search_listings_use_case,
)

router = APIRouter(prefix="/api/listings", tags=["Marketplace Listings"])


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: CreateListingRequest,
    create_uc: CreateListingUseCase = Depends(get_create_listing_use_case),
):
    """
    Publish a new card listing.
    Persists simultaneously into MongoDB, Elasticsearch, and Redis.
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
    q: str | None = Query(None, description="Fuzzy text query on card name, set, or seller"),
    set_name: str | None = Query(None, description="Filter by card expansion set"),
    condition: str | None = Query(None, description="Filter by card condition (e.g. MINT, NEAR_MINT)"),
    min_price: float | None = Query(None, ge=0, description="Minimum price filter"),
    max_price: float | None = Query(None, ge=0, description="Maximum price filter"),
    status: str | None = Query("ACTIVE", description="Listing status filter"),
    sort_by: str = Query("created_at", description="Sort field: created_at, price, name"),
    sort_order: str = Query("desc", description="Sort direction: asc, desc"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search_uc: SearchListingsUseCase = Depends(get_search_listings_use_case),
    cache_repo=Depends(get_cache_repository),
):
    """
    Search listings using Elasticsearch with MongoDB fallback and Redis caching.
    Demonstrates the latency contrast between Redis cache hits and database queries.
    """
    import time

    start_time = time.perf_counter()

    # Normalized cache key
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

    # Query search service (Elasticsearch with Mongo fallback)
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

    # Cache response in Redis with 45s TTL
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
    """Fetch individual listing from MongoDB document store."""
    listing = await listing_repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing.to_dict()


@router.post("/{listing_id}/purchase", response_model=OrderResponse)
async def purchase_listing(
    listing_id: str,
    payload: PurchaseListingRequest,
    purchase_uc: PurchaseListingUseCase = Depends(get_purchase_listing_use_case),
):
    """
    Execute a card purchase.
    Transitions listing to SOLD across datastores and records immutable order.
    """
    command = PurchaseListingCommand(listing_id=listing_id, buyer_name=payload.buyer_name)
    order = await purchase_uc.execute(command)
    return order.to_dict()
