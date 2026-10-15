"""
Implémentation MongoDB du CardRepository.
Stocke le catalogue officiel des cartes Pokémon dans la collection 'cards'.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.domain.entities.card import Card
from app.domain.repositories.card_repository import CardRepository


class MongoCardRepository(CardRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["cards"]

    async def get_by_id(self, card_id: str) -> Card | None:
        doc = await self.collection.find_one({"_id": card_id})
        if not doc:
            return None
        return self._to_entity(doc)

    async def list_cards(self, limit: int = 50, skip: int = 0, search: str | None = None) -> list[Card]:
        query = {}
        if search:
            query = {"name": {"$regex": search, "$options": "i"}}
        cursor = self.collection.find(query).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_entity(d) for d in docs]

    async def save(self, card: Card) -> None:
        data = card.to_dict()
        data["_id"] = card.id
        await self.collection.replace_one({"_id": card.id}, data, upsert=True)

    async def bulk_save(self, cards: list[Card]) -> int:
        if not cards:
            return 0
        from pymongo import ReplaceOne

        operations = [
            ReplaceOne({"_id": card.id}, {**card.to_dict(), "_id": card.id}, upsert=True) for card in cards
        ]
        result = await self.collection.bulk_write(operations)
        return result.upserted_count + result.modified_count + result.matched_count

    async def count(self) -> int:
        return await self.collection.count_documents({})

    def _to_entity(self, doc: dict) -> Card:
        return Card(
            id=doc["_id"],
            name=doc["name"],
            supertype=doc.get("supertype", "Pokémon"),
            subtypes=doc.get("subtypes", []),
            hp=doc.get("hp"),
            types=doc.get("types", []),
            set_id=doc.get("set_id", ""),
            set_name=doc.get("set_name", ""),
            set_series=doc.get("set_series", ""),
            number=doc.get("number", ""),
            rarity=doc.get("rarity", ""),
            image_small=doc.get("image_small", ""),
            image_large=doc.get("image_large", ""),
            market_price=float(doc.get("market_price", 0.0)),
            illustrator=doc.get("illustrator"),
            created_at=doc.get("created_at"),
        )
