import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Search,
  Store,
  Sparkles,
  Filter,
  RefreshCw,
  User,
  Zap,
  Heart,
  ShieldCheck,
  UserPlus,
  LogIn,
  LogOut,
  Wallet,
  ChevronDown,
  ShoppingBag,
} from 'lucide-react';
import PokemonCard3D from './components/PokemonCard3D';
import TrendingBar from './components/TrendingBar';
import SellCardModal from './components/SellCardModal';
import BuyModal from './components/BuyModal';
import AdminDashboard from './components/AdminDashboard';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import UserProfileModal from './components/UserProfileModal';

export default function App() {
  const [currentView, setCurrentView] = useState('marketplace'); // 'marketplace' | 'admin'
  const [listings, setListings] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redis cache metrics
  const [cacheMetrics, setCacheMetrics] = useState({ hit: false, timeMs: 0, source: 'elasticsearch' });

  // Real authentication & user profile state
  const [currentUser, setCurrentUser] = useState(null); // null when guest, user object when logged in
  const [favorites, setFavorites] = useState(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedListingForBuy, setSelectedListingForBuy] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
        // Fallback demo session or guest
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
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
        if (user.id) {
          loadUserFavorites(user.id);
        }
      } else {
        localStorage.removeItem('pokevinted_token');
        setCurrentUser(null);
      }
    } catch (e) {
      console.error("Erreur vérification session :", e);
      setCurrentUser(null);
    }
  };

  const loadUserFavorites = async (userId) => {
    try {
      const res = await fetch(`/api/users/favorites?user_id=${userId}`);
      if (res.ok) {
        const favList = await res.json();
        setFavorites(new Set(favList));
      }
    } catch (e) {
      console.error("Erreur favoris :", e);
    }
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    if (user.id) {
      loadUserFavorites(user.id);
    }
    showToast(`👋 Bienvenue ${user.name} ! Connexion réussie.`);
  };

  const handleUserRegistered = async (newUser) => {
    setCurrentUser(newUser);
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
      setCurrentUser(null);
      setFavorites(new Set());
      setIsUserDropdownOpen(false);
      if (currentView === 'admin') {
        setCurrentView('marketplace');
      }
      showToast("👋 Déconnexion réussie. À bientôt sur PokéVinted !");
    }
  };

  const handleBalanceUpdated = (newBalance) => {
    setCurrentUser((prev) => (prev ? { ...prev, balance: newBalance } : prev));
  };

  const handleToggleFavorite = async (cardId) => {
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour ajouter des cartes en favoris.");
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/users/favorites/${cardId}?user_id=${currentUser.id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFavorites((prev) => {
          const next = new Set(prev);
          if (data.is_favorite) {
            next.add(cardId);
            showToast(`❤️ Ajouté à vos favoris`);
          } else {
            next.delete(cardId);
            showToast(`💔 Retiré de vos favoris`);
          }
          return next;
        });
      }
    } catch (e) {
      console.error("Erreur toggle favori :", e);
    }
  };

  // Fetch marketplace listings and reference catalog
  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/listings?sort_by=${sortBy}&sort_order=${sortOrder}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (selectedSet) url += `&set_name=${encodeURIComponent(selectedSet)}`;
      if (selectedCondition) url += `&condition=${encodeURIComponent(selectedCondition)}`;

      const [resListings, resCards] = await Promise.all([
        fetch(url),
        fetch('/api/cards?limit=100'),
      ]);

      if (resListings.ok) {
        const data = await resListings.json();
        const rawItems = data.items || [];
        // Deduplicate listings by ID
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
      if (resCards.ok) {
        const cards = await resCards.json();
        setCatalogCards(cards || []);
      }
    } catch (e) {
      console.error('Failed to load PokéVinted data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedSet, selectedCondition, sortBy, sortOrder]);

  const handleCardSelected = (item) => {
    // Real-time popularity tracking in Redis (ZINCRBY)
    fetch(`/api/cards/${item.card_id}/view`, { method: 'POST' }).catch(() => {});
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour finaliser cet achat.");
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedListingForBuy(item);
  };

  const handleQuickBuy = (item) => {
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour acheter cette carte.");
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedListingForBuy(item);
  };

  const handleOpenSell = () => {
    if (!currentUser) {
      showToast("🔒 Veuillez vous connecter pour vendre une carte.");
      setIsLoginModalOpen(true);
      return;
    }
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

  const handlePurchaseComplete = (order, listingId) => {
    // Transition listing status to SOLD immediately
    setListings((prev) =>
      prev.map((item) => (item.id === listingId ? { ...item, status: 'SOLD', buyer_name: order.buyer_name } : item))
    );
    if (order.buyer_balance !== undefined && order.buyer_balance !== null) {
      setCurrentUser((prev) => (prev ? { ...prev, balance: order.buyer_balance } : prev));
    }
    showToast(`🛒 Bravo ! Achat confirmé de "${order.card_name}" pour ${order.price} € !`);
  };

  const favoriteListingsCount = listings.filter((l) => favorites.has(l.card_id) || favorites.has(l.id)).length;

  const displayedListings = showOnlyFavorites
    ? listings.filter((l) => favorites.has(l.card_id) || favorites.has(l.id))
    : listings;

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
        <div className="logo-container" onClick={() => setCurrentView('marketplace')} style={{ cursor: 'pointer' }}>
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

        {/* Search bar */}
        {currentView === 'marketplace' && (
          <div className="navbar-search">
            <Search size={18} className="navbar-search-icon" />
            <input
              type="text"
              placeholder="Rechercher une carte, une rareté, une série..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input navbar-search-input"
            />
          </div>
        )}

        {/* Real User Navigation Actions */}
        <div className="navbar-actions">
          {currentUser ? (
            <>
              {/* Wallet Pill with live balance and recharge action */}
              <div
                className="navbar-wallet-pill"
                onClick={() => setIsProfileModalOpen(true)}
                title="Cliquez pour gérer votre compte et recharger votre solde"
              >
                <Wallet size={15} color="var(--accent-gold)" />
                <span style={{ fontWeight: 800, color: '#fef08a', fontSize: '0.9rem' }}>
                  {Number(currentUser.balance ?? 0).toFixed(2)} €
                </span>
                <span className="wallet-add-btn">+</span>
              </div>

              {/* Favorites filter shortcut */}
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`btn ${showOnlyFavorites ? 'btn-primary' : 'btn-secondary'} btn-responsive`}
                title="Filtrer mes cartes favorites"
                style={{ position: 'relative' }}
              >
                <Heart size={16} fill={showOnlyFavorites ? '#ffffff' : favorites.size > 0 ? '#ef4444' : 'none'} color={showOnlyFavorites ? '#ffffff' : favorites.size > 0 ? '#ef4444' : 'currentColor'} />
                <span className="btn-label-desktop">Favoris</span>
                {favorites.size > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {favorites.size}
                  </span>
                )}
              </button>

              {/* User profile dropdown button */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="navbar-user-btn"
                >
                  <div className="user-avatar-circle">
                    {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {currentUser.name}
                  </span>
                  <ChevronDown size={14} style={{ opacity: 0.7 }} />
                </button>

                {isUserDropdownOpen && (
                  <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                        {currentUser.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        @{currentUser.username} • {currentUser.role || 'Dresseur'}
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                        Solde : {Number(currentUser.balance ?? 0).toFixed(2)} €
                      </div>
                    </div>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                    >
                      <User size={16} /> Mon Compte & Portefeuille
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                    >
                      <ShoppingBag size={16} /> Mes Achats & Commandes
                    </button>

                    {currentUser.is_admin && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          setCurrentView(currentView === 'admin' ? 'marketplace' : 'admin');
                        }}
                        style={{ color: '#38bdf8' }}
                      >
                        <ShieldCheck size={16} color="#38bdf8" />
                        {currentView === 'admin' ? 'Retour Marketplace' : 'Espace Administration'}
                      </button>
                    )}

                    <div className="dropdown-divider" />

                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={16} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Guest navigation: Login & Register buttons */}
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="btn btn-secondary btn-responsive"
                title="Se connecter avec son compte"
              >
                <LogIn size={16} />
                <span>Connexion</span>
              </button>

              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="btn btn-primary btn-responsive"
                title="Créer un compte dresseur gratuit"
              >
                <UserPlus size={16} />
                <span>S'inscrire</span>
              </button>
            </>
          )}

          {/* Sell button */}
          <button onClick={handleOpenSell} className="btn btn-gold btn-responsive">
            <PlusCircle size={18} />
            <span className="btn-label-desktop">Vendre une carte</span>
            <span className="btn-label-mobile">Vendre</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      {currentView === 'admin' ? (
        <AdminDashboard onBackToMarketplace={() => setCurrentView('marketplace')} />
      ) : (
        <main className="container">
          {/* Hero banner */}
          <section className="hero-banner">
            <div style={{ maxWidth: '720px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '999px', fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '16px' }}>
                <Sparkles size={14} color="var(--accent-gold)" />
                La marketplace officielle dédiée aux passionnés de Pokémon
              </div>
              <h1 className="hero-title">
                Achetez & Vendez vos cartes <span>Pokémon</span> en toute confiance.
              </h1>
              <p className="hero-subtitle">
                Trouvez les pépites sous sleeve et toploader, négociez au meilleur prix et complétez vos master sets directement entre dresseurs certifiés.
              </p>
              <div className="hero-actions">
                <button onClick={handleOpenSell} className="btn btn-gold hero-btn" style={{ padding: '12px 28px' }}>
                  <PlusCircle size={18} /> Vendre une carte
                </button>
                {!currentUser ? (
                  <button onClick={() => setIsRegisterModalOpen(true)} className="btn btn-secondary hero-btn" style={{ padding: '12px 24px' }}>
                    <UserPlus size={18} /> Créer un compte dresseur
                  </button>
                ) : (
                  <button onClick={() => setIsProfileModalOpen(true)} className="btn btn-secondary hero-btn" style={{ padding: '12px 24px' }}>
                    <Wallet size={18} /> Gérer mon solde ({Number(currentUser.balance ?? 0).toFixed(2)} €)
                  </button>
                )}
                {currentUser?.is_admin && (
                  <button onClick={() => setCurrentView('admin')} className="btn btn-secondary hero-btn" style={{ padding: '12px 24px' }}>
                    <ShieldCheck size={18} /> Administration
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Real-time Redis Popularity Bar */}
          <TrendingBar />

          {/* Redis Cache Performance Metrics Banner */}
          <div className="cache-metrics-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={18} color="var(--accent-gold)" />
              <span>
                Recherche NoSQL indexée : <strong>{displayedListings.length} annonces en ligne</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`cache-badge ${cacheMetrics.hit ? 'cache-hit' : 'cache-miss'}`}>
                {cacheMetrics.hit ? '⚡ REDIS CACHE HIT' : `🔍 ${cacheMetrics.source.toUpperCase()}`}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {cacheMetrics.timeMs} ms
              </span>
            </div>
          </div>

          {/* Filters and search options */}
          <section className="filters-container">
            <div className="filters-main">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Filter size={16} /> Filtres :
              </div>

              {/* Set selector */}
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="">Toutes les séries</option>
                <option value="Écarlate et Violet 151">Écarlate et Violet 151</option>
                <option value="Flammes Obsidiennes">Flammes Obsidiennes</option>
                <option value="Écarlate et Violet">Écarlate et Violet (Base)</option>
                <option value="Forces Temporelles">Forces Temporelles</option>
              </select>

              {/* Condition selector */}
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="">Tous les états</option>
                <option value="MINT">💎 MINT (Parfait)</option>
                <option value="NEAR_MINT">✨ NEAR MINT</option>
                <option value="EXCELLENT">👍 EXCELLENT</option>
                <option value="GOOD">👌 GOOD</option>
                <option value="PLAYED">⚡ PLAYED</option>
              </select>

              {/* Favorites toggle */}
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`btn ${showOnlyFavorites ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <Heart size={15} fill={showOnlyFavorites ? '#ffffff' : 'none'} color={showOnlyFavorites ? '#ffffff' : '#ef4444'} />
                Mes Favoris ({favoriteListingsCount})
              </button>
            </div>

            {/* Sorting controls */}
            <div className="filters-sort">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="created_at">Plus récentes</option>
                <option value="price">Prix</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn btn-secondary"
                style={{ padding: '8px 12px' }}
                title="Inverser l'ordre"
              >
                {sortOrder === 'desc' ? '↓ Décroissant' : '↑ Croissant'}
              </button>

              <button
                onClick={fetchData}
                className="btn btn-secondary"
                style={{ padding: '8px' }}
                title="Actualiser les résultats"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </section>

          {/* Cards catalog grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <RefreshCw className="animate-spin" size={40} style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Recherche instantanée dans Elasticsearch...</p>
            </div>
          ) : displayedListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <Store size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                Aucune carte ne correspond à votre recherche
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Essayez d'ajuster vos critères ou soyez le premier à mettre cette carte en vente !
              </p>
              <button onClick={() => { setSearchQuery(''); setSelectedSet(''); setSelectedCondition(''); setShowOnlyFavorites(false); }} className="btn btn-secondary">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="cards-grid">
              {displayedListings.map((item) => (
                <PokemonCard3D
                  key={item.id}
                  listing={item}
                  isFavorite={favorites.has(item.card_id)}
                  onToggleFavorite={handleToggleFavorite}
                  onSelect={handleCardSelected}
                  onQuickBuy={handleQuickBuy}
                />
              ))}
            </div>
          )}

          {/* Marketplace footer */}
          <footer style={{ marginTop: '60px', padding: '32px 0 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div>
              <strong>PokéVinted</strong> — La marketplace officielle de référence des cartes Pokémon.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {currentUser?.is_admin && (
                <button
                  onClick={() => setCurrentView('admin')}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                >
                  <ShieldCheck size={14} /> Espace Administration NoSQL
                </button>
              )}
              <span>© 2026 PokéVinted — ENSIIE S3 NoSQL</span>
            </div>
          </footer>
        </main>
      )}

      {/* Modals */}
      <SellCardModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onListingCreated={handleListingCreated}
        catalogCards={catalogCards}
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
    </div>
  );
}
