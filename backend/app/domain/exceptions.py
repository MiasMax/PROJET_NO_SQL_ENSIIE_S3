"""
PokéVinted domain exceptions.
Explicit domain-level error types representing business invariant violations.
"""


class DomainException(Exception):
    """Base exception for all domain logic violations."""

    pass


class CardNotFoundError(DomainException):
    """Raised when a Pokémon reference card does not exist in the catalog."""

    def __init__(self, card_id: str):
        super().__init__(f"Card not found with ID: '{card_id}'")
        self.card_id = card_id


class ListingNotFoundError(DomainException):
    """Raised when a marketplace listing does not exist."""

    def __init__(self, listing_id: str):
        super().__init__(f"Listing not found with ID: '{listing_id}'")
        self.listing_id = listing_id


class ListingAlreadySoldError(DomainException):
    """Raised when an operation attempts to purchase an already sold listing."""

    def __init__(self, listing_id: str):
        super().__init__(f"Listing '{listing_id}' has already been sold")
        self.listing_id = listing_id


class InvalidPriceError(DomainException):
    """Raised when a listing price is zero or negative."""

    def __init__(self, price: float):
        super().__init__(f"Listing price must be strictly positive (received: {price} EUR)")
        self.price = price


class InvalidConditionError(DomainException):
    """Raised when a card condition string is not recognized."""

    def __init__(self, condition: str):
        super().__init__(f"Invalid card condition: '{condition}'")
        self.condition = condition
