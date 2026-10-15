"""
Card catalog repository interface.
Defines storage contracts for reference cards.
"""

from abc import ABC, abstractmethod

from app.domain.entities.card import Card


class CardRepository(ABC):
    @abstractmethod
    async def get_by_id(self, card_id: str) -> Card | None:
        """Fetch a catalog card by unique identifier."""
        pass

    @abstractmethod
    async def list_cards(self, limit: int = 50, skip: int = 0, search: str | None = None) -> list[Card]:
        """List catalog cards with pagination and optional search."""
        pass

    @abstractmethod
    async def save(self, card: Card) -> None:
        """Persist or update a card record."""
        pass

    @abstractmethod
    async def bulk_save(self, cards: list[Card]) -> int:
        """Persist multiple cards in bulk."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Return total number of cards in catalog."""
        pass
