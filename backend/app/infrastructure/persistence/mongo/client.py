"""
MongoDB async client manager (Motor).
"""

import logging
import re

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


def _mask_mongo_uri(uri: str) -> str:
    """Mask credentials in connection log entries."""
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:******@", uri)


class MongoClientManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    @classmethod
    def connect(cls, uri: str, db_name: str = "pokevinted") -> AsyncIOMotorDatabase:
        if cls.client is None or cls.db is None:
            logger.info("Connecting to MongoDB at: %s", _mask_mongo_uri(uri))
            cls.client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
            cls.db = cls.client[db_name]
        assert cls.db is not None
        return cls.db

    @classmethod
    def close(cls) -> None:
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("MongoDB connection closed.")
