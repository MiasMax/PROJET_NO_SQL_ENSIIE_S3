"""
Reference Card Entity (TCG Official Catalog).
Represents a recognized Pokémon card with official metadata.
"""

from dataclasses import dataclass


@dataclass
class Card:
    id: str  # e.g. "sv3pt5-006" (Charizard ex 151)
    name: str  # e.g. "Charizard ex"
    supertype: str  # "Pokémon", "Trainer", "Energy"
    subtypes: list[str]  # ["Stage 2", "ex"]
    hp: str | None  # "330"
    types: list[str]  # ["Fire"]
    set_id: str  # "sv3pt5"
    set_name: str  # "151"
    set_series: str  # "Scarlet & Violet"
    number: str  # "006"
    rarity: str  # "Double Rare", "Special Illustration Rare"
    image_small: str  # Low-res thumbnail URL
    image_large: str  # HD artwork URL
    market_price: float  # Benchmark market price in EUR
    illustrator: str | None = None
    created_at: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "supertype": self.supertype,
            "subtypes": self.subtypes,
            "hp": self.hp,
            "types": self.types,
            "set_id": self.set_id,
            "set_name": self.set_name,
            "set_series": self.set_series,
            "number": self.number,
            "rarity": self.rarity,
            "image_small": self.image_small,
            "image_large": self.image_large,
            "market_price": self.market_price,
            "illustrator": self.illustrator,
            "created_at": self.created_at,
        }
