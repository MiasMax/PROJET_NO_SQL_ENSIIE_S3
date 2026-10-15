"""
Marketplace listing lifecycle statuses.
"""

from enum import StrEnum


class ListingStatus(StrEnum):
    ACTIVE = "ACTIVE"  # Available for purchase
    RESERVED = "RESERVED"  # Temporary cart reservation
    SOLD = "SOLD"  # Purchase completed
    CANCELLED = "CANCELLED"  # Delisted by seller
