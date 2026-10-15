"""
Tests d'intégration des routes API FastAPI avec injection de dépendances.
Simule le cycle complet : Catalogue -> Publication d'annonce -> Recherche -> Achat -> Bilan Admin.
"""

import pytest
from starlette.testclient import TestClient

from app.infrastructure.seed.cards_dataset import get_default_catalog_cards
from app.interfaces.dependencies import (
    get_cache_repository,
    get_card_repository,
    get_listing_repository,
    get_order_repository,
    get_search_repository,
)
from app.main import app
from tests.unit.test_use_cases import (
    MockCacheRepository,
    MockCardRepository,
    MockListingRepository,
    MockOrderRepository,
    MockSearchRepository,
)


@pytest.fixture
def test_env():
    # Catalogue de départ
    cards = get_default_catalog_cards()
    card_repo = MockCardRepository(cards)
    listing_repo = MockListingRepository()
    search_repo = MockSearchRepository()
    cache_repo = MockCacheRepository()
    order_repo = MockOrderRepository()

    # Remplacement des dépendances de l'app par les mocks
    app.dependency_overrides[get_card_repository] = lambda: card_repo
    app.dependency_overrides[get_listing_repository] = lambda: listing_repo
    app.dependency_overrides[get_search_repository] = lambda: search_repo
    app.dependency_overrides[get_cache_repository] = lambda: cache_repo
    app.dependency_overrides[get_order_repository] = lambda: order_repo

    client = TestClient(app)
    yield {
        "client": client,
        "card_repo": card_repo,
        "listing_repo": listing_repo,
        "search_repo": search_repo,
        "cache_repo": cache_repo,
        "order_repo": order_repo,
    }

    app.dependency_overrides.clear()


def test_health_check(test_env):
    client = test_env["client"]
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_cards_catalog(test_env):
    client = test_env["client"]
    res = client.get("/api/cards")
    assert res.status_code == 200
    cards = res.json()
    assert len(cards) > 0
    assert any(c["name"] == "Dracaufeu ex" for c in cards)


def test_complete_marketplace_flow(test_env):
    client = test_env["client"]
    listing_repo = test_env["listing_repo"]
    search_repo = test_env["search_repo"]
    cache_repo = test_env["cache_repo"]

    # 1. Étape Formulaire : Création d'une annonce (Consigne principale NoSQL)
    create_payload = {
        "card_id": "sv3pt5-006",
        "price": 48.50,
        "condition": "NEAR_MINT",
        "seller_name": "Sacha",
        "description": "Dracaufeu 151 en parfait état avec toploader.",
    }
    create_res = client.post("/api/listings", json=create_payload)
    assert create_res.status_code == 201
    listing_data = create_res.json()
    listing_id = listing_data["id"]

    # Vérification multi-systèmes directe :
    # a) Présent dans MongoDB mock
    assert listing_id in listing_repo.listings
    # b) Présent dans Elasticsearch mock
    assert listing_id in search_repo.indexed
    # c) Compteurs incrémentés dans Redis mock
    assert cache_repo.counters["stats:active_listings"] == 1

    # 2. Étape Consultation & Recherche
    search_res = client.get("/api/listings?q=Dracaufeu")
    assert search_res.status_code == 200
    search_items = search_res.json()["items"]
    assert any(i["id"] == listing_id for i in search_items)

    # 3. Étape Achat
    buy_payload = {"buyer_name": "Regis"}
    buy_res = client.post(f"/api/listings/{listing_id}/purchase", json=buy_payload)
    assert buy_res.status_code == 200
    order_data = buy_res.json()
    assert order_data["price"] == 48.50
    assert order_data["buyer_name"] == "Regis"

    # Vérification que l'annonce est bien marquée vendue
    assert listing_repo.listings[listing_id].status == "SOLD"
    assert cache_repo.counters["stats:active_listings"] == 0
    assert cache_repo.counters["stats:total_sales_count"] == 1

    # 4. Étape Bilan Admin NoSQL
    admin_res = client.get("/api/admin/stats")
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["summary"]["total_orders_completed"] == 1
    assert admin_data["summary"]["total_sales_volume_eur"] == 48.50
    assert len(admin_data["terminal_commands"]) == 3


def test_redis_sessions_and_favorites(test_env):
    client = test_env["client"]
    cache_repo = test_env["cache_repo"]

    # Session par défaut
    me_res = client.get("/api/users/me")
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["id"] == "sacha"

    # Changement de session vers Ondine
    switch_res = client.post("/api/users/switch", json={"user_id": "ondine"})
    assert switch_res.status_code == 200
    ondine = switch_res.json()
    assert ondine["id"] == "ondine"
    assert ondine["balance"] == 480.0

    # Ajout d'une carte en favori dans Redis (SADD)
    fav_res = client.post("/api/users/favorites/sv3pt5-006?user_id=ondine")
    assert fav_res.status_code == 200
    assert fav_res.json()["is_favorite"] is True
    assert "sv3pt5-006" in cache_repo.favorites.get("ondine", set())

    # Consultation des favoris (SMEMBERS)
    get_favs = client.get("/api/users/favorites?user_id=ondine")
    assert get_favs.status_code == 200
    assert "sv3pt5-006" in get_favs.json()


def test_redis_trending_views(test_env):
    client = test_env["client"]

    # Incrémentation de vue dans Redis Sorted Set (ZINCRBY)
    view_res = client.post("/api/cards/sv3pt5-006/view")
    assert view_res.status_code == 200

    # Consultation du classement Top Trending (ZREVRANGE)
    top_res = client.get("/api/cards/trending/top")
    assert top_res.status_code == 200
    trending_cards = top_res.json()
    assert len(trending_cards) > 0
    assert trending_cards[0]["id"] == "sv3pt5-006"
    assert trending_cards[0]["views"] >= 1


def test_elasticsearch_aggregations(test_env):
    client = test_env["client"]
    res = client.get("/api/admin/aggregations")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "by_status" in data["aggregations"]
    assert "by_set" in data["aggregations"]
