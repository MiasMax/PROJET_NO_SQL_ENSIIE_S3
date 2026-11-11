import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';
import { useConfirm } from './ConfirmContext';
import { formatPrice, isSameSeller } from '../utils/format';
import { generateCardSlug } from '../utils/slug';
import { saveMarketplaceScroll, clearSavedMarketplaceScroll } from '../utils/scrollRestoration';

const MarketplaceContext = createContext(null);

export function MarketplaceProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, favorites, isCardInFavorites, handleBalanceUpdated, openLogin } = useAuth();
  const { clearCart, syncWithListings } = useCart();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const [listings, setListings] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const catalogLoadedRef = useRef(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [cacheMetrics, setCacheMetrics] = useState({ hit: false, timeMs: 0, source: 'elasticsearch' });

  const [searchQuery, setSearchQuery] = useState(() => initialParams.get('q') || '');
  const [selectedSet, setSelectedSet] = useState(() => initialParams.get('set') || '');
  const [selectedCondition, setSelectedCondition] = useState(() => initialParams.get('condition') || '');
  const [sortBy, setSortBy] = useState(() => initialParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(() => initialParams.get('sort_order') || 'desc');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(() => initialParams.get('favorites') === 'true');

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellInitialCardId, setSellInitialCardId] = useState(null);
  const [selectedListingForBuy, setSelectedListingForBuy] = useState(null);
  const [isBoosterOpen, setIsBoosterOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Clear favorites filter when user signs out
  useEffect(() => {
    if (!currentUser) {
      setShowOnlyFavorites(false);
    }
  }, [currentUser]);

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      let url = `/api/listings?limit=1000&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (selectedSet) url += `&set_name=${encodeURIComponent(selectedSet)}`;
      if (selectedCondition) url += `&condition=${encodeURIComponent(selectedCondition)}`;

      const requests = [fetch(url)];
      if (!catalogLoadedRef.current) {
        requests.push(fetch('/api/cards?limit=3000'));
      }

      const [resListings, resCards] = await Promise.all(requests);

      if (resListings && resListings.ok) {
        const data = await resListings.json();
        const rawItems = data.items || [];
        const seenIds = new Set();
        const uniqueItems = rawItems.filter((item) => {
          if (!item.id || seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });
        setListings(uniqueItems);
        setCacheMetrics({
          hit: Boolean(data.cache_hit),
          timeMs: data.response_time_ms || 1.2,
          source: data.source || 'elasticsearch',
        });
      }

      if (resCards && resCards.ok) {
        const cards = await resCards.json();
        if (Array.isArray(cards) && cards.length > 0) {
          catalogLoadedRef.current = true;
          setCatalogCards(cards);
        } else {
          setCatalogCards(cards || []);
        }
      }
    } catch (e) {
      console.error('Failed to load PokéVinted data:', e);
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  }, [searchQuery, selectedSet, selectedCondition, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync URL query params -> state
  useEffect(() => {
    if (location.pathname !== '/') return;
    const params = new URLSearchParams(location.search);
    const urlSet = params.get('set') || '';
    const urlQ = params.get('q') || '';
    const urlCondition = params.get('condition') || '';
    const urlSortBy = params.get('sort_by') || 'created_at';
    const urlSortOrder = params.get('sort_order') || 'desc';
    const urlFavs = params.get('favorites') === 'true';

    setSelectedSet((prev) => (prev !== urlSet ? urlSet : prev));
    setSearchQuery((prev) => (prev !== urlQ ? urlQ : prev));
    setSelectedCondition((prev) => (prev !== urlCondition ? urlCondition : prev));
    setSortBy((prev) => (prev !== urlSortBy ? urlSortBy : prev));
    setSortOrder((prev) => (prev !== urlSortOrder ? urlSortOrder : prev));
    setShowOnlyFavorites((prev) => (prev !== urlFavs ? urlFavs : prev));
  }, [location.pathname, location.search]);

  // Sync state -> URL query params
  useEffect(() => {
    if (location.pathname !== '/') return;
    const params = new URLSearchParams();
    if (showOnlyFavorites) params.set('favorites', 'true');
    if (searchQuery) params.set('q', searchQuery);
    if (selectedSet) params.set('set', selectedSet);
    if (selectedCondition) params.set('condition', selectedCondition);
    if (sortBy && sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder && sortOrder !== 'desc') params.set('sort_order', sortOrder);

    const queryStr = params.toString();
    const newRelativePath = queryStr ? `/?${queryStr}` : '/';
    if (window.location.search !== (queryStr ? `?${queryStr}` : '')) {
      window.history.replaceState(null, '', newRelativePath);
    }
  }, [location.pathname, showOnlyFavorites, searchQuery, selectedSet, selectedCondition, sortBy, sortOrder]);

  useEffect(() => {
    syncWithListings(listings);
  }, [listings, syncWithListings]);

  const favoriteListings = useMemo(
    () => listings.filter((l) => isCardInFavorites(l)),
    [listings, isCardInFavorites]
  );
  const favoriteListingsCount = favoriteListings.length;
  const displayedListings = showOnlyFavorites ? favoriteListings : listings;
  const hasActiveFilters = Boolean(searchQuery || selectedSet || selectedCondition || showOnlyFavorites);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedSet('');
    setSelectedCondition('');
    setShowOnlyFavorites(false);
  }, []);

  const handleSearchChange = useCallback(
    (val) => {
      setSearchQuery(val);
      if (location.pathname !== '/') {
        navigate(val ? `/?q=${encodeURIComponent(val)}` : '/');
      }
    },
    [location.pathname, navigate]
  );

  const handleCardSelected = useCallback(
    (item) => {
      if (!item) return;
      const cardId = item.card_id || item.id;
      const slug = generateCardSlug(item);
      const matchingListing = item.seller_name
        ? item
        : listings.find((l) => l.card_id === cardId || l.id === cardId) || null;
      saveMarketplaceScroll({ listing: matchingListing || item });
      navigate(`/card/${slug}`, { state: { listing: matchingListing } });
    },
    [listings, navigate]
  );

  const handleQuickBuy = useCallback(
    (item) => {
      if (!currentUser) {
        showToast('Connectez-vous pour acheter cette carte.', 'info');
        openLogin();
        return;
      }
      if (isSameSeller(currentUser, item?.seller_name)) {
        showToast('Vous ne pouvez pas acheter votre propre annonce.', 'error');
        return;
      }
      setSelectedListingForBuy(item);
    },
    [currentUser, openLogin, showToast]
  );

  const handleBuyFromChat = useCallback(
    (listingId, price) => {
      setIsChatOpen(false);
      const targetListing = listings.find((l) => l.id === listingId);
      if (targetListing) {
        handleQuickBuy(price ? { ...targetListing, price: Number(price) } : targetListing);
      } else if (listingId) {
        navigate(`/listing/${listingId}`);
      }
    },
    [listings, handleQuickBuy, navigate]
  );

  const handleOpenSell = useCallback(
    (cardId) => {
      if (!currentUser) {
        showToast('Connectez-vous pour mettre une carte en vente.', 'info');
        openLogin();
        return;
      }
      setSellInitialCardId(typeof cardId === 'string' ? cardId : null);
      setIsSellModalOpen(true);
    },
    [currentUser, openLogin, showToast]
  );

  const handleListingCreated = useCallback(
    (newListing) => {
      setListings((prev) => {
        if (prev.some((l) => l.id === newListing.id)) return prev;
        return [newListing, ...prev];
      });
      showToast(`Annonce « ${newListing.card_name} » publiée.`, 'success');
    },
    [showToast]
  );

  const handlePurchaseComplete = useCallback(
    (order, listingId) => {
      setListings((prev) =>
        prev.map((item) =>
          item.id === listingId ? { ...item, status: 'SOLD', buyer_name: order.buyer_name } : item
        )
      );
      if (order.buyer_balance !== undefined && order.buyer_balance !== null) {
        handleBalanceUpdated(order.buyer_balance);
      }
      clearCart();
      showToast(`Achat confirmé : ${order.card_name} (${formatPrice(order.price)}).`, 'success');
    },
    [handleBalanceUpdated, clearCart, showToast]
  );

  const handleBatchPurchaseComplete = useCallback(
    (checkoutData) => {
      const soldIds = new Set(checkoutData.orders.map((o) => o.listing_id));
      setListings((prev) =>
        prev.map((item) =>
          soldIds.has(item.id)
            ? { ...item, status: 'SOLD', buyer_name: checkoutData.buyer_name }
            : item
        )
      );
      if (checkoutData.buyer_balance !== undefined && checkoutData.buyer_balance !== null) {
        handleBalanceUpdated(checkoutData.buyer_balance);
      }
      showToast(
        `Commande validée : ${checkoutData.item_count} carte(s) pour ${formatPrice(checkoutData.total_amount)}.`,
        'success'
      );
    },
    [handleBalanceUpdated, showToast]
  );

  const requestDeleteListing = useCallback(
    async (listing) => {
      if (!currentUser?.is_admin || !listing?.id) return false;
      const ok = await confirm({
        title: 'Supprimer cette annonce',
        description:
          "Cette opération supprime définitivement l'offre du catalogue, de l'index de recherche et du cache.",
        details: [
          { label: 'Carte', value: listing.card_name },
          { label: 'Vendeur', value: listing.seller_name },
          { label: 'Prix', value: formatPrice(listing.price) },
        ],
        confirmLabel: 'Supprimer définitivement',
        cancelLabel: 'Conserver',
        tone: 'danger',
      });
      if (!ok) return false;

      try {
        const token = localStorage.getItem('pokevinted_token');
        const res = await fetch(`/api/admin/listings/${listing.id}`, {
          method: 'DELETE',
          headers: token ? { 'x-session-token': token } : {},
        });
        if (res.ok) {
          setListings((prev) => prev.filter((item) => item.id !== listing.id));
          showToast(`Annonce « ${listing.card_name} » supprimée.`, 'success');
          fetchData();
          return true;
        }
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Échec de la suppression de l'annonce.", 'error');
        return false;
      } catch {
        showToast('Erreur réseau lors de la suppression.', 'error');
        return false;
      }
    },
    [currentUser, confirm, showToast, fetchData]
  );

  const handleLogoClick = useCallback(() => {
    clearSavedMarketplaceScroll();
    navigate('/');
    handleResetFilters();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [navigate, handleResetFilters]);

  const handleNavbarFavoritesClick = useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/?favorites=true');
      setShowOnlyFavorites(true);
      setSelectedSet('');
      setSearchQuery('');
    } else {
      const nextVal = !showOnlyFavorites;
      setShowOnlyFavorites(nextVal);
      if (nextVal) {
        setSelectedSet('');
        setSearchQuery('');
      }
    }
  }, [location.pathname, navigate, showOnlyFavorites]);

  return (
    <MarketplaceContext.Provider
      value={{
        listings,
        catalogCards,
        displayedListings,
        favoriteListingsCount,
        isInitialLoading,
        isFetching,
        cacheMetrics,
        searchQuery,
        setSearchQuery,
        selectedSet,
        setSelectedSet,
        selectedCondition,
        setSelectedCondition,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        showOnlyFavorites,
        setShowOnlyFavorites,
        hasActiveFilters,
        fetchData,
        handleResetFilters,
        handleSearchChange,
        handleCardSelected,
        handleQuickBuy,
        handleBuyFromChat,
        handleOpenSell,
        handleListingCreated,
        handlePurchaseComplete,
        handleBatchPurchaseComplete,
        requestDeleteListing,
        handleLogoClick,
        handleNavbarFavoritesClick,
        isSellModalOpen,
        setIsSellModalOpen,
        sellInitialCardId,
        setSellInitialCardId,
        selectedListingForBuy,
        setSelectedListingForBuy,
        isBoosterOpen,
        setIsBoosterOpen,
        isChatOpen,
        setIsChatOpen,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return ctx;
}

