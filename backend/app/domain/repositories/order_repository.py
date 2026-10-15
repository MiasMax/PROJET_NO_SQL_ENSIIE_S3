"""
Port abstrait du repository Commandes / Transactions (Audit des ventes).
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities.order import Order


class OrderRepository(ABC):
    @abstractmethod
    async def save(self, order: Order) -> None:
        """Enregistre une nouvelle commande."""
        pass

    @abstractmethod
    async def get_by_id(self, order_id: str) -> Optional[Order]:
        """Récupère une commande par son ID."""
        pass

    @abstractmethod
    async def list_orders(self, limit: int = 50, skip: int = 0) -> List[Order]:
        """Liste les commandes triées par date décroissante."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Nombre total de transactions."""
        pass
