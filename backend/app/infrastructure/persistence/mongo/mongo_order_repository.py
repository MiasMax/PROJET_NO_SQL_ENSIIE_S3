"""
MongoDB implementation of OrderRepository.
Persists order audit records in the 'orders' collection.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.domain.entities.order import Order
from app.domain.repositories.order_repository import OrderRepository


class MongoOrderRepository(OrderRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["orders"]

    async def save(self, order: Order) -> None:
        doc = order.to_dict()
        doc["_id"] = order.id
        await self.collection.replace_one({"_id": order.id}, doc, upsert=True)

    async def get_by_id(self, order_id: str) -> Order | None:
        doc = await self.collection.find_one({"_id": order_id})
        if not doc:
            return None
        return self._to_entity(doc)

    async def list_orders(self, limit: int = 50, skip: int = 0) -> list[Order]:
        cursor = self.collection.find({}).sort("timestamp", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_entity(d) for d in docs]

    async def count(self) -> int:
        return await self.collection.count_documents({})

    def _to_entity(self, doc: dict) -> Order:
        timestamp = doc["timestamp"]
        if hasattr(timestamp, "isoformat"):
            timestamp = timestamp.isoformat()

        return Order(
            id=doc["_id"],
            listing_id=doc["listing_id"],
            card_id=doc["card_id"],
            card_name=doc["card_name"],
            price=float(doc["price"]),
            seller_name=doc["seller_name"],
            buyer_name=doc["buyer_name"],
            condition=doc.get("condition", "NEAR_MINT"),
            image_url=doc.get("image_url", ""),
            timestamp=str(timestamp),
        )
