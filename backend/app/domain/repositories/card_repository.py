"""
Port abstrait du repository Catalogue de Cartes.
"""

from abc import ABC, abstractmethod

from app.domain.entities.card import Card


class CardRepository(ABC):
    @abstractmethod
    async def get_by_id(self, card_id: str) -> Card | None:
        """Récupère une carte par son identifiant unique."""
        pass

    @abstractmethod
    async def list_cards(self, limit: int = 50, skip: int = 0, search: str | None = None) -> list[Card]:
        """Liste les cartes du catalogue avec pagination et recherche optionnelle."""
        pass

    @abstractmethod
    async def save(self, card: Card) -> None:
        """Enregistre ou met à jour une carte."""
        pass

    @abstractmethod
    async def bulk_save(self, cards: list[Card]) -> int:
        """Enregistre un lot de cartes (utilisé pour le seed)."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Compte total de cartes dans le catalogue."""
        pass
