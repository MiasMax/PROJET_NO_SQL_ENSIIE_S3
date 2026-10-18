"""
Orders and Transactions API Router.
Provides immutable purchase audit trails from MongoDB.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.application.dtos.order_dtos import OrderResponse
from app.domain.repositories.cache_repository import CacheRepository
from app.infrastructure.persistence.mongo.mongo_order_repository import MongoOrderRepository
from app.interfaces.dependencies import get_cache_repository, get_order_repository

router = APIRouter(prefix="/api/orders", tags=["Orders & Transactions"])


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    x_session_token: str | None = Header(None),
    cache_repo: CacheRepository = Depends(get_cache_repository),
    order_repo: MongoOrderRepository = Depends(get_order_repository),
):
    """
    List completed purchase orders stored in MongoDB.
    Administrators can view all platform orders. Regular users can only access their own orders.
    """
    if not x_session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise pour consulter l'historique des commandes.",
        )

    session = await cache_repo.get_user_session(x_session_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée ou invalide.",
        )

    all_orders = await order_repo.list_orders(limit=limit, skip=skip)
    if session.get("is_admin"):
        return [o.to_dict() for o in all_orders]

    user_name = (session.get("name") or session.get("username") or session.get("id") or "").lower().strip()
    return [
        o.to_dict()
        for o in all_orders
        if user_name in o.buyer_name.lower() or o.buyer_name.lower() in user_name
    ]
