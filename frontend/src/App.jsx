import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, BarChart3, Store, Sparkles, Filter, RefreshCw, User, Zap, Heart, ShieldCheck, UserPlus } from 'lucide-react';
import PokemonCard3D from './components/PokemonCard3D';
import TrendingBar from './components/TrendingBar';
import SellCardModal from './components/SellCardModal';
import BuyModal from './components/BuyModal';
import AdminDashboard from './components/AdminDashboard';
import RegisterModal from './components/RegisterModal';

export default function App() {
  const [currentView, setCurrentView] = useState('marketplace'); // 'marketplace' | 'admin'
  const [listings, setListings] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redis cache metrics
  const [cacheMetrics, setCacheMetrics] = useState({ hit: false, timeMs: 0, source: 'elasticsearch' });

  // User profiles & sessions
  const [currentUser, setCurrentUser] = useState({ id: 'sacha', name: 'Sacha du Bourg-Palette', role: 'Dresseur Kanto', balance: 250, is_admin: false });
  const [allUsers, setAllUsers] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedListingForBuy, setSelectedListingForBuy] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        setAllUsers(users);
      }
    } catch (e) {
      console.error("Erreur chargement utilisateurs :", e);
    }
  };

  // Load active user session and favorites from Redis
  const loadUserAndFavorites = async (userId = 'sacha') => {
    try {
      const [resUser, resFavs] = await Promise.all([
        fetch('/api/users/me'),
        fetch(`/api/users/favorites?user_id=${userId}`),
      ]);
      if (resUser.ok) {
        const u = await resUser.json();
        setCurrentUser(u);
      }
      if (resFavs.ok) {
        const favList = await resFavs.json();
        setFavorites(new Set(favList));
      }
    } catch (e) {
      console.error("Erreur chargement session Redis :", e);
    }
  };

  const handleSwitchUser = async (userId) => {
    try {
      const res = await fetch('/api/users/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        const favRes = await fetch(`/api/users/favorites?user_id=${user.id}`);
        if (favRes.ok) {
          const favList = await favRes.json();
          setFavorites(new Set(favList));
        }
        showToast(`👤 Connecté en tant que : ${user.name}`);
      }
    } catch (e) {
      console.error("Erreur switch session :", e);
    }
  };

  const handleUserRegistered = async (newUser) => {
    setCurrentUser(newUser);
    fetchUsersList();
    const favRes = await fetch(`/api/users/favorites?user_id=${newUser.id}`);
    if (favRes.ok) {
      const favList = await favRes.json();
      setFavorites(new Set(favList));
    }
    showToast(`🎉 Bienvenue ${newUser.name} ! Votre compte est créé.`);
  };

  const handleToggleFavorite = async (cardId) => {
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
    fetchUsersList();
    loadUserAndFavorites();
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedSet, selectedCondition, sortBy, sortOrder]);

  const handleCardSelected = (item) => {
    // Real-time popularity tracking in Redis (ZINCRBY)
    fetch(`/api/cards/${item.card_id}/view`, { method: 'POST' }).catch(() => {});
    setSelectedListingForBuy(item);
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
    setListings((prev) =>
      prev.map((item) => (item.id === listingId ? { ...item, status: 'SOLD', buyer_name: order.buyer_name } : item))
    );
    if (order.buyer_balance !== undefined && order.buyer_balance !== null) {
      setCurrentUser((prev) => ({
        ...prev,
        balance: order.buyer_balance,
      }));
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
        <div className="logo-container" onClick={() => setCurrentView('marketplace')}>
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

        {/* Trainer profile selector and actions */}
        <div className="navbar-actions">
          {/* Profile badge and user switcher */}
          <div className="navbar-session-badge">
            <User size={16} color="var(--accent-secondary)" />
            <select
              value={currentUser.id}
              onChange={(e) => handleSwitchUser(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
              title="Changer de profil dresseur"
            >
              {allUsers.length > 0 ? (
                allUsers.map((u) => (
                  <option key={u.id} value={u.id} style={{ background: '#121826' }}>
                    {u.is_admin ? '🛡️' : '🧢'} {u.name} ({u.balance}€)
                  </option>
                ))
              ) : (
                <>
                  <option value="sacha" style={{ background: '#121826' }}>🧢 Sacha (250€)</option>
                  <option value="ondine" style={{ background: '#121826' }}>🌊 Ondine (480€)</option>
                  <option value="chen" style={{ background: '#121826' }}>🛡️ Prof. Chen (Admin)</option>
                </>
              )}
            </select>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(6,182,212,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              {currentUser.is_admin ? 'Admin' : `${currentUser.balance} €`}
            </span>
          </div>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="btn btn-secondary btn-responsive"
            title="Créer un nouveau profil dresseur ou administrateur"
          >
            <UserPlus size={16} />
            <span className="btn-label-desktop">S'inscrire</span>
          </button>

          {currentUser.is_admin && (
            <button
              onClick={() => setCurrentView(currentView === 'admin' ? 'marketplace' : 'admin')}
              className={`btn ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'} btn-responsive`}
              title="Accéder au panneau de supervision"
            >
              {currentView === 'admin' ? (
                <><Store size={18} /><span className="btn-label-desktop">Marketplace</span></>
              ) : (
                <><ShieldCheck size={18} color="#38bdf8" /><span className="btn-label-desktop">Administration</span><span className="btn-label-mobile">Admin</span></>
              )}
            </button>
          )}

          <button onClick={() => setIsSellModalOpen(true)} className="btn btn-gold btn-responsive">
            <PlusCircle size={18} /><span className="btn-label-desktop">Vendre une carte</span><span className="btn-label-mobile">Vendre</span>
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
                <button onClick={() => setIsSellModalOpen(true)} className="btn btn-gold hero-btn" style={{ padding: '12px 28px' }}>
                  <PlusCircle size={18} /> Vendre une carte
                </button>
                <button onClick={() => setIsRegisterModalOpen(true)} className="btn btn-secondary hero-btn" style={{ padding: '12px 24px' }}>
                  <UserPlus size={18} /> Créer un compte
                </button>
                {currentUser.is_admin && (
                  <button onClick={() => setCurrentView('admin')} className="btn btn-secondary hero-btn" style={{ padding: '12px 24px' }}>
                    <ShieldCheck size={18} /> Administration
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Live top 5 trending cards (Redis ZSET) */}
          <TrendingBar onSelectCard={(card) => setSearchQuery(card.name)} />

          {/* Advanced filters bar and cache latency benchmark */}
          <div className="filters-bar">
            <div className="filters-main">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Filter size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Filtres :</span>
              </div>

              {/* Expansion set selector */}
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="">Toutes les séries</option>
                <option value="Écarlate et Violet 151">Écarlate et Violet 151</option>
                <option value="Flammes Obsidiennes">Flammes Obsidiennes</option>
                <option value="Écarlate et Violet">Écarlate et Violet</option>
                <option value="Faille Paradoxe">Faille Paradoxe</option>
                <option value="Forces Temporelles">Forces Temporelles</option>
              </select>

              {/* Condition selector */}
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="">Tous les états</option>
                <option value="MINT">💎 MINT</option>
                <option value="NEAR_MINT">✨ NEAR MINT</option>
                <option value="EXCELLENT">👍 EXCELLENT</option>
                <option value="GOOD">👌 GOOD</option>
                <option value="PLAYED">⚡ PLAYED</option>
              </select>

              {/* Favorites filter */}
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`btn ${showOnlyFavorites ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <Heart size={15} fill={showOnlyFavorites ? '#ffffff' : 'none'} />
                Mes Favoris ({favoriteListingsCount})
              </button>
            </div>

            {/* Listings count for regular users, performance indicator for admin */}
            <div className="filters-stats">
              {currentUser.is_admin ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: cacheMetrics.hit ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  border: `1px solid ${cacheMetrics.hit ? '#06b6d4' : '#6366f1'}`,
                  color: cacheMetrics.hit ? '#22d3ee' : '#a5b4fc',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
                title={cacheMetrics.hit ? "Résultat servi en mémoire vive par Redis" : "Requête exécutée par Elasticsearch & MongoDB"}
                >
                  <Zap size={14} color={cacheMetrics.hit ? "#06b6d4" : "#818cf8"} />
                  {cacheMetrics.hit
                    ? `⚡ Cache HIT (${cacheMetrics.timeMs} ms)`
                    : `🔍 Recherche (${cacheMetrics.timeMs} ms)`}
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  {displayedListings.length} annonce{displayedListings.length > 1 ? 's' : ''} en vente
                </div>
              )}

              {/* Sort selector */}
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="created_at:desc">Plus récentes</option>
                <option value="price:asc">Prix : croissant</option>
                <option value="price:desc">Prix : décroissant</option>
              </select>

              <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '10px 14px' }}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Listings grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <RefreshCw className="animate-spin" size={32} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Chargement des cartes en cours...</p>
            </div>
          ) : displayedListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              <Sparkles size={40} color="var(--accent-gold)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
                {showOnlyFavorites ? "Vous n'avez pas encore de cartes en favoris" : "Aucune annonce trouvée"}
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                {showOnlyFavorites
                  ? "Cliquez sur le cœur d'une carte pour la sauvegarder dans vos favoris !"
                  : "Soyez le premier dresseur à publier une annonce avec le formulaire !"}
              </p>
              {showOnlyFavorites ? (
                <button onClick={() => setShowOnlyFavorites(false)} className="btn btn-primary" style={{ padding: '12px 24px' }}>
                  Voir toutes les annonces
                </button>
              ) : (
                <button onClick={() => { setShowOnlyFavorites(false); setIsSellModalOpen(true); }} className="btn btn-gold">
                  <PlusCircle size={18} /> Vendre une carte maintenant
                </button>
              )}
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
                  onQuickBuy={handleCardSelected}
                />
              ))}
            </div>
          )}
          {/* Marketplace footer */}
          <footer style={{ marginTop: '60px', padding: '32px 0 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div>
              <strong>PokéVinted</strong> — La marketplace de référence des cartes Pokémon.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={() => {
                  if (!currentUser.is_admin) {
                    handleSwitchUser('chen');
                  }
                  setCurrentView('admin');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldCheck size={14} /> Espace Administration
              </button>
              <span>© 2026 PokéVinted</span>
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
      />

      <BuyModal
        isOpen={!!selectedListingForBuy}
        onClose={() => setSelectedListingForBuy(null)}
        listing={selectedListingForBuy}
        currentUser={currentUser}
        onPurchaseComplete={handlePurchaseComplete}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserRegistered={handleUserRegistered}
      />
    </div>
  );
}
