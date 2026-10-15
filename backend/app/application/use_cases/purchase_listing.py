"""
Use Case : Achat d'une carte sur le marketplace (Purchase / Order).
Garantit la cohérence entre les 3 systèmes NoSQL :
1. MongoDB : Mise à jour de l'état de l'annonce (ACTIVE -> SOLD) et création de la Commande
2. Elasticsearch : Mise à jour du statut dans l'index de recherche
3. Redis : Décrémentation du compteur d'annonces actives, incrémentation du volume des ventes
"""

from dataclasses import dataclass

from app.domain.entities.order import Order
from app.domain.exceptions import ListingNotFoundError
from app.domain.repositories.cache_repository import CacheRepository
from app.domain.repositories.listing_repository import ListingRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.search_repository import SearchRepository


@dataclass
class PurchaseListingCommand:
    listing_id: str
    buyer_name: str


class PurchaseListingUseCase:
    def __init__(
        self,
        listing_repo: ListingRepository,
        order_repo: OrderRepository,
        search_repo: SearchRepository,
        cache_repo: CacheRepository,
    ):
        self.listing_repo = listing_repo
        self.order_repo = order_repo
        self.search_repo = search_repo
        self.cache_repo = cache_repo

    async def execute(self, command: PurchaseListingCommand) -> Order:
        # 1. Vérification de l'annonce
        listing = await self.listing_repo.get_by_id(command.listing_id)
        if not listing:
            raise ListingNotFoundError(command.listing_id)

        # 2. Transition d'état métier (lève ListingAlreadySoldError si déjà vendue)
        listing.mark_as_sold(command.buyer_name)

        # 3. Création de l'entité commande d'achat
        order = Order.create(
            listing_id=listing.id,
            card_id=listing.card_id,
            card_name=listing.card_name,
            price=listing.price,
            seller_name=listing.seller_name,
            buyer_name=command.buyer_name,
        )

        # --- PERSISTANCE MULTI-SYSTÈMES NOSQL ---

        # 1. MongoDB : Mise à jour annonce + insertion commande
        await self.listing_repo.save(listing)
        await self.order_repo.save(order)

        # 2. Elasticsearch : Ré-indexation avec statut SOLD
        await self.search_repo.index_listing(listing)

        # 3. Redis : Métriques d'activité et audit
        await self.cache_repo.increment_counter("stats:active_listings", -1)
        await self.cache_repo.increment_counter("stats:total_sales_count", 1)
        await self.cache_repo.increment_float_counter("stats:total_sales_volume", listing.price)
        await self.cache_repo.push_recent_item("orders:recent_ids", order.id, max_items=25)
        await self.cache_repo.delete("cache:marketplace:recent")

        return order
