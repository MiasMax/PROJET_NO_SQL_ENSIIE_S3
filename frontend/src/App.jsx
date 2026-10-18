import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Store,
  Sparkles,
  Heart,
  ShieldCheck,
  UserPlus,
  LogIn,
  LogOut,
  Wallet,
  ShoppingBag,
  User,
  X,
  ChevronDown,
  Tag,
  Package,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react';

import { useCart } from './context/CartContext';
import CartDrawer from './components/CartDrawer';
import { generateCardSlug } from './utils/slug';
import { saveMarketplaceScroll, clearSavedMarketplaceScroll } from './utils/scrollRestoration';
import MarketplaceView from './components/MarketplaceView';
import CardDetailPage from './components/CardDetailPage';
import UserProfilePage from './components/UserProfilePage';
import AdminDashboard from './components/AdminDashboard';
import SellCardModal from './components/SellCardModal';
import BuyModal from './components/BuyModal';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import UserProfileModal from './components/UserProfileModal';
import BoosterOpeningPage from './components/BoosterOpeningPage';
import ChatPanel from './components/ChatPanel';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Multi-item cart system
  const { cartItems, itemCount, isCartOpen, openCart, closeCart, clearCart, syncWithListings } = useCart();

  // Search input focus & command-bar interaction
  const searchInputRef = useRef(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Global keyboard shortcut Ctrl+K / Cmd+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Read initial navigation and filter state from URL search params
  const initialParams = new URLSearchParams(window.location.search);
  const [listings, setListings] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Redis cache metrics
  const [cacheMetrics, setCacheMetrics] = useState({ hit: false, timeMs: 0, source: 'elasticsearch' });

  // Real authentication & user profile state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('pokevinted_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    try {
      const cached = localStorage.getItem('pokevinted_cached_favs');
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(() => initialParams.get('favorites') === 'true');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Search filters
  const [searchQuery, setSearchQuery] = useState(() => initialParams.get('q') || '');
  const [selectedSet, setSelectedSet] = useState(() => initialParams.get('set') || '');
  const [selectedCondition, setSelectedCondition] = useState(() => initialParams.get('condition') || '');
  const [sortBy, setSortBy] = useState(() => initialParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState(() => initialParams.get('sort_order') || 'desc');

  // Modals
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellInitialCardId, setSellInitialCardId] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedListingForBuy, setSelectedListingForBuy] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  // New feature modals
  const [isBoosterOpen, setIsBoosterOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Poll unread message count from Redis via backend every 10 seconds
  useEffect(() => {
    if (!currentUser) { setUnreadMessages(0); return; }
    const username = currentUser.name || currentUser.username;
    const poll = async () => {
      try {
        const token = localStorage.getItem('pokevinted_token');
        const res = await fetch(`/api/messages/unread-count?username=${encodeURIComponent(username)}`, {
          headers: token ? { 'x-session-token': token } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unread_total || 0);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check active session on initial load
  const checkActiveSession = async () => {
    try {
      const token = localStorage.getItem('pokevinted_token');
      if (!token) {
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          if (user.token) {
            localStorage.setItem('pokevinted_token', user.token);
          }
          try {
            localStorage.setItem('pokevinted_cached_user', JSON.stringify(user));
          } catch {}
          if (user.id) {
            loadUserFavorites(user.id);
          }
        }
        return;
      }

      const res = await fetch('/api/users/me', {
        headers: { 'x-session-token': token },
      });

      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        try {
          localStorage.setItem('pokevinted_cached_user', JSON.stringify(user));
        } catch {}
        if (user.id) {
          loadUserFavorites(user.id);
        }
      } else {
        localStorage.removeItem('pokevinted_token');
        localStorage.removeItem('pokevinted_cached_user');
        setCurrentUser(null);
      }
    } catch (e) {
      console.error("Erreur vérification session :", e);
      setCurrentUser(null);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const loadUserFavorites = async (userId) => {
    try {
      const res = await fetch(`/api/users/favorites?user_id=${userId}`);
      if (res.ok) {
        const favList = await res.json();
        let cachedArr = [];
        try {
          const cachedStr = localStorage.getItem('pokevinted_cached_favs');
          if (cachedStr) cachedArr = JSON.parse(cachedStr);
        } catch {}

        // If backend Redis was flushed/restarted but browser still has favorites, re-sync to backend
        if (favList.length === 0 && cachedArr.length > 0) {
          for (const fid of cachedArr) {
            fetch(`/api/users/favorites/${fid}?user_id=${userId}`, { method: 'POST' }).catch(() => {});
          }
        }

        const merged = new Set([...favList, ...cachedArr].filter(Boolean));
        setFavorites(merged);
        try {
          localStorage.setItem('pokevinted_cached_favs', JSON.stringify([...merged]));
        } catch {}
      }
    } catch (e) {
      console.error("Erreur favoris :", e);
    }
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('pokevinted_cached_user', JSON.stringify(user));
    } catch {}
    if (user.id) {
      loadUserFavorites(user.id);
    }
    showToast(`👋 Bienvenue ${user.name} ! Connexion réussie.`);
  };

  const handleUserRegistered = async (newUser) => {
    setCurrentUser(newUser);
    try {
      localStorage.setItem('pokevinted_cached_user', JSON.stringify(newUser));
    } catch {}
    if (newUser.id) {
      loadUserFavorites(newUser.id);
    }
    showToast(`🎉 Bienvenue ${newUser.name} ! Votre compte dresseur est créé.`);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('pokevinted_token');
      if (token) {
        await fetch('/api/users/logout', {
          method: 'POST',
          headers: { 'x-session-token': token },
        });
      }
    } catch (e) {
      console.error("Erreur déconnexion :", e);
    } finally {
      localStorage.removeItem('pokevinted_token');
      localStorage.removeItem('pokevinted_cached_user');
      localStorage.removeItem('pokevinted_cached_favs');
      setCurrentUser(null);
      setFavorites(new Set());
      setShowOnlyFavorites(false);
      setIsUserDropdownOpen(false);
      navigate('/');
      showToast("👋 Déconnexion réussie. À bientôt sur PokéVinted !");
    }
  };

  const handleBalanceUpdated = (newBalance) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, balance: newBalance };
      try {
        localStorage.setItem('pokevinted_cached_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleFavorite = async (listingId) => {
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour ajouter des annonces en favoris.");
      setIsLoginModalOpen(true);
      return;
    }
    if (!listingId) return;

    try {
      const res = await fetch(`/api/users/favorites/${listingId}?user_id=${currentUser.id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFavorites((prev) => {
          // Favorites track individual listings (by listing id), consistent with the
          // per-listing trending ranking.
          const next = new Set(prev);
          if (data.is_favorite) {
            next.add(listingId);
            showToast(`❤️ Annonce ajoutée à vos favoris`);
          } else {
            next.delete(listingId);
            showToast(`💔 Annonce retirée de vos favoris`);
          }
          try {
            localStorage.setItem('pokevinted_cached_favs', JSON.stringify([...next]));
          } catch {}
          return next;
        });
      }
    } catch (e) {
      console.error("Erreur toggle favori :", e);
    }
  };

  // Fetch marketplace listings and reference catalog
  const fetchData = async () => {
    setIsFetching(true);
    try {
      // Load up to 1000 listings so favorites across all expansions are fully accessible in memory
      let url = `/api/listings?limit=1000&sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (selectedSet) url += `&set_name=${encodeURIComponent(selectedSet)}`;
      if (selectedCondition) url += `&condition=${encodeURIComponent(selectedCondition)}`;

      const fetchPromises = [fetch(url)];
      if (catalogCards.length === 0) {
        fetchPromises.push(fetch('/api/cards?limit=3000'));
      }

      const results = await Promise.all(fetchPromises);
      const resListings = results[0];
      const resCards = results[1];

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
          hit: data.cache_hit || false,
          timeMs: data.response_time_ms || 1.2,
          source: data.source || 'elasticsearch',
        });
      }
      if (resCards && resCards.ok) {
        const cards = await resCards.json();
        setCatalogCards(cards || []);
      }
    } catch (e) {
      console.error('Failed to load PokéVinted data:', e);
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedSet, selectedCondition, sortBy, sortOrder]);

  // Synchronize marketplace filters from URL query parameters (e.g. clicking extension link or navigation)
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

  // Synchronize marketplace filters to URL query parameters when filter state changes on "/" route
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

  const handleCardSelected = (item) => {
    if (!item) return;
    const cardId = item.card_id || item.id;
    const slug = generateCardSlug(item);
    const matchingListing = item.seller_name ? item : (listings.find((l) => l.card_id === cardId || l.id === cardId) || null);
    saveMarketplaceScroll({ listing: matchingListing || item });
    navigate(`/card/${slug}`, { state: { listing: matchingListing } });
  };

  const handleQuickBuy = (item) => {
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour acheter cette carte.");
      setIsLoginModalOpen(true);
      return;
    }

    const currentUserName = (currentUser.name || currentUser.username || '').toLowerCase().trim();
    const itemSeller = (item?.seller_name || '').toLowerCase().trim();
    if (currentUserName && itemSeller && (currentUserName === itemSeller || itemSeller.includes(currentUserName) || currentUserName.includes(itemSeller))) {
      showToast("🚫 Vous ne pouvez pas acheter votre propre annonce !");
      return;
    }

    setSelectedListingForBuy(item);
  };

  const handleBuyFromChat = (listingId, price) => {
    setIsChatOpen(false);
    const targetListing = listings.find((l) => l.id === listingId);
    if (targetListing) {
      handleQuickBuy(price ? { ...targetListing, price: Number(price) } : targetListing);
    } else if (listingId) {
      navigate(`/listing/${listingId}`);
    }
  };

  const handleOpenSell = (cardId) => {
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour vendre une carte.");
      setIsLoginModalOpen(true);
      return;
    }
    // cardId is only a real id when called with one (e.g. "Vendre cette carte"
    // after a booster pull). When used directly as an onClick handler it receives
    // a DOM event, so only keep string ids.
    setSellInitialCardId(typeof cardId === 'string' ? cardId : null);
    setIsSellModalOpen(true);
  };

  const handleListingCreated = (newListing) => {
    setListings((prev) => {
      const exists = prev.some((l) => l.id === newListing.id);
      if (exists) return prev;
      return [newListing, ...prev];
    });
    showToast(`🎉 Votre annonce pour "${newListing.card_name}" est en ligne !`);
  };

  // Sync cart status with listings updates
  useEffect(() => {
    syncWithListings(listings);
  }, [listings, syncWithListings]);

  const handlePurchaseComplete = (order, listingId) => {
    setListings((prev) =>
      prev.map((item) => (item.id === listingId ? { ...item, status: 'SOLD', buyer_name: order.buyer_name } : item))
    );
    if (order.buyer_balance !== undefined && order.buyer_balance !== null) {
      setCurrentUser((prev) => (prev ? { ...prev, balance: order.buyer_balance } : prev));
    }
    clearCart();
    showToast(`🛒 Bravo ! Achat confirmé de "${order.card_name}" pour ${order.price} € !`);
  };

  const handleBatchPurchaseComplete = (checkoutData) => {
    const soldIds = new Set(checkoutData.orders.map((o) => o.listing_id));
    setListings((prev) =>
      prev.map((item) =>
        soldIds.has(item.id)
          ? { ...item, status: 'SOLD', buyer_name: checkoutData.buyer_name }
          : item
      )
    );
    if (checkoutData.buyer_balance !== undefined && checkoutData.buyer_balance !== null) {
      setCurrentUser((prev) => (prev ? { ...prev, balance: checkoutData.buyer_balance } : prev));
    }
    showToast(
      `🎉 Commande validée ! ${checkoutData.item_count} cartes achetées pour un montant total de ${checkoutData.total_amount.toFixed(2)} € !`
    );
  };

  const handleDeleteListing = async (listing) => {
    if (!currentUser?.is_admin) return;
    const confirmed = window.confirm(
      `Confirmer la suppression administrative de l'offre "${listing.card_name}" (${listing.price.toFixed(2)} €) par ${listing.seller_name} ?\nCette opération purgera la carte de MongoDB, Elasticsearch et invalidera les caches Redis.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch(`/api/admin/listings/${listing.id}`, {
        method: 'DELETE',
        headers: token ? { 'x-session-token': token } : {},
      });
      if (res.ok) {
        setListings((prev) => prev.filter((item) => item.id !== listing.id));
        showToast(`🗑️ Offre "${listing.card_name}" supprimée avec succès par l'administrateur.`);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Échec de la suppression de l'offre");
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur réseau lors de la suppression");
    }
  };

  const isCardInFavorites = useCallback(
    (listing) => {
      // Favorites are tracked per listing (by listing id), not per card.
      if (!listing || favorites.size === 0) return false;
      return Boolean(listing.id && favorites.has(listing.id));
    },
    [favorites]
  );

  const favoriteListings = useMemo(() => {
    return listings.filter((l) => isCardInFavorites(l));
  }, [listings, isCardInFavorites]);

  const favoriteListingsCount = favoriteListings.length;

  const displayedListings = showOnlyFavorites
    ? favoriteListings
    : listings;

  const hasActiveFilters = Boolean(searchQuery || selectedSet || selectedCondition || showOnlyFavorites);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSet('');
    setSelectedCondition('');
    setShowOnlyFavorites(false);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (location.pathname !== '/') {
      navigate(val ? `/?q=${encodeURIComponent(val)}` : '/');
    }
  };

  const handleLogoClick = () => {
    clearSavedMarketplaceScroll();
    navigate('/');
    setShowOnlyFavorites(false);
    setSearchQuery('');
    setSelectedSet('');
    setSelectedCondition('');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleNavbarFavoritesClick = () => {
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
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <Sparkles size={20} color="var(--accent-gold)" />
          {toastMessage}
        </div>
      )}

      {/* Navigation bar */}
      <header className="navbar">
        <div className="logo-container" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2" fill="#1e293b" />
            <path d="M2 12h20" stroke="#ef4444" strokeWidth="2.5" />
            <circle cx="12" cy="12" r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="2" fill="#ef4444" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-text">PokéVinted</span>
            <span className="logo-badge">Marketplace</span>
          </div>
        </div>

        {/* Ultra-Modern Command-Bar Search Input */}
        <div className="navbar-search-wrapper">
          <div className={`navbar-search-container ${isSearchFocused ? 'focused' : ''}`}>
            <Search size={16} className="navbar-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une carte, extension, rareté..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="navbar-search-input"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="navbar-search-clear"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            ) : (
              <div className="navbar-search-kbd">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Action Buttons — Grouped with breathing room and clear hierarchy */}
        <div className="navbar-actions">
          {/* Cluster 1: Community & Tools (Booster, Messages, Favorites) */}
          <div className="flex items-center gap-2">
            {/* Booster Button */}
            <button
              type="button"
              onClick={() => setIsBoosterOpen(true)}
              className="nav-btn-action"
              title="Ouvrir un booster Pokémon (simulation avec vrais taux)"
            >
              <Package size={14} className="text-slate-400" />
              <span>Booster</span>
            </button>

            {/* Messages Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="nav-btn-action relative"
              title="Messagerie et négociations"
            >
              <MessageCircle size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Messages</span>
              {unreadMessages > 0 && (
                <span className="nav-badge-count">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>

            {/* Favorites Button */}
            <button
              type="button"
              onClick={handleNavbarFavoritesClick}
              className={`nav-btn-action ${(location.pathname === '/' && showOnlyFavorites) ? 'active-fav' : ''}`}
              title="Afficher uniquement mes annonces favorites"
            >
              <Heart
                size={14}
                fill={(location.pathname === '/' && showOnlyFavorites) || favoriteListingsCount > 0 ? '#ef4444' : 'none'}
                color={(location.pathname === '/' && showOnlyFavorites) || favoriteListingsCount > 0 ? '#ef4444' : 'currentColor'}
              />
              <span className="hidden sm:inline">Favoris</span>
              {favoriteListingsCount > 0 && (
                <span className="nav-badge-pill">
                  {favoriteListingsCount}
                </span>
              )}
            </button>

            {/* Panier Button */}
            <button
              type="button"
              onClick={() => (isCartOpen ? closeCart() : openCart())}
              className={`nav-btn-action relative ${itemCount > 0 ? 'active-cart text-indigo-300' : ''}`}
              title="Mon Panier"
            >
              <ShoppingCart size={14} className={itemCount > 0 ? "text-indigo-400" : "text-slate-400"} />
              <span className="hidden sm:inline">Panier</span>
              {itemCount > 0 && (
                <span className="nav-badge-pill bg-indigo-600 text-white font-bold text-[10px]">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Visual Separator */}
          <div className="h-5 w-px bg-white/10 hidden sm:block mx-0.5" />

          {/* Cluster 2: User Account */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* Wallet */}
              <button
                type="button"
                className="nav-btn-action"
                onClick={() => navigate('/profile')}
                title="Mon portefeuille • Cliquez pour recharger"
              >
                <Wallet size={14} className="text-amber-400/90" />
                <span className="font-semibold text-xs text-slate-200 tabular-nums">
                  {(currentUser.balance ?? 0).toFixed(2)} €
                </span>
              </button>

              {/* User Avatar & Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="nav-btn-action pr-2"
                  title="Menu profil dresseur"
                >
                  <div className="w-5 h-5 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px]">
                    {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-200 max-w-[85px] truncate hidden md:inline">
                    {currentUser.name}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isUserDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isUserDropdownOpen && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-header">
                      <div className="dropdown-user-name">{currentUser.name}</div>
                      <div className="dropdown-user-email">{currentUser.email || `@${currentUser.username}`}</div>
                      <div className="dropdown-badge-row">
                        <span className="dropdown-role-badge">Dresseur Certifié</span>
                        {currentUser.is_admin && (
                          <span className="dropdown-admin-badge">ADMIN</span>
                        )}
                      </div>
                    </div>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/profile');
                      }}
                    >
                      <User size={16} /> Mon Compte & Portefeuille
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/orders');
                      }}
                    >
                      <ShoppingBag size={16} /> Mes Achats & Commandes
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/my-listings');
                      }}
                    >
                      <Tag size={16} /> Mes Annonces en Vente
                    </button>

                    {currentUser.is_admin && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          navigate('/admin');
                        }}
                        style={{ color: '#38bdf8' }}
                      >
                        <ShieldCheck size={16} color="#38bdf8" />
                        Espace Administration
                      </button>
                    )}

                    <div className="dropdown-divider" />

                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={16} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="nav-btn-action"
                title="Se connecter avec son compte"
              >
                <LogIn size={14} />
                <span>Connexion</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="nav-btn-action"
                title="Créer un compte dresseur gratuit"
              >
                <UserPlus size={14} />
                <span>S'inscrire</span>
              </button>
            </div>
          )}

          {/* Visual Separator */}
          <div className="h-5 w-px bg-white/10 hidden sm:block mx-0.5" />

          {/* Cluster 3: Primary Action (Vendre) */}
          <button
            type="button"
            onClick={handleOpenSell}
            className="nav-btn-sell"
            title="Mettre une carte Pokémon en vente"
          >
            <PlusCircle size={15} />
            <span>Vendre</span>
          </button>
        </div>
      </header>

      {/* Routed Pages */}
      <Routes>
        <Route
          path="/"
          element={
            <MarketplaceView
              listings={listings}
              displayedListings={displayedListings}
              isInitialLoading={isInitialLoading}
              isFetching={isFetching}
              fetchData={fetchData}
              cacheMetrics={cacheMetrics}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedSet={selectedSet}
              setSelectedSet={setSelectedSet}
              selectedCondition={selectedCondition}
              setSelectedCondition={setSelectedCondition}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              showOnlyFavorites={showOnlyFavorites}
              setShowOnlyFavorites={setShowOnlyFavorites}
              favoriteListingsCount={favoriteListingsCount}
              hasActiveFilters={hasActiveFilters}
              handleResetFilters={handleResetFilters}
              favorites={favorites}
              isCardInFavorites={isCardInFavorites}
              handleToggleFavorite={handleToggleFavorite}
              handleCardSelected={handleCardSelected}
              handleQuickBuy={handleQuickBuy}
              currentUser={currentUser}
              onDeleteListing={handleDeleteListing}
            />
          }
        />

        <Route
          path="/listing/:id"
          element={
            <CardDetailPage
              currentUser={currentUser}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onInitiateBuy={handleQuickBuy}
              onDeleteListing={handleDeleteListing}
              showToast={showToast}
              catalogCards={catalogCards}
            />
          }
        />

        <Route
          path="/card/:id"
          element={
            <CardDetailPage
              currentUser={currentUser}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onInitiateBuy={handleQuickBuy}
              onDeleteListing={handleDeleteListing}
              showToast={showToast}
              catalogCards={catalogCards}
            />
          }
        />

        <Route
          path="/admin"
          element={
            <AdminDashboard onBackToMarketplace={() => navigate('/')} />
          }
        />

        <Route
          path="/profile"
          element={
            <UserProfilePage
              currentUser={currentUser}
              onBalanceUpdated={handleBalanceUpdated}
              onLogout={handleLogout}
              showToast={showToast}
              defaultTab="wallet"
              isSessionLoading={isSessionLoading}
              onOpenSell={handleOpenSell}
            />
          }
        />

        <Route
          path="/orders"
          element={
            <UserProfilePage
              currentUser={currentUser}
              onBalanceUpdated={handleBalanceUpdated}
              onLogout={handleLogout}
              showToast={showToast}
              defaultTab="orders"
              isSessionLoading={isSessionLoading}
              onOpenSell={handleOpenSell}
            />
          }
        />

        <Route
          path="/my-listings"
          element={
            <UserProfilePage
              currentUser={currentUser}
              onBalanceUpdated={handleBalanceUpdated}
              onLogout={handleLogout}
              showToast={showToast}
              defaultTab="listings"
              isSessionLoading={isSessionLoading}
              onOpenSell={handleOpenSell}
            />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Modals */}
      <SellCardModal
        isOpen={isSellModalOpen}
        onClose={() => { setIsSellModalOpen(false); setSellInitialCardId(null); }}
        onListingCreated={handleListingCreated}
        catalogCards={catalogCards}
        initialCardId={sellInitialCardId}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <BuyModal
        isOpen={Boolean(selectedListingForBuy)}
        onClose={() => setSelectedListingForBuy(null)}
        listing={selectedListingForBuy}
        currentUser={currentUser}
        onPurchaseComplete={handlePurchaseComplete}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserRegistered={handleUserRegistered}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onBalanceUpdated={handleBalanceUpdated}
        onLogout={handleLogout}
      />

      {/* Cart Drawer — slide-over panel */}
      <CartDrawer
        currentUser={currentUser}
        onBatchPurchaseComplete={handleBatchPurchaseComplete}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        showToast={showToast}
      />

      {/* Booster Opening Page — fullscreen overlay */}
      {isBoosterOpen && (
        <BoosterOpeningPage
          onClose={() => setIsBoosterOpen(false)}
          onOpenSell={handleOpenSell}
        />
      )}

      {/* Chat Drawer — slide-in panel */}
      {isChatOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[140] transition-opacity"
            onClick={() => setIsChatOpen(false)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-[150] flex flex-col"
            style={{
              width: 'min(420px, 100vw)',
              background: '#0c0e14',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.7)',
              animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <ChatPanel
            currentUser={currentUser}
            listings={listings}
            onClose={() => setIsChatOpen(false)}
            onBuyNow={handleBuyFromChat}
          />
        </div>
        </>
      )}
    </div>
  );
}
