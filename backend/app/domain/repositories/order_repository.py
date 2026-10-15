"""
Order and purchase audit repository interface.
"""

from abc import ABC, abstractmethod

from app.domain.entities.order import Order


class OrderRepository(ABC):
    @abstractmethod
    async def save(self, order: Order) -> None:
        """Persist a new purchase transaction."""
        pass

    @abstractmethod
    async def get_by_id(self, order_id: str) -> Order | None:
        """Fetch order by unique identifier."""
        pass

    @abstractmethod
    async def list_orders(self, limit: int = 50, skip: int = 0) -> list[Order]:
        """List orders ordered by timestamp descending."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Return total number of completed orders."""
        pass
