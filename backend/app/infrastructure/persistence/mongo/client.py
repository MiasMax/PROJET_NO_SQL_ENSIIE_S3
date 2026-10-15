"""
Client et gestionnaire de connexion MongoDB (Motor async).
"""
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MongoClientManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    def connect(cls, uri: str, db_name: str = "pokevinted") -> AsyncIOMotorDatabase:
        if cls.client is None:
            logger.info("Connexion à MongoDB sur : %s", uri)
            cls.client = AsyncIOMotorClient(uri)
            cls.db = cls.client[db_name]
        return cls.db

    @classmethod
    def close(cls) -> None:
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("Connexion MongoDB fermée.")
