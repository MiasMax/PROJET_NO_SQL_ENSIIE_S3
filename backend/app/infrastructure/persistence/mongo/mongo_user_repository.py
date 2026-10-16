"""
MongoDB implementation of UserRepository.
Persists member and admin accounts in the 'users' collection.
"""

from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository


class MongoUserRepository(UserRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["users"]

    async def save(self, user: User) -> None:
        doc = user.to_dict(include_private=True)
        doc["_id"] = user.id
        await self.collection.replace_one({"_id": user.id}, doc, upsert=True)

    async def get_by_id(self, user_id: str) -> User | None:
        doc = await self.collection.find_one({"_id": user_id})
        if not doc:
            return None
        return self._to_entity(doc)

    async def get_by_username(self, username: str) -> User | None:
        clean = username.strip().lower()
        doc = await self.collection.find_one({"username": {"$regex": f"^{clean}$", "$options": "i"}})
        if not doc:
            return None
        return self._to_entity(doc)

    async def get_by_email(self, email: str) -> User | None:
        clean = email.strip().lower()
        doc = await self.collection.find_one({"email": clean})
        if not doc:
            return None
        return self._to_entity(doc)

    async def list_users(self, limit: int = 50, skip: int = 0) -> list[User]:
        cursor = self.collection.find({}).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_entity(d) for d in docs]

    async def count(self) -> int:
        return await self.collection.count_documents({})

    def _to_entity(self, doc: dict) -> User:
        created_at = doc.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:
                created_at = datetime.utcnow()
        elif not isinstance(created_at, datetime):
            created_at = datetime.utcnow()

        return User(
            id=doc["_id"],
            username=doc["username"],
            name=doc["name"],
            email=doc.get("email", ""),
            password_hash=doc.get("password_hash", ""),
            role=doc.get("role", "Dresseur"),
            balance=float(doc.get("balance", 0.0)),
            is_admin=bool(doc.get("is_admin", False)),
            created_at=created_at,
        )
