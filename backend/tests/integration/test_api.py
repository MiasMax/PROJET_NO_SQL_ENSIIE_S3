"""
Integration tests for FastAPI endpoints with dependency injection overrides.
Exercises the full lifecycle: Catalog -> Listing Publication -> Search -> Purchase -> Admin Stats.
"""



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

    res_search = client.get("/api/cards?search=Dracaufeu")
    assert res_search.status_code == 200
    search_cards = res_search.json()
    assert len(search_cards) > 0
    assert any(c["name"] == "Dracaufeu ex" for c in search_cards)


def test_complete_marketplace_flow(test_env):
    client = test_env["client"]
    listing_repo = test_env["listing_repo"]
    search_repo = test_env["search_repo"]
    cache_repo = test_env["cache_repo"]

    # 1. Step 1: Listing creation via form payload
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

    # Direct multi-system persistence checks:
    # a) Stored in MongoDB mock
    assert listing_id in listing_repo.listings
    # b) Indexed in Elasticsearch mock
    assert listing_id in search_repo.indexed
    # c) Atomic counters incremented in Redis mock
    assert cache_repo.counters["stats:active_listings"] == 1

    # 2. Step 2: Search and query execution
    search_res = client.get("/api/listings?q=Dracaufeu")
    assert search_res.status_code == 200
    search_items = search_res.json()["items"]
    assert any(i["id"] == listing_id for i in search_items)

    # 3. Step 3a: Attempt self-purchase (must fail with 400 Bad Request)
    self_buy_res = client.post(f"/api/listings/{listing_id}/purchase", json={"buyer_name": "Sacha"})
    assert self_buy_res.status_code == 400
    assert "propre annonce" in self_buy_res.json()["detail"]

    # 3. Step 3b: Purchase execution by another trainer
    buy_payload = {"buyer_name": "Regis"}
    buy_res = client.post(f"/api/listings/{listing_id}/purchase", json=buy_payload)
    assert buy_res.status_code == 200
    order_data = buy_res.json()
    assert order_data["price"] == 48.50
    assert order_data["buyer_name"] == "Regis"

    # Confirm the listing transitioned to SOLD
    assert listing_repo.listings[listing_id].status == "SOLD"
    assert cache_repo.counters["stats:active_listings"] == 0
    assert cache_repo.counters["stats:total_sales_count"] == 1

    # 4. Step 4: Admin NoSQL telemetry overview
    admin_res = client.get("/api/admin/stats")
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["summary"]["total_orders_completed"] == 1
    assert admin_data["summary"]["total_sales_volume_eur"] == 48.50
    assert len(admin_data["terminal_commands"]) == 3


def test_redis_sessions_and_favorites(test_env):
    client = test_env["client"]
    cache_repo = test_env["cache_repo"]

    # Default session check
    me_res = client.get("/api/users/me")
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["id"] == "sacha"

    # Switch session to Ondine
    switch_res = client.post("/api/users/switch", json={"user_id": "ondine"})
    assert switch_res.status_code == 200
    ondine = switch_res.json()
    assert ondine["id"] == "ondine"
    assert ondine["balance"] == 480.0

    # Add card to favorites set in Redis (SADD)
    fav_res = client.post("/api/users/favorites/sv3pt5-006?user_id=ondine")
    assert fav_res.status_code == 200
    assert fav_res.json()["is_favorite"] is True
    assert "sv3pt5-006" in cache_repo.favorites.get("ondine", set())

    # Retrieve favorites (SMEMBERS)
    get_favs = client.get("/api/users/favorites?user_id=ondine")
    assert get_favs.status_code == 200
    assert "sv3pt5-006" in get_favs.json()


def test_redis_trending_views(test_env):
    client = test_env["client"]

    # Increment view score in Redis Sorted Set (ZINCRBY)
    view_res = client.post("/api/cards/sv3pt5-006/view")
    assert view_res.status_code == 200

    # Fetch top trending ranking (ZREVRANGE)
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


def test_http_security_headers(test_env):
    client = test_env["client"]
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["x-xss-protection"] == "1; mode=block"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"


def test_special_regex_characters_search_handled_safely(test_env):
    client = test_env["client"]
    # Unclosed parentheses, braces, or glob stars must not trigger server 500 errors
    res = client.get("/api/cards?search=(([[*+?^$")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_user_registration_login_and_wallet_flow(test_env):
    client = test_env["client"]

    # 1. Register new member
    reg_res = client.post(
        "/api/users/register",
        json={
            "username": "red_pallet",
            "name": "Red du Mont Argenté",
            "email": "red@pallet.com",
            "password": "secret_password_123",
            "role": "Maître Pokémon",
            "balance": 200.0,
            "is_admin": False,
        },
    )
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["username"] == "red_pallet"
    assert reg_data["balance"] == 200.0
    token = reg_data["token"]
    assert token.startswith("sess_")

    # 2. Get profile with session token
    me_res = client.get("/api/users/me", headers={"x-session-token": token})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Red du Mont Argenté"

    # 3. Recharge wallet
    recharge_res = client.post(
        "/api/users/wallet/recharge",
        headers={"x-session-token": token},
        json={"amount": 50.0},
    )
    assert recharge_res.status_code == 200
    assert recharge_res.json()["new_balance"] == 250.0

    # 4. Login with credentials
    login_res = client.post(
        "/api/users/login",
        json={"username": "red_pallet", "password": "secret_password_123"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["token"] is not None

    # 5. Logout
    logout_res = client.post("/api/users/logout", headers={"x-session-token": token})
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "success"


def test_duplicate_purchase_prevention(test_env):
    client = test_env["client"]

    # Create listing
    create_res = client.post(
        "/api/listings",
        json={
            "card_id": "sv3pt5-006",
            "price": 40.0,
            "condition": "MINT",
            "seller_name": "Sacha",
            "description": "Carte Dracaufeu sous sleeve",
        },
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    # First purchase succeeds
    buy1 = client.post(
        f"/api/listings/{listing_id}/purchase",
        json={"buyer_name": "Ondine", "buyer_id": "ondine"},
    )
    assert buy1.status_code == 200

    # Second purchase must be rejected with 400 (already sold)
    buy2 = client.post(
        f"/api/listings/{listing_id}/purchase",
        json={"buyer_name": "Pierre", "buyer_id": "pierre"},
    )
    assert buy2.status_code == 400
    assert "déjà été vendue" in buy2.json()["detail"] or "already been sold" in buy2.json()["detail"].lower()


def test_trending_top_five_guarantee(test_env):
    """Ensure GET /api/cards/trending/top guarantees exactly 5 cards even when Redis is fresh."""
    client = test_env["client"]
    res = client.get("/api/cards/trending/top?limit=5")
    assert res.status_code == 200
    cards = res.json()
    assert len(cards) == 5
    # Verify card structures and view scores
    for card in cards:
        assert "id" in card
        assert "name" in card
        assert "views" in card
        assert card["views"] > 0


def test_card_id_alias_resolution(test_env):
    """Verify bidirectional alias resolution between sv3pt5-006 and sv03.5-006."""
    client = test_env["client"]

    res_modern = client.get("/api/cards/sv03.5-006")
    assert res_modern.status_code == 200
    assert res_modern.json()["name"] == "Dracaufeu ex"

    res_legacy = client.get("/api/cards/sv3pt5-006")
    assert res_legacy.status_code == 200
    assert res_legacy.json()["name"] == "Dracaufeu ex"


def test_trending_views_atomic_ranking(test_env):
    """Verify tracking multiple views dynamically elevates card rank in Redis ZSET."""
    client = test_env["client"]

    # View Mew (30th-B) 5 times
    for _ in range(5):
        view_res = client.post("/api/cards/30th-B/view")
        assert view_res.status_code == 200

    top_res = client.get("/api/cards/trending/top?limit=5")
    assert top_res.status_code == 200
    trending = top_res.json()
    assert len(trending) == 5

    mew_item = next((c for c in trending if c["id"] == "30th-B"), None)
    assert mew_item is not None
    assert mew_item["views"] >= 5


def test_get_my_listings_endpoint(test_env):
    """Verify authenticated or seller-filtered retrieval of user listings."""
    client = test_env["client"]

    # 1. Create a new listing under Pierre_Argenta
    create_res = client.post(
        "/api/listings",
        json={
            "card_id": "sv03.5-006",
            "price": 149.99,
            "condition": "MINT",
            "seller_name": "Pierre_Argenta",
            "description": "Dracaufeu ex authentique en vente.",
        },
    )
    assert create_res.status_code == 201

    # 2. Query user's listings
    res = client.get("/api/users/me/listings?seller_name=Pierre_Argenta")
    assert res.status_code == 200
    listings = res.json()
    assert isinstance(listings, list)
    assert len(listings) >= 1
    found = any(item["card_name"] == "Dracaufeu ex" and item["seller_name"] == "Pierre_Argenta" for item in listings)
    assert found is True


def test_booster_opening_simulation(test_env):
    """Verify booster pack opening generates 10 cards with realistic pull rates."""
    client = test_env["client"]

    res = client.post("/api/analytics/boosters/open")
    assert res.status_code == 200
    pack = res.json()
    assert pack["pack_count"] == 10
    assert len(pack["cards"]) == 10
    assert pack["total_estimated_value"] > 0
    assert "contains_hit" in pack

    # Verify each card has required attributes
    for c in pack["cards"]:
        assert "id" in c
        assert "name" in c
        assert "pull_rarity" in c
        assert "is_holo" in c
        assert "is_hit" in c

    # Hits are placed last for suspenseful reveal
    if pack["contains_hit"]:
        assert pack["cards"][-1]["is_hit"] is True


def test_booster_series_and_set_filtering(test_env):
    """Verify booster series listing and strict set-isolated pack generation."""
    client = test_env["client"]

    # 1. Fetch available series
    res_series = client.get("/api/analytics/boosters/series")
    assert res_series.status_code == 200
    series_list = res_series.json()
    assert len(series_list) >= 6
    names = [s["name"] for s in series_list]
    assert "151" in names
    assert any("Couronne" in n for n in names)

    # 2. Open pack strictly for 151
    res_pack = client.post("/api/analytics/boosters/open?set_id=sv03.5")
    assert res_pack.status_code == 200
    pack = res_pack.json()
    assert pack["pack_count"] == 10
    assert pack["set_name"] == "151"
    assert pack["series_info"]["id"] == "sv03.5"
    assert len(pack["cards"]) == 10

    # Ensure no duplicates in the pack
    card_ids = [c["id"] for c in pack["cards"]]
    assert len(set(card_ids)) == 10

    # All cards must belong to 151
    for c in pack["cards"]:
        assert c["set_name"] == "151"
        assert "slot_number" in c
        assert "hit_tier" in c


def test_price_history_endpoint(test_env):
    """Verify price history endpoint returns time-series data points."""
    client = test_env["client"]

    res = client.get("/api/analytics/cards/sv03.5-006/price-history?days=14")
    assert res.status_code == 200
    data = res.json()
    assert data["card_id"] == "sv03.5-006"
    assert "data" in data
    assert len(data["data"]) > 0
    for point in data["data"]:
        assert "date" in point
        assert "avg_price" in point
        assert point["avg_price"] > 0


def test_messaging_flow(test_env):
    """Verify sending message, negotiation offer, thread retrieval and conversation list."""
    client = test_env["client"]

    # 1. Send initial chat message
    send_res = client.post(
        "/api/messages",
        json={
            "listing_id": "test-list-1",
            "sender_name": "Sacha",
            "recipient_name": "Ondine",
            "content": "Bonjour ! La carte est toujours disponible ?",
        },
    )
    assert send_res.status_code == 201
    assert "id" in send_res.json()

    # 2. Send negotiation offer
    offer_res = client.post(
        "/api/messages",
        json={
            "listing_id": "test-list-1",
            "sender_name": "Sacha",
            "recipient_name": "Ondine",
            "content": "Je propose 35,00 € pour la carte.",
            "offer_price": 35.0,
            "offer_type": "offer",
        },
    )
    assert offer_res.status_code == 201

    # 3. Retrieve conversation thread
    thread_res = client.get(
        "/api/messages/thread?listing_id=test-list-1&user_a=Ondine&user_b=Sacha"
    )
    assert thread_res.status_code == 200
    messages = thread_res.json()["messages"]
    assert len(messages) >= 2
    assert any(m["offer_type"] == "offer" and m["offer_price"] == 35.0 for m in messages)

    # 4. List conversations for recipient
    convs_res = client.get("/api/messages/conversations?username=Ondine")
    assert convs_res.status_code == 200
    convs = convs_res.json()
    assert len(convs) >= 1
    assert any(c["listing_id"] == "test-list-1" for c in convs)


def test_messaging_unread_count(test_env):
    """Verify unread count endpoint returns non-negative integer for user."""
    client = test_env["client"]

    res = client.get("/api/messages/unread-count?username=Sacha")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "Sacha"
    assert isinstance(data["unread_total"], int)


def test_negotiated_offer_acceptance_and_purchase_flow(test_env):
    """
    End-to-end verification of buyer-seller offer negotiation:
    1. Seller creates listing for 50.00 €.
    2. Buyer proposes negotiated offer at 40.00 €.
    3. Seller accepts the offer via chat.
    4. Buyer executes checkout with agreed_price=40.00 €.
    5. Order confirms at 40.00 €, user balance is debited 40.00 €, listing is marked SOLD.
    """
    client = test_env["client"]
    cache_repo = test_env["cache_repo"]
    listing_repo = test_env["listing_repo"]

    # 1. Create listing by Ondine
    create_res = client.post(
        "/api/listings",
        json={
            "card_id": "sv3pt5-130",
            "card_name": "Léviator",
            "price": 50.00,
            "condition": "NEAR_MINT",
            "seller_name": "Ondine",
            "image_url": "https://images.pokemontcg.io/sv3pt5/130_hires.png",
        },
    )
    assert create_res.status_code == 201
    listing_id = create_res.json()["id"]

    # 2. Buyer (Sacha) sends an offer at 40.00 €
    offer_res = client.post(
        "/api/messages",
        json={
            "listing_id": listing_id,
            "sender_name": "Sacha",
            "recipient_name": "Ondine",
            "content": "Je propose 40,00 € pour Léviator.",
            "offer_price": 40.0,
            "offer_type": "offer",
        },
    )
    assert offer_res.status_code == 201
    assert "id" in offer_res.json()

    # 3. Seller (Ondine) accepts the offer
    accept_res = client.post(
        "/api/messages",
        json={
            "listing_id": listing_id,
            "sender_name": "Ondine",
            "recipient_name": "Sacha",
            "content": "J'accepte votre offre à 40.00 € !",
            "offer_price": 40.0,
            "offer_type": "accept",
        },
    )
    assert accept_res.status_code == 201
    assert "id" in accept_res.json()

    # Verify conversation thread contains the accepted offer
    thread_res = client.get(
        f"/api/messages/thread?listing_id={listing_id}&user_a=Sacha&user_b=Ondine"
    )
    assert thread_res.status_code == 200
    msgs = thread_res.json()["messages"]
    assert any(m["offer_type"] == "accept" and m["offer_price"] == 40.0 for m in msgs)

    # 4. Check initial balances
    users_before = {u["id"]: u for u in client.get("/api/users").json()}
    sacha_before = users_before["sacha"]
    ondine_before = users_before["ondine"]

    # 5. Buyer purchases with agreed_price=40.0
    purchase_res = client.post(
        f"/api/listings/{listing_id}/purchase",
        json={
            "buyer_name": "Sacha",
            "buyer_id": "sacha",
            "agreed_price": 40.0,
        },
    )
    assert purchase_res.status_code == 200
    order = purchase_res.json()

    # Verify effective price is 40.00 € (not 50.00 €)
    assert order["price"] == 40.0
    assert order["buyer_name"] == "Sacha"
    assert order["seller_name"] == "Ondine"

    # Verify listing is now SOLD and Redis counter updated
    assert listing_repo.listings[listing_id].status == "SOLD"
    assert cache_repo.counters["stats:total_sales_count"] == 1

    # Verify buyer balance was debited exactly 40.00 €
    users_after = {u["id"]: u for u in client.get("/api/users").json()}
    sacha_after = users_after["sacha"]
    ondine_after = users_after["ondine"]
    assert round(sacha_before["balance"] - sacha_after["balance"], 2) == 40.0
    assert round(ondine_after["balance"] - ondine_before["balance"], 2) == 40.0

    # Verify second purchase fails
    dup_res = client.post(
        f"/api/listings/{listing_id}/purchase",
        json={"buyer_name": "Pierre", "buyer_id": "pierre", "agreed_price": 40.0},
    )
    assert dup_res.status_code == 400


def test_cart_batch_checkout_multiple_cards(test_env):
    """
    Test atomic multi-card cart purchase:
    1. Seller (Ondine) puts 2 different cards in marketplace.
    2. Buyer (Sacha) adds both to cart and executes /api/listings/checkout.
    3. Both listings transition to SOLD, orders are recorded, balances adjusted.
    """
    client = test_env["client"]
    listing_repo = test_env["listing_repo"]
    cache_repo = test_env["cache_repo"]

    # 1. Create two listings
    res1 = client.post(
        "/api/listings",
        json={
            "card_id": "sv3pt5-001",
            "card_name": "Bulbizarre",
            "price": 20.00,
            "condition": "NEAR_MINT",
            "seller_name": "Ondine",
            "image_url": "https://images.pokemontcg.io/sv3pt5/1_hires.png",
        },
    )
    assert res1.status_code == 201
    lid1 = res1.json()["id"]

    res2 = client.post(
        "/api/listings",
        json={
            "card_id": "sv3pt5-002",
            "card_name": "Herbizarre",
            "price": 35.00,
            "condition": "MINT",
            "seller_name": "Ondine",
            "image_url": "https://images.pokemontcg.io/sv3pt5/2_hires.png",
        },
    )
    assert res2.status_code == 201
    lid2 = res2.json()["id"]

    # Check initial balances
    users_before = {u["id"]: u for u in client.get("/api/users").json()}
    sacha_before = users_before["sacha"]["balance"]
    ondine_before = users_before["ondine"]["balance"]

    # 2. Sacha checks out both cards
    checkout_res = client.post(
        "/api/listings/checkout",
        json={
            "listing_ids": [lid1, lid2],
            "buyer_name": "Sacha",
            "buyer_id": "sacha",
        },
    )
    assert checkout_res.status_code == 200
    data = checkout_res.json()

    assert data["total_amount"] == 55.00
    assert data["item_count"] == 2
    assert len(data["orders"]) == 2
    assert data["buyer_name"] == "Sacha"

    # Both listings must be SOLD
    assert listing_repo.listings[lid1].status == "SOLD"
    assert listing_repo.listings[lid2].status == "SOLD"

    # Balances must be debited/credited by 55.00 €
    users_after = {u["id"]: u for u in client.get("/api/users").json()}
    assert round(sacha_before - users_after["sacha"]["balance"], 2) == 55.00
    assert round(users_after["ondine"]["balance"] - ondine_before, 2) == 55.00

    # Redis telemetry checks
    assert cache_repo.counters["stats:total_sales_count"] >= 2
    assert cache_repo.counters["stats:total_sales_volume"] >= 55.00

    # Re-purchasing any already sold card in a cart must fail
    fail_res = client.post(
        "/api/listings/checkout",
        json={
            "listing_ids": [lid1],
            "buyer_name": "Pierre",
            "buyer_id": "pierre",
        },
    )
    assert fail_res.status_code == 400






