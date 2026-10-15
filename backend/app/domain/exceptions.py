"""
Exceptions du domaine métier PokéVinted.
Toutes les règles métier non respectées lèvent une exception explicite.
"""


class DomainException(Exception):
    """Exception de base pour les erreurs du domaine métier."""
    pass


class CardNotFoundError(DomainException):
    """Levée lorsqu'une carte de référence Pokémon n'existe pas dans le catalogue."""
    def __init__(self, card_id: str):
        super().__init__(f"Carte Pokémon introuvable avec l'ID : '{card_id}'")
        self.card_id = card_id


class ListingNotFoundError(DomainException):
    """Levée lorsqu'une annonce n'existe pas sur le marketplace."""
    def __init__(self, listing_id: str):
        super().__init__(f"Annonce introuvable avec l'ID : '{listing_id}'")
        self.listing_id = listing_id


class ListingAlreadySoldError(DomainException):
    """Levée lorsqu'un acheteur tente d'acheter une carte déjà vendue."""
    def __init__(self, listing_id: str):
        super().__init__(f"L'annonce '{listing_id}' a déjà été vendue")
        self.listing_id = listing_id


class InvalidPriceError(DomainException):
    """Levée lorsque le prix d'une annonce est négatif ou nul."""
    def __init__(self, price: float):
        super().__init__(f"Le prix de vente doit être strictement positif (reçu : {price} €)")
        self.price = price


class InvalidConditionError(DomainException):
    """Levée si l'état de la carte n'est pas reconnu."""
    def __init__(self, condition: str):
        super().__init__(f"État de carte invalide : '{condition}'")
        self.condition = condition
