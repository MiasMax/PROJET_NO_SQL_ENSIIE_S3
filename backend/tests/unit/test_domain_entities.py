"""
Tests unitaires des entités du domaine métier (TDD).
Vérifie les invariants métier stricts sans dépendance aux bases de données.
"""

import pytest

from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.entities.order import Order
from app.domain.exceptions import InvalidPriceError, ListingAlreadySoldError
from app.domain.value_objects.card_condition import CardCondition
from app.domain.value_objects.listing_status import ListingStatus


def test_card_creation_and_serialization():
    card = Card(
        id="sv3pt5-006",
        name="Dracaufeu ex",
        supertype="Pokémon",
        subtypes=["Stage 2", "ex"],
        hp="330",
        types=["Fire"],
        set_id="sv3pt5",
        set_name="151",
        set_series="Scarlet & Violet",
        number="006",
        rarity="Double Rare",
        image_small="https://images.pokemontcg.io/sv3pt5/6.png",
        image_large="https://images.pokemontcg.io/sv3pt5/6_hires.png",
        market_price=45.50,
    )
    assert card.name == "Dracaufeu ex"
    data = card.to_dict()
    assert data["id"] == "sv3pt5-006"
    assert data["market_price"] == 45.50


def test_listing_factory_creation():
    listing = Listing.create(
        card_id="sv3pt5-006",
        card_name="Dracaufeu ex",
        set_name="151",
        rarity="Double Rare",
        image_url="https://images.pokemontcg.io/sv3pt5/6_hires.png",
        price=49.99,
        condition=CardCondition.NEAR_MINT,
        seller_name="Sacha",
        description="Parfait état, conservée sous double sleeve",
    )
    assert listing.id is not None
    assert listing.price == 49.99
    assert listing.status == ListingStatus.ACTIVE
    assert listing.seller_name == "Sacha"
    assert listing.buyer_name is None


def test_listing_rejects_negative_or_zero_price():
    with pytest.raises(InvalidPriceError):
        Listing.create(
            card_id="sv3pt5-006",
            card_name="Dracaufeu ex",
            set_name="151",
            rarity="Double Rare",
            image_url="https://images.pokemontcg.io/sv3pt5/6.png",
            price=0,
            condition=CardCondition.MINT,
            seller_name="Sacha",
        )

    with pytest.raises(InvalidPriceError):
        Listing.create(
            card_id="sv3pt5-006",
            card_name="Dracaufeu ex",
            set_name="151",
            rarity="Double Rare",
            image_url="https://images.pokemontcg.io/sv3pt5/6.png",
            price=-10.5,
            condition=CardCondition.MINT,
            seller_name="Sacha",
        )


def test_listing_rejects_empty_seller_name():
    with pytest.raises(ValueError):
        Listing.create(
            card_id="sv3pt5-006",
            card_name="Dracaufeu ex",
            set_name="151",
            rarity="Double Rare",
            image_url="https://images.pokemontcg.io/sv3pt5/6.png",
            price=15.0,
            condition=CardCondition.MINT,
            seller_name="   ",
        )


def test_listing_mark_as_sold_lifecycle():
    listing = Listing.create(
        card_id="sv3pt5-006",
        card_name="Dracaufeu ex",
        set_name="151",
        rarity="Double Rare",
        image_url="https://images.pokemontcg.io/sv3pt5/6.png",
        price=35.0,
        condition=CardCondition.EXCELLENT,
        seller_name="Ondine",
    )

    listing.mark_as_sold("Regis")
    assert listing.status == ListingStatus.SOLD
    assert listing.buyer_name == "Regis"
    assert listing.sold_at is not None

    # Tenter de revendre une annonce déjà vendue doit échouer
    with pytest.raises(ListingAlreadySoldError):
        listing.mark_as_sold("Pierre")


def test_order_creation():
    order = Order.create(
        listing_id="list-123",
        card_id="sv3pt5-006",
        card_name="Dracaufeu ex",
        price=45.0,
        seller_name="Ondine",
        buyer_name="Regis",
    )
    assert order.id is not None
    assert order.price == 45.0
    assert order.timestamp is not None
    assert order.to_dict()["buyer_name"] == "Regis"
