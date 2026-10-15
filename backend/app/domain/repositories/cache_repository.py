"""
Port abstrait pour le cache, compteurs temps-réel et structures ordonnées (e.g. Redis).
"""

from abc import ABC, abstractmethod
from typing import Any


class CacheRepository(ABC):
    @abstractmethod
    async def increment_counter(self, key: str, amount: int = 1) -> int:
        """Incrémente atomiquement un compteur numérique."""
        pass

    @abstractmethod
    async def increment_float_counter(self, key: str, amount: float) -> float:
        """Incrémente atomiquement un compteur décimal (ex: volume des ventes)."""
        pass

    @abstractmethod
    async def get_counter(self, key: str) -> float:
        """Lit la valeur d'un compteur."""
        pass

    @abstractmethod
    async def push_recent_item(self, list_key: str, item_id: str, max_items: int = 20) -> None:
        """Ajoute un élément dans une liste FIFO bornée."""
        pass

    @abstractmethod
    async def get_recent_items(self, list_key: str, limit: int = 10) -> list[str]:
        """Récupère les derniers éléments d'une liste."""
        pass

    @abstractmethod
    async def track_card_view(self, card_id: str) -> None:
        """Incrémente la popularité d'une carte dans un Sorted Set (trending)."""
        pass

    @abstractmethod
    async def get_trending_card_ids(self, limit: int = 5) -> list[dict[str, Any]]:
        """Récupère les cartes les plus consultées avec leur score."""
        pass

    @abstractmethod
    async def add_favorite(self, user_id: str, card_id: str) -> None:
        """Ajoute une carte aux favoris de l'utilisateur (Redis SADD)."""
        pass

    @abstractmethod
    async def remove_favorite(self, user_id: str, card_id: str) -> None:
        """Retire une carte des favoris (Redis SREM)."""
        pass

    @abstractmethod
    async def get_favorites(self, user_id: str) -> list[str]:
        """Récupère la liste des favoris (Redis SMEMBERS)."""
        pass

    @abstractmethod
    async def set_user_session(self, token: str, user_data: dict[str, Any], ttl_seconds: int = 86400) -> None:
        """Enregistre une session utilisateur avec expiration TTL dans Redis."""
        pass

    @abstractmethod
    async def get_user_session(self, token: str) -> dict[str, Any] | None:
        """Récupère la session utilisateur active depuis Redis."""
        pass

    @abstractmethod
    async def get_json(self, key: str) -> Any | None:
        """Récupère une valeur mise en cache JSON."""
        pass

    @abstractmethod
    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Stocke une valeur en cache JSON avec une durée de vie (TTL)."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Supprime une clé du cache."""
        pass

    @abstractmethod
    async def get_stats(self) -> dict[str, Any]:
        """Récupère des métriques Redis (mémoire, connexions, uptime)."""
        pass
