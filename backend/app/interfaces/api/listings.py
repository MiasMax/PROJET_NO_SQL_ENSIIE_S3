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
    limit: int = Query(20, ge=1, le=100, description="Page size limit"),
    skip: int = Query(0, ge=0, le=10000, description="Pagination offset"),
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
    listing_repo: ListingRepository = Depends(get_listing_repository),
):
    """
    Execute a card purchase.
    Transitions listing to SOLD across datastores, records immutable order,
    and atomically debits the buyer's account balance.
    """
    from app.interfaces.api.users import credit_user_balance, debit_user_balance

    # Pre-check listing existence and status
    listing = await listing_repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    current_status = listing.status.value if hasattr(listing.status, "value") else str(listing.status)
    if current_status == "SOLD":
        raise HTTPException(status_code=400, detail="Cette annonce a déjà été vendue.")

    # Identify buyer and atomically debit balance
    buyer_identifier = payload.buyer_id or payload.buyer_name
    matched_user, new_balance = debit_user_balance(buyer_identifier, listing.price)
    resolved_buyer_name = matched_user["name"] if matched_user else (payload.buyer_name.strip() or "Acheteur")

    # Credit seller if registered in marketplace
    credit_user_balance(listing.seller_name, listing.price)

    try:
        command = PurchaseListingCommand(listing_id=listing_id, buyer_name=resolved_buyer_name)
        order = await purchase_uc.execute(command)
    except Exception:
        # Rollback debit on transaction failure
        if matched_user:
            credit_user_balance(matched_user["id"], listing.price)
        raise

    order_dict = order.to_dict()
    order_dict["buyer_balance"] = new_balance
    order_dict["buyer_name"] = resolved_buyer_name
    return order_dict

