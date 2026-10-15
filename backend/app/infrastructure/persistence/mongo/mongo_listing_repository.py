"""
Implémentation MongoDB du ListingRepository.
Gère la persistance des annonces dans la collection 'listings'.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.domain.entities.listing import Listing
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus


class MongoListingRepository(ListingRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["listings"]

    async def save(self, listing: Listing) -> None:
        doc = listing.to_dict()
        doc["_id"] = listing.id
        await self.collection.replace_one({"_id": listing.id}, doc, upsert=True)

    async def get_by_id(self, listing_id: str) -> Listing | None:
        doc = await self.collection.find_one({"_id": listing_id})
        if not doc:
            return None
        return self._to_entity(doc)

    async def list_listings(
        self, status: ListingStatus | None = None, limit: int = 50, skip: int = 0
    ) -> list[Listing]:
        query = {}
        if status:
            query["status"] = status.value if isinstance(status, ListingStatus) else status

        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_entity(d) for d in docs]

    async def count_by_status(self, status: ListingStatus | None = None) -> int:
        query = {}
        if status:
            query["status"] = status.value if isinstance(status, ListingStatus) else status
        return await self.collection.count_documents(query)

    async def get_recent(self, limit: int = 10) -> list[Listing]:
        return await self.list_listings(status=ListingStatus.ACTIVE, limit=limit, skip=0)

    def _to_entity(self, doc: dict) -> Listing:
        return Listing(
            id=doc["_id"],
            card_id=doc["card_id"],
            card_name=doc["card_name"],
            set_name=doc["set_name"],
            rarity=doc.get("rarity", ""),
            image_url=doc["image_url"],
            price=float(doc["price"]),
            condition=CardCondition(doc["condition"]),
            seller_name=doc["seller_name"],
            description=doc.get("description", ""),
            status=ListingStatus(doc.get("status", "ACTIVE")),
            buyer_name=doc.get("buyer_name"),
            created_at=doc["created_at"],
            sold_at=doc.get("sold_at"),
        )
