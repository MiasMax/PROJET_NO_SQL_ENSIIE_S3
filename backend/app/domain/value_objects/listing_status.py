"""
Statuts possibles d'une annonce dans le cycle de vie du marketplace.
"""
from enum import Enum


class ListingStatus(str, Enum):
    ACTIVE = "ACTIVE"          # En ligne, disponible à l'achat
    RESERVED = "RESERVED"      # Panier en cours / verrou temporaire Redis
    SOLD = "SOLD"              # Vendue et confirmée
    CANCELLED = "CANCELLED"    # Retirée par le vendeur
