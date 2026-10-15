"""
Central configuration for PokéVinted.
Reads environment variables with sane defaults for local and containerized setups.
"""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "PokéVinted API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "pokevinted")
    MONGO_ROOT_USER: str = os.getenv("MONGO_ROOT_USER", "admin_pokevinted")
    MONGO_ROOT_PASSWORD: str = os.getenv("MONGO_ROOT_PASSWORD", "P0k3V1nt3d_S3cur3_M0ng0_P@ssw0rd!")

    # Elasticsearch
    ELASTICSEARCH_HOST: str = os.getenv("ELASTICSEARCH_HOST", "http://localhost:9200")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "P0k3V1nt3d_S3cur3_R3d1s_T0k3n_2026!")

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
