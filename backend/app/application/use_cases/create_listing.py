"""
Use Case : Création d'une annonce de vente (Listing).
Orchestre la persistance multi-systèmes exigée par le sujet :
1. MongoDB : Document complet persistant (source de vérité)
2. Elasticsearch : Indexation pour recherche floue et filtres facettés
3. Redis : Compteurs atomiques, flux des nouveautés et purge du cache
"""

from dataclasses import dataclass

from app.domain.entities.listing import Listing
from app.domain.exceptions import CardNotFoundError, InvalidConditionError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.card_repository import CardRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.search_repository import SearchRepository
from app.domain.value_objects.card_condition import CardCondition


@dataclass
class CreateListingCommand:
    card_id: str
    price: float
    condition: str
    seller_name: str
    description: str = ""
    custom_image_url: str | None = None


class CreateListingUseCase:
    def __init__(
        self,
        card_repo: CardRepository,
        listing_repo: ListingRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.card_repo = card_repo
        self.listing_repo = listing_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self, command: CreateListingCommand) -> Listing:
        # 1. Validation de l'existence de la carte dans le catalogue
        card = await self.card_repo.get_by_id(command.card_id)
        if not card:
            raise CardNotFoundError(command.card_id)

        # 2. Validation de l'état
        try:
            condition = CardCondition(command.condition.upper())
        except ValueError:
            raise InvalidConditionError(command.condition) from None

        # 3. Création de l'entité Listing (invariants vérifiés à l'instanciation)
        listing = Listing.create(
            card_id=card.id,
            card_name=card.name,
            set_name=card.set_name,
            rarity=card.rarity,
            image_url=card.image_large or card.image_small,
            price=command.price,
            condition=condition,
            seller_name=command.seller_name,
            description=command.description,
            custom_image_url=command.custom_image_url,
        )

        # --- PERSISTANCE MULTI-SYSTÈMES NOSQL ---

        # Système 1 : MongoDB (Enregistrement du document d'annonce)
        await self.listing_repo.save(listing)

        # Système 2 : Elasticsearch (Indexation textuelle synchrone)
        await self.search_repo.index_listing(listing)

        # Système 3 : Redis (Compteur temps réel, file des nouveautés et purge du cache)
        await self.cache_repo.increment_counter("stats:active_listings", 1)
        await self.cache_repo.increment_counter("stats:total_listings_created", 1)
        await self.cache_repo.push_recent_item("listings:recent_ids", listing.id, max_items=25)
        await self.cache_repo.delete("cache:marketplace:recent")

        return listing
