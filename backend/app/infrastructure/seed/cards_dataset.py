"""
Official Pokémon reference cards dataset and seed catalog.
Ingests the complete, authentic French catalog of the 8 most recent Scarlet & Violet expansions
extracted directly from the official TCGdex API (~1,600 cards), and generates realistic marketplace listings.
"""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from app.domain.entities.card import Card
from app.domain.entities.listing import Listing
from app.domain.value_objects.card_condition import CardCondition

JSON_PATH = Path(__file__).resolve().parent / "tcgdex_recent_sets_catalog.json"


def _load_catalog() -> list[dict[str, Any]]:
    """Load the complete authentic catalog from disk."""
    if JSON_PATH.exists():
        try:
            with open(JSON_PATH, encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    return loaded
        except Exception:
            pass
    return []


RAW_CARDS: list[dict[str, Any]] = _load_catalog()


def get_default_catalog_cards() -> list[Card]:
    """Return all official reference cards domain entities (2,100+ cards)."""
    cards: list[Card] = []
    for c in RAW_CARDS:
        norm_name = c["name"].replace("-ex", " ex")
        img_s = c.get("image_small", "")
        img_l = c.get("image_large", "")
        if c["id"] == "30th-R":
            img_s = img_l = "/cards/mew_30th_r.jpg"
        elif c["id"] == "30th-G":
            img_s = img_l = "/cards/mew_30th_g.jpg"
        elif c["id"] == "30th-B":
            img_s = img_l = "/cards/mew_30th_b.jpg"

        cards.append(
            Card(
                id=c["id"],
                name=norm_name,
                supertype=c.get("supertype", "Pokémon"),
                subtypes=c.get("subtypes", ["Base"]),
                hp=c.get("hp"),
                types=c.get("types", []),
                set_id=c["set_id"],
                set_name=c["set_name"],
                set_series=c.get("set_series", "Écarlate et Violet"),
                number=str(c.get("number", "001")),
                rarity=c.get("rarity", "Commune"),
                image_small=img_s,
                image_large=img_l,
                market_price=float(c.get("market_price", 10.0)),
                illustrator=c.get("illustrator"),
            )
        )
        if c["id"] == "sv03.5-006":
            cards.append(
                Card(
                    id="sv3pt5-006",
                    name=norm_name,
                    supertype=c.get("supertype", "Pokémon"),
                    subtypes=c.get("subtypes", ["Base"]),
                    hp=c.get("hp"),
                    types=c.get("types", []),
                    set_id="sv3pt5",
                    set_name=c["set_name"],
                    set_series=c.get("set_series", "Écarlate et Violet"),
                    number=str(c.get("number", "001")),
                    rarity=c.get("rarity", "Commune"),
                    image_small=img_s,
                    image_large=img_l,
                    market_price=float(c.get("market_price", 10.0)),
                    illustrator=c.get("illustrator"),
                )
            )
    return cards


def get_initial_marketplace_listings() -> list[Listing]:
    """
    Generate realistic initial marketplace listings across all modern expansions.
    Features top chase cards, EX, Illustration Rares, and Gold Secret cards with deterministic IDs.
    """
    sellers = [
        "Sacha",
        "Ondine",
        "Pierre",
        "Cynthia",
        "Peter",
        "Aurore",
        "Leaf",
    ]
    conditions = [
        CardCondition.MINT,
        CardCondition.NEAR_MINT,
        CardCondition.EXCELLENT,
        CardCondition.GOOD,
        CardCondition.PLAYED,
    ]

    # Map cards by set for curated selection
    from collections import defaultdict

    cards_by_set: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for c in RAW_CARDS:
        cards_by_set[c["set_id"]].append(c)

    listings: list[Listing] = []
    base_time = datetime.now(UTC)

    for set_cards in cards_by_set.values():
        def card_priority(card: dict[str, Any]) -> int:
            score = 0
            name_lower = card.get("name", "").lower()
            rarity_lower = card.get("rarity", "").lower()
            price = float(card.get("market_price", 0.0))

            # Exclusive / Ultra High Rarities
            if "rgb" in rarity_lower:
                score += 350
            if "classic collection" in rarity_lower:
                score += 260
            if "illustration spéciale" in rarity_lower or "sar" in rarity_lower:
                score += 180
            if "futuristic" in rarity_lower:
                score += 150
            if "hyper rare" in rarity_lower or "gold" in rarity_lower:
                score += 140
            if "pikachu rare" in rarity_lower:
                score += 100
            if "illustration rare" in rarity_lower:
                score += 80
            if "double rare" in rarity_lower or "ultra rare" in rarity_lower:
                score += 60

            # Real EX Pokémon (avoid matching substrings in normal names like Kangourex or Ronflex)
            is_ex = (
                (
                    name_lower.endswith(" ex")
                    or name_lower.endswith("-ex")
                    or " ex " in name_lower
                    or "-ex " in name_lower
                    or any(s.lower() == "ex" for s in card.get("subtypes", []))
                )
                and rarity_lower not in ["commune", "peu commune"]
                and "classic collection" not in rarity_lower
            )

            if is_ex:
                score += 40

            if rarity_lower not in ["commune", "peu commune"]:
                score += min(int(price), 50)
            else:
                score = 0

            return score

        sorted_cards = sorted(
            set_cards,
            key=lambda c: (card_priority(c), float(c.get("market_price", 0.0))),
            reverse=True,
        )
        # Select all authentic hits (score >= 50) or top 8 if small set
        selected = [c for c in sorted_cards if card_priority(c) >= 50]
        if len(selected) < 8:
            selected = sorted_cards[: min(8, len(sorted_cards))]

        for rank, card in enumerate(selected):
            seller = sellers[(rank + len(listings)) % len(sellers)]
            if rank == 0:
                cond = CardCondition.MINT
            elif rank == 1:
                cond = CardCondition.NEAR_MINT
            elif rank == 2:
                cond = CardCondition.NEAR_MINT
            elif rank == 3:
                cond = CardCondition.MINT
            elif rank == 4:
                cond = CardCondition.NEAR_MINT
            else:
                cond = conditions[rank % len(conditions)]

            if cond == CardCondition.MINT:
                mult = 1.05
                desc = (
                    f"{card['name']} authentique ({card['set_name']}). "
                    f"État Mint pack-fresh (Gem 10), protégée immédiatement sous double sleeve et toploader."
                )
            elif cond == CardCondition.NEAR_MINT:
                mult = 0.95
                desc = (
                    f"{card['name']} authentique ({card['set_name']}). "
                    f"État Near Mint, infime micro-blanchiment sub-pixel sur la tranche supérieure."
                )
            elif cond == CardCondition.EXCELLENT:
                mult = 0.80
                desc = (
                    f"{card['name']} authentique ({card['set_name']}). "
                    f"État Excellent, légères traces de jeu sur bordures et micro-griffures superficielles."
                )
            elif cond == CardCondition.GOOD:
                mult = 0.60
                desc = (
                    f"{card['name']} authentique ({card['set_name']}). "
                    f"État Good, blanchiment visible le long du cadre et amorce de pliure d'angle."
                )
            else:  # CardCondition.PLAYED
                mult = 0.40
                desc = (
                    f"{card['name']} authentique ({card['set_name']}). "
                    f"État Played / Jouée, pliure traversante visible et coins tassés, idéale pour tournoi ou binder !"
                )

            base_p = max(float(card.get("market_price", 15.0)), 3.0)
            price = round(base_p * mult, 2)

            clean_id = card["id"].replace(".", "-").replace("/", "-")
            listing_id = f"seed-listing-{clean_id}"

            img_url = card.get("image_large") or card.get("image_small", "")
            if card["id"] == "30th-R":
                img_url = "/cards/mew_30th_r.jpg"
            elif card["id"] == "30th-G":
                img_url = "/cards/mew_30th_g.jpg"
            elif card["id"] == "30th-B":
                img_url = "/cards/mew_30th_b.jpg"

            # Top hit cards receive higher timestamps so they naturally appear first in default sort
            listing_created_at = (base_time - timedelta(minutes=rank * 2)).isoformat()

            listings.append(
                Listing.create(
                    listing_id=listing_id,
                    card_id=card["id"],
                    card_name=card["name"],
                    set_name=card["set_name"],
                    rarity=card.get("rarity", "Rare"),
                    image_url=img_url,
                    price=price,
                    condition=cond,
                    seller_name=seller,
                    description=desc,
                    created_at=listing_created_at,
                )
            )

            # For the top iconic cards of each set, also add a contrasting used/played offer
            # so buyers can directly compare Mint vs Played on the marketplace!
            if rank < 5:
                alt_cond = CardCondition.PLAYED if cond in (CardCondition.MINT, CardCondition.NEAR_MINT) else CardCondition.GOOD
                alt_seller = sellers[(len(listings) + 3) % len(sellers)]
                alt_mult = 0.40 if alt_cond == CardCondition.PLAYED else 0.60
                alt_price = round(base_p * alt_mult, 2)
                alt_desc = (
                    f"{card['name']} d'occasion ({card['set_name']}). "
                    f"État {alt_cond.value} (usure visible, pliure / bords blanchis), prix réduit pour collectionneur ou deck."
                )
                alt_time = (base_time - timedelta(minutes=(rank * 2) + 1)).isoformat()
                listings.append(
                    Listing.create(
                        listing_id=f"seed-listing-{clean_id}-{alt_cond.value.lower()}",
                        card_id=card["id"],
                        card_name=card["name"],
                        set_name=card["set_name"],
                        rarity=card.get("rarity", "Rare"),
                        image_url=img_url,
                        price=alt_price,
                        condition=alt_cond,
                        seller_name=alt_seller,
                        description=alt_desc,
                        created_at=alt_time,
                    )
                )


    return listings
