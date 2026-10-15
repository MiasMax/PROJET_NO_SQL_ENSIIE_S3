"""
Orders and Transactions API Router.
Provides immutable purchase audit trails from MongoDB.
"""

from fastapi import APIRouter, Depends, Query

from app.application.dtos.order_dtos import OrderResponse
from app.infrastructure.persistence.mongo.mongo_order_repository import MongoOrderRepository
from app.interfaces.dependencies import get_order_repository

router = APIRouter(prefix="/api/orders", tags=["Orders & Transactions"])


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    order_repo: MongoOrderRepository = Depends(get_order_repository),
):
    """List completed purchase orders stored in MongoDB."""
    orders = await order_repo.list_orders(limit=limit, skip=skip)
    return [o.to_dict() for o in orders]
