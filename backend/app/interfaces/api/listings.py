"""
Marketplace Listings API Router.
Handles listing creation, faceted search, and card purchasing.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.application.dtos.listing_dtos import (
    CreateListingRequest,
    ListingResponse,
    SearchListingsResponse,
    UpdateListingPriceRequest,
)
from app.application.dtos.order_dtos import (
    CheckoutCartRequest,
    CheckoutCartResponse,
    OrderResponse,
    PurchaseListingRequest,
)
from app.application.use_cases.checkout_cart import CheckoutCartCommand, CheckoutCartUseCase
from app.application.use_cases.create_listing import CreateListingCommand, CreateListingUseCase
from app.application.use_cases.delete_listing import DeleteListingUseCase
from app.application.use_cases.purchase_listing import PurchaseListingCommand, PurchaseListingUseCase
from app.application.use_cases.search_listings import SearchListingsQuery, SearchListingsUseCase
from app.application.use_cases.update_listing_price import (
    UpdateListingPriceCommand,
    UpdateListingPriceUseCase,
)
from app.domain.exceptions import ListingNotFoundError, SelfPurchaseNotAllowedError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.user_repository import UserRepository
from app.interfaces.dependencies import (
    get_cache_repository,
    get_checkout_cart_use_case,
    get_create_listing_use_case,
    get_delete_listing_use_case,
    get_listing_repository,
    get_purchase_listing_use_case,
    get_search_listings_use_case,
    get_update_listing_price_use_case,
    get_user_repository,
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
    limit: int = Query(50, ge=1, le=1000, description="Page size limit"),
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


@router.get("/trending/top", response_model=list[dict])
async def get_trending_listings(
    limit: int = Query(5, ge=1, le=20),
    cache_repo=Depends(get_cache_repository),
    listing_repo: ListingRepository = Depends(get_listing_repository),
):
    """
    Top trending listings computed in real time via a Redis Sorted Set (ZREVRANGE).
    Each view increments a listing's score (ZINCRBY). Listings that are sold or no
    longer exist are filtered out (Mongo stays the source of truth), so the ranking
    only ever surfaces purchasable offers.
    """
    candidate_limit = max(limit * 3, 15)
    trending = await cache_repo.get_trending_listing_ids(limit=candidate_limit)

    enriched: list[dict] = []
    for item in trending:
        listing = await listing_repo.get_by_id(item["listing_id"])
        if not listing:
            continue
        status_val = listing.status.value if hasattr(listing.status, "value") else str(listing.status)
        if status_val != "ACTIVE":
            continue
        enriched.append({**listing.to_dict(), "name": listing.card_name, "views": item["views"]})
        if len(enriched) >= limit:
            break

    return enriched


@router.post("/{listing_id}/view")
async def track_listing_view(
    listing_id: str,
    cache_repo=Depends(get_cache_repository),
    listing_repo: ListingRepository = Depends(get_listing_repository),
):
    """
    Increment a listing's real-time view counter in the Redis Sorted Set (ZINCRBY).
    Only active listings are counted so sold/removed offers never re-enter the ranking.
    """
    listing = await listing_repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    status_val = listing.status.value if hasattr(listing.status, "value") else str(listing.status)
    if status_val == "ACTIVE":
        await cache_repo.track_listing_view(listing_id)
        return {"status": "tracked", "listing_id": listing_id}
    return {"status": "skipped", "listing_id": listing_id, "reason": "listing_not_active"}


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
    cache_repo: CacheRepository = Depends(get_cache_repository),
    user_repo: UserRepository = Depends(get_user_repository),
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

    # Identify buyer and pre-check balance
    buyer_identifier = payload.buyer_id or payload.buyer_name
    from app.interfaces.api.users import find_user
    matched_user = find_user(buyer_identifier)

    resolved_buyer_name = matched_user["name"] if matched_user else (payload.buyer_name.strip() or "Acheteur")

    # Invariant: Prevent user from buying their own listing
    clean_seller = listing.seller_name.strip().lower()
    buyer_names = [
        resolved_buyer_name.strip().lower(),
        payload.buyer_name.strip().lower(),
        (matched_user["username"].strip().lower() if matched_user else ""),
        (matched_user["name"].strip().lower() if matched_user else ""),
    ]
    if any(b and (b == clean_seller or b in clean_seller or clean_seller in b) for b in buyer_names):
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas acheter votre propre annonce.",
        )

    charge_price = (
        payload.agreed_price
        if (payload.agreed_price is not None and payload.agreed_price > 0)
        else listing.price
    )

    if matched_user and matched_user["balance"] < charge_price:
        raise HTTPException(
            status_code=400,
            detail=f"Solde insuffisant pour finaliser cet achat. Solde actuel : {matched_user['balance']:.2f} €, montant requis : {charge_price:.2f} €.",
        )

    # Execute purchase and atomic transition across datastores
    try:
        command = PurchaseListingCommand(
            listing_id=listing_id,
            buyer_name=resolved_buyer_name,
            agreed_price=payload.agreed_price,
        )
        order = await purchase_uc.execute(command)
    except SelfPurchaseNotAllowedError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Invalidate search caches so refreshed listings reflect SOLD status immediately
    await cache_repo.delete_pattern("cache:listings:*")

    # Upon confirmed purchase, atomically debit buyer and credit seller
    new_balance = None
    if matched_user:
        _, new_balance = debit_user_balance(matched_user["id"], charge_price)
        try:
            buyer_entity = await user_repo.get_by_id(matched_user["id"])
            if buyer_entity:
                buyer_entity.balance = matched_user["balance"]
                await user_repo.save(buyer_entity)
        except Exception:
            pass

    credit_user_balance(listing.seller_name, charge_price)
    seller_user = find_user(listing.seller_name)
    if seller_user:
        try:
            seller_entity = await user_repo.get_by_id(seller_user["id"])
            if seller_entity:
                seller_entity.balance = seller_user["balance"]
                await user_repo.save(seller_entity)
        except Exception:
            pass

    order_dict = order.to_dict()
    order_dict["buyer_balance"] = new_balance
    order_dict["buyer_name"] = resolved_buyer_name
    return order_dict


@router.post("/checkout", response_model=CheckoutCartResponse)
@router.post("/cart/checkout", response_model=CheckoutCartResponse)
async def checkout_cart(
    payload: CheckoutCartRequest,
    checkout_uc: CheckoutCartUseCase = Depends(get_checkout_cart_use_case),
    listing_repo: ListingRepository = Depends(get_listing_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """
    Execute atomic multi-item cart checkout.
    Transitions all selected listings to SOLD across datastores,
    creates immutable order records, and atomically adjusts balances.
    """
    from app.interfaces.api.users import credit_user_balance, debit_user_balance, find_user

    if not payload.listing_ids:
        raise HTTPException(status_code=400, detail="Votre panier est vide.")

    # Identify buyer
    buyer_identifier = payload.buyer_id or payload.buyer_name
    matched_user = find_user(buyer_identifier)
    resolved_buyer_name = matched_user["name"] if matched_user else (payload.buyer_name.strip() or "Acheteur")

    # Invariant: Calculate required total and check self-purchase
    unique_ids = list(dict.fromkeys(payload.listing_ids))
    total_required = 0.0
    for lid in unique_ids:
        listing = await listing_repo.get_by_id(lid)
        if not listing:
            raise HTTPException(status_code=404, detail=f"L'annonce {lid} est introuvable.")
        status_val = listing.status.value if hasattr(listing.status, "value") else str(listing.status)
        if status_val == "SOLD":
            raise HTTPException(status_code=400, detail=f"La carte {listing.card_name} a déjà été vendue.")

        clean_seller = listing.seller_name.strip().lower()
        buyer_names = [
            resolved_buyer_name.strip().lower(),
            payload.buyer_name.strip().lower(),
            (matched_user["username"].strip().lower() if matched_user else ""),
            (matched_user["name"].strip().lower() if matched_user else ""),
        ]
        if any(b and (b == clean_seller or b in clean_seller or clean_seller in b) for b in buyer_names):
            raise HTTPException(
                status_code=400,
                detail=f"Vous ne pouvez pas acheter votre propre annonce ({listing.card_name}).",
            )
        total_required += listing.price

    total_required = round(total_required, 2)

    # Balance check
    if matched_user and matched_user["balance"] < total_required:
        raise HTTPException(
            status_code=400,
            detail=f"Solde insuffisant pour finaliser votre commande. Solde actuel : {matched_user['balance']:.2f} €, montant requis : {total_required:.2f} €.",
        )

    # Execute batch checkout
    try:
        command = CheckoutCartCommand(listing_ids=unique_ids, buyer_name=resolved_buyer_name)
        result = await checkout_uc.execute(command)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Atomically adjust balances
    new_balance = None
    if matched_user:
        _, new_balance = debit_user_balance(matched_user["id"], result.total_amount)
        try:
            buyer_entity = await user_repo.get_by_id(matched_user["id"])
            if buyer_entity:
                buyer_entity.balance = matched_user["balance"]
                await user_repo.save(buyer_entity)
        except Exception:
            pass

    for order in result.orders:
        credit_user_balance(order.seller_name, order.price)
        seller_user = find_user(order.seller_name)
        if seller_user:
            try:
                seller_entity = await user_repo.get_by_id(seller_user["id"])
                if seller_entity:
                    seller_entity.balance = seller_user["balance"]
                    await user_repo.save(seller_entity)
            except Exception:
                pass

    orders_dto = [
        OrderResponse(
            id=o.id,
            listing_id=o.listing_id,
            card_id=o.card_id,
            card_name=o.card_name,
            price=o.price,
            seller_name=o.seller_name,
            buyer_name=resolved_buyer_name,
            timestamp=o.timestamp.isoformat() if hasattr(o.timestamp, "isoformat") else str(o.timestamp),
            buyer_balance=new_balance,
        )
        for o in result.orders
    ]

    return CheckoutCartResponse(
        orders=orders_dto,
        total_amount=result.total_amount,
        item_count=result.item_count,
        buyer_name=resolved_buyer_name,
        buyer_balance=new_balance,
    )


@router.delete("/{listing_id}", status_code=status.HTTP_200_OK)
async def delete_listing(
    listing_id: str,
    x_session_token: str | None = Header(None),
    delete_uc: DeleteListingUseCase = Depends(get_delete_listing_use_case),
    listing_repo: ListingRepository = Depends(get_listing_repository),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """
    Delete a marketplace listing.
    Verifies that the caller owns the listing or possesses administrator privileges.
    Removes from MongoDB, deletes from Elasticsearch, and purges Redis cache.
    """
    if not x_session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise pour supprimer une annonce.",
        )

    session = await cache_repo.get_user_session(x_session_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée ou invalide.",
        )

    listing = await listing_repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annonce '{listing_id}' introuvable.",
        )

    is_admin = bool(session.get("is_admin"))
    user_name = (session.get("name") or session.get("username") or session.get("id") or "").lower().strip()
    seller_name = listing.seller_name.lower().strip()
    user_id = str(session.get("id", "")).lower().strip()

    is_owner = (
        (user_name == seller_name)
        or (user_id == seller_name)
        or (user_name in seller_name)
        or (seller_name in user_name)
    )

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le vendeur propriétaire ou un administrateur peut supprimer cette annonce.",
        )

    try:
        result = await delete_uc.execute(listing_id)
        return {"status": "success", "message": "Listing deleted successfully", "details": result}
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{listing_id}/price", response_model=ListingResponse, status_code=status.HTTP_200_OK)
@router.patch("/{listing_id}", response_model=ListingResponse, status_code=status.HTTP_200_OK)
@router.put("/{listing_id}/price", response_model=ListingResponse, status_code=status.HTTP_200_OK)
async def update_listing_price(
    listing_id: str,
    payload: UpdateListingPriceRequest,
    x_session_token: str | None = Header(None),
    update_price_uc: UpdateListingPriceUseCase = Depends(get_update_listing_price_use_case),
    listing_repo: ListingRepository = Depends(get_listing_repository),
    cache_repo: CacheRepository = Depends(get_cache_repository),
):
    """
    Update asking price of an active marketplace listing.
    Verifies that the caller owns the listing or possesses administrator privileges.
    Synchronizes MongoDB document, updates Elasticsearch index, and purges Redis cache.
    """
    listing = await listing_repo.get_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail=f"Annonce '{listing_id}' introuvable.")

    price = payload.get_price() if hasattr(payload, "get_price") else payload.price
    if price <= 0:
        raise HTTPException(status_code=400, detail="Le prix doit être strictement positif.")

    resolved_seller_name: str | None = None
    if x_session_token:
        session = await cache_repo.get_user_session(x_session_token)
        if not session:
            raise HTTPException(status_code=401, detail="Session expirée ou invalide.")
        if session.get("is_admin"):
            resolved_seller_name = listing.seller_name
        else:
            resolved_seller_name = session.get("name") or session.get("username") or session.get("id")
    elif payload.seller_name:
        resolved_seller_name = payload.seller_name
    else:
        raise HTTPException(
            status_code=401,
            detail="Authentification requise pour modifier le prix d'une annonce.",
        )

    try:
        command = UpdateListingPriceCommand(
            listing_id=listing_id,
            new_price=price,
            seller_name=resolved_seller_name,
        )
        updated_listing = await update_price_uc.execute(command)
        return updated_listing.to_dict()
    except ListingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc



