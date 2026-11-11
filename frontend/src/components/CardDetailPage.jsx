import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { matchSlugWithCard, generateCardSlug } from '../utils/slug';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useToast } from '../context/ToastContext';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import CardInspectionStage from './card-detail/CardInspectionStage';
import CardSpecsPanel from './card-detail/CardSpecsPanel';
import ChatPanel from './ChatPanel';
import EditListingPriceModal from './EditListingPriceModal';

const PriceChartModal = lazy(() => import('./PriceChartModal'));

export default function CardDetailPage({
  currentUser: propUser,
  favorites: propFavorites,
  onToggleFavorite: propToggleFav,
  onInitiateBuy: propInitiateBuy,
  onDeleteListing: propDeleteListing,
  showToast: propShowToast,
  catalogCards: propCatalogCards,
}) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const auth = useAuth();
  const cart = useCart();
  const marketplace = useMarketplace();
  const toastCtx = useToast();

  const currentUser = propUser !== undefined ? propUser : auth.currentUser;
  const favorites = propFavorites || auth.favorites;
  const onToggleFavorite = propToggleFav || auth.handleToggleFavorite;
  const onInitiateBuy = propInitiateBuy || marketplace.handleQuickBuy;
  const requestDeleteListing = propDeleteListing || marketplace.requestDeleteListing;
  const showToast = propShowToast || toastCtx.showToast;
  const catalogCards = propCatalogCards?.length ? propCatalogCards : marketplace.catalogCards;

  const orderData = location.state?.order || null;
  const prevTrackedListingIdRef = useRef(null);
  const catalogCardsRef = useRef(catalogCards);
  catalogCardsRef.current = catalogCards;

  const [item, setItem] = useState(location.state?.listing || null);
  const [cardDetails, setCardDetails] = useState(null);
  const [otherOffers, setOtherOffers] = useState([]);
  const [loading, setLoading] = useState(!location.state?.listing);
  const [notFound, setNotFound] = useState(false);

  const [simulatedCondition, setSimulatedCondition] = useState(
    location.state?.listing?.condition || 'NEAR_MINT'
  );
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);

  // Scroll to top when opening a card detail route
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id]);

  // Resolve listing + catalog card metadata + alternative offers cleanly
  useEffect(() => {
    let active = true;
    const stateListing = location.state?.listing || null;
    const stateOrder = location.state?.order || null;

    if (stateListing) {
      setItem(stateListing);
      setSimulatedCondition(stateListing.condition || 'NEAR_MINT');
      setLoading(false);
    } else {
      setLoading(true);
    }
    setNotFound(false);

    async function loadDetail() {
      try {
        let currentListing = stateListing ? { ...stateListing } : null;
        let cardIdToFetch = currentListing?.card_id || currentListing?.id || id;

        // 1. Direct listing lookup from MongoDB if we have a listing UUID/ID
        const targetListingId =
          stateListing?.id || (id && !id.startsWith('sv') && !location.pathname.startsWith('/card/') ? id : null);
        if (targetListingId) {
          try {
            const resListing = await fetch(`/api/listings/${encodeURIComponent(targetListingId)}`);
            if (resListing.ok) {
              const fullListing = await resListing.json();
              currentListing = { ...(stateListing || {}), ...fullListing };
              cardIdToFetch = currentListing.card_id || cardIdToFetch;
            }
          } catch {
            // Proceed to fallback lookup below
          }
        }

        // Also check direct /api/listings/{id} if not resolved yet
        if (!currentListing && id) {
          try {
            const resListing = await fetch(`/api/listings/${encodeURIComponent(id)}`);
            if (resListing.ok) {
              const fullListing = await resListing.json();
              currentListing = fullListing;
              cardIdToFetch = currentListing.card_id || cardIdToFetch;
            }
          } catch {
            // Proceed
          }
        }

        // 2. Fetch active listings + catalog fallback (reuse context catalogCards when already loaded)
        let allListings = [];
        let allCards = Array.isArray(catalogCardsRef.current) ? catalogCardsRef.current : [];
        try {
          const needCards = allCards.length === 0;
          const requests = [fetch('/api/listings?limit=1000')];
          if (needCards) requests.push(fetch('/api/cards?limit=2500'));
          const [listingsRes, cardsRes] = await Promise.all(requests);

          if (listingsRes && listingsRes.ok) {
            const listingsPayload = await listingsRes.json();
            allListings = Array.isArray(listingsPayload)
              ? listingsPayload
              : listingsPayload?.items || [];
          }
          if (needCards && cardsRes && cardsRes.ok) {
            const cardsPayload = await cardsRes.json();
            allCards = Array.isArray(cardsPayload) ? cardsPayload : [];
          }
        } catch {
          // Proceed with what we already have
        }

        // 3. Resolve slug / card_id against marketplace listings or official catalog
        if (!currentListing) {
          const activeMatch = allListings.find(
            (l) =>
              (l.card_id === id || l.id === id || matchSlugWithCard(id, l)) &&
              l.status !== 'SOLD'
          );
          if (activeMatch) {
            currentListing = activeMatch;
            cardIdToFetch = currentListing.card_id;
          } else {
            const foundCard = allCards.find((c) => c.id === id || matchSlugWithCard(id, c));
            if (foundCard) {
              cardIdToFetch = foundCard.id;
            }
          }
        }

        // 4. Fetch official reference card details from MongoDB
        let currentCard = null;
        if (cardIdToFetch) {
          try {
            const resCard = await fetch(`/api/cards/${encodeURIComponent(cardIdToFetch)}`);
            if (resCard.ok) {
              currentCard = await resCard.json();
            } else {
              currentCard =
                allCards.find((c) => c.id === cardIdToFetch || matchSlugWithCard(cardIdToFetch, c)) ||
                null;
            }
          } catch {
            currentCard =
              allCards.find((c) => c.id === cardIdToFetch || matchSlugWithCard(cardIdToFetch, c)) ||
              null;
          }
        }

        // 5. Find alternative active offers for the same card
        const altOffers = allListings
          .filter(
            (l) =>
              (l.card_id === cardIdToFetch || l.id === cardIdToFetch) &&
              l.id !== currentListing?.id &&
              l.status !== 'SOLD'
          )
          .sort((a, b) => Number(a.price) - Number(b.price));

        // 6. Synthesize listing view for order archives or catalog-only cards
        if (!currentListing && currentCard) {
          if (stateOrder || stateListing) {
            const st = stateListing || stateOrder;
            currentListing = {
              id: st.id || st.listing_id || null,
              card_id: currentCard.id,
              card_name: currentCard.name,
              set_name: currentCard.set_name,
              number: currentCard.number,
              rarity: currentCard.rarity,
              image_url: currentCard.image_large || currentCard.image_small,
              price: st.price || currentCard.market_price || 29.99,
              condition: st.condition || 'NEAR_MINT',
              seller_name: st.seller_name || 'Vendeur PokéVinted',
              buyer_name: st.buyer_name,
              description: `Carte acquise lors de votre commande passée auprès de ${st.seller_name || 'la communauté'}.`,
              status: 'SOLD',
              isCatalogReference: false,
              created_at: st.created_at || st.timestamp || currentCard.created_at,
            };
          } else if (altOffers.length > 0) {
            currentListing = altOffers[0];
          } else {
            currentListing = {
              id: null,
              card_id: currentCard.id,
              card_name: currentCard.name,
              set_name: currentCard.set_name,
              number: currentCard.number,
              rarity: currentCard.rarity,
              image_url: currentCard.image_large || currentCard.image_small,
              price: currentCard.market_price || 29.99,
              condition: 'NEAR_MINT',
              seller_name: 'Catalogue PokéVinted',
              description:
                currentCard.flavor_text ||
                'Carte de référence du catalogue officiel PokéVinted. Aucune offre en vente pour le moment.',
              status: 'OUT_OF_STOCK',
              isCatalogReference: true,
              created_at: currentCard.created_at,
            };
          }
        }

        if (!active) return;

        if (!currentListing && !currentCard) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setItem(currentListing);
        setCardDetails(currentCard);
        setSimulatedCondition(currentListing?.condition || 'NEAR_MINT');
        setOtherOffers(altOffers.filter((o) => o.id !== currentListing?.id));
        setNotFound(false);
        setLoading(false);

        const trackListingId = currentListing?.id;
        if (
          trackListingId &&
          !currentListing?.isCatalogReference &&
          !stateOrder &&
          prevTrackedListingIdRef.current !== trackListingId
        ) {
          prevTrackedListingIdRef.current = trackListingId;
          fetch(`/api/listings/${encodeURIComponent(trackListingId)}/view`, {
            method: 'POST',
          }).catch(() => {});
        }
      } catch {
        if (active) {
          setNotFound(true);
          setLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [id, location.pathname, location.state?.listing?.id, location.state?.listing?.card_id, location.state?.order?.listing_id]);

  // Sync listing status & price with MarketplaceContext
  useEffect(() => {
    if (!item?.id || !marketplace.listings?.length) return;
    const updated = marketplace.listings.find((l) => l.id === item.id);
    if (updated && (updated.status !== item.status || updated.price !== item.price)) {
      setItem(updated);
    }
  }, [marketplace.listings, item?.id, item?.status, item?.price]);

  const cardId = item?.card_id || cardDetails?.id;
  const isFav = Boolean(item?.id && !item?.isCatalogReference && favorites?.has(item.id));
  const isInCart = Boolean(item?.id && cart.isInCart(item.id));
  const isSold = item?.status === 'SOLD' || Boolean(orderData);

  const handleToggleCart = () => {
    if (!item || !item.id) return;
    if (isInCart) {
      cart.removeFromCart(item.id);
      showToast('Carte retirée du panier.', 'info');
    } else {
      cart.addToCart(item);
      showToast('Carte ajoutée au panier.', 'success');
    }
  };

  const handleAdminDelete = async () => {
    if (!item?.id) return;
    const deleted = await requestDeleteListing(item);
    if (deleted) {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
          <div className="lg:col-span-5 h-[520px] bg-neo-surface border-[1.5px] border-neo-border rounded-[8px]" />
          <div className="lg:col-span-7 h-[520px] bg-neo-surface border-[1.5px] border-neo-border rounded-[8px]" />
        </div>
      </main>
    );
  }

  if (notFound || !item) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-[8px] bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] flex items-center justify-center mx-auto">
          <AlertCircle size={22} aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold text-neo-ink">Annonce introuvable</h1>
        <p className="text-sm text-neo-ink-3">
          Cette carte n&apos;existe plus ou l&apos;annonce a été retirée du marché.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Retour au catalogue
        </Button>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Retour</span>
        </Button>
        <span className="text-xs font-mono text-neo-ink-3 truncate">
          {item.set_name} · #{item.number || cardDetails?.number || '--'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <CardInspectionStage
            item={item}
            simulatedCondition={simulatedCondition}
            onSimulatedConditionChange={setSimulatedCondition}
            isSold={isSold}
            isOrderView={Boolean(orderData)}
          />
        </div>

        <div className="lg:col-span-7">
          <CardSpecsPanel
            item={item}
            cardDetails={cardDetails}
            orderData={orderData}
            simulatedCondition={simulatedCondition}
            otherOffers={otherOffers}
            currentUser={currentUser}
            isFav={isFav}
            isInCart={isInCart}
            onToggleFavorite={() => {
              if (!item?.id || item.isCatalogReference) {
                showToast('Les favoris suivent les annonces actives.', 'info');
                return;
              }
              onToggleFavorite(item.id);
            }}
            onInitiateBuy={onInitiateBuy}
            onToggleCart={handleToggleCart}
            onOpenChat={() => {
              if (!currentUser) {
                showToast('Connectez-vous pour négocier avec le vendeur.', 'info');
                auth.openLogin();
                return;
              }
              setIsChatOpen(true);
            }}
            onOpenPriceChart={() => setIsChartOpen(true)}
            onOpenSell={(cId) => marketplace.handleOpenSell(cId)}
            onOpenEditPrice={() => setIsEditPriceOpen(true)}
            onAdminDelete={handleAdminDelete}
            onSelectOffer={(offer) =>
              navigate(`/card/${generateCardSlug(offer)}`, { state: { listing: offer } })
            }
          />
        </div>
      </div>

      {/* Price chart modal */}
      {isChartOpen && cardId && (
        <Suspense fallback={null}>
          <PriceChartModal
            cardId={cardId}
            cardName={item.card_name || cardDetails?.name}
            onClose={() => setIsChartOpen(false)}
          />
        </Suspense>
      )}

      {/* Price update modal */}
      <EditListingPriceModal
        isOpen={isEditPriceOpen}
        onClose={() => setIsEditPriceOpen(false)}
        listing={item}
        currentUser={currentUser}
        showToast={showToast}
        onSuccess={(updated) => {
          setItem((prev) => ({ ...prev, price: updated.price }));
          marketplace.fetchData();
        }}
      />

      {/* Chat negotiation drawer */}
      <Drawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        ariaLabel="Négociation avec le vendeur"
        widthClass="max-w-md"
      >
        <ChatPanel
          currentUser={currentUser}
          listings={marketplace.listings}
          listingId={item.id}
          sellerName={item.seller_name}
          listingPrice={item.price}
          cardName={item.card_name}
          cardImage={item.image_url}
          onClose={() => setIsChatOpen(false)}
          onBuyNow={(acceptedPrice) => {
            setIsChatOpen(false);
            onInitiateBuy({ ...item, price: Number(acceptedPrice) });
          }}
        />
      </Drawer>
    </main>
  );
}
