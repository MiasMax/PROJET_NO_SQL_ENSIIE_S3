"""
Central configuration for PokéVinted.
Reads environment variables with sane defaults for local and containerized setups.
"""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "PokéVinted API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "pokevinted")
    MONGO_ROOT_USER: str = os.getenv("MONGO_ROOT_USER", "admin")
    MONGO_ROOT_PASSWORD: str = os.getenv("MONGO_ROOT_PASSWORD", "")

    # Elasticsearch
    ELASTICSEARCH_HOST: str = os.getenv("ELASTICSEARCH_HOST", "http://localhost:9200")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # CORS — kept as a raw string so pydantic-settings does not attempt JSON
    # decoding of env values like "*" or "a.com,b.com". Parsed via the property below.
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS_ORIGINS into a list, accepting "*" or comma-separated values."""
        stripped = self.CORS_ORIGINS.strip()
        if stripped == "*":
            return ["*"]
        return [origin.strip() for origin in stripped.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
