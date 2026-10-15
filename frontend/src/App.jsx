import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, BarChart3, Store, Sparkles, Filter, RefreshCw, User, Zap, Heart, Database, ShieldCheck } from 'lucide-react';
import PokemonCard3D from './components/PokemonCard3D';
import TrendingBar from './components/TrendingBar';
import SellCardModal from './components/SellCardModal';
import BuyModal from './components/BuyModal';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState('marketplace'); // 'marketplace' | 'admin'
  const [listings, setListings] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redis cache metrics
  const [cacheMetrics, setCacheMetrics] = useState({ hit: false, timeMs: 0, source: 'elasticsearch' });

  // Redis user session
  const [currentUser, setCurrentUser] = useState({ id: 'sacha', name: 'Sacha du Bourg-Palette', role: 'Dresseur Kanto', balance: 250 });
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
  const [selectedListingForBuy, setSelectedListingForBuy] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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
        loadUserAndFavorites(user.id);
        showToast(`👤 Session Redis basculée sur : ${user.name} (TTL 24h)`);
      }
    } catch (e) {
      console.error("Erreur switch session :", e);
    }
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
            showToast(`❤️ Ajouté aux favoris dans Redis (Set SADD) !`);
          } else {
            next.delete(cardId);
            showToast(`💔 Retiré des favoris dans Redis (Set SREM) !`);
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
        setListings(data.items || []);
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
    setListings((prev) => [newListing, ...prev]);
    showToast(`🎉 Annonce publiée pour "${newListing.card_name}" ! Persistée dans Mongo, Elastic et Redis.`);
  };

  const handlePurchaseComplete = (order, listingId) => {
    setListings((prev) =>
      prev.map((item) => (item.id === listingId ? { ...item, status: 'SOLD', buyer_name: order.buyer_name } : item))
    );
    showToast(`🛒 Bravo ! Achat confirmé de "${order.card_name}" pour ${order.price} € !`);
  };

  const displayedListings = showOnlyFavorites
    ? listings.filter((l) => favorites.has(l.card_id))
    : listings;

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          padding: '16px 24px',
          borderRadius: '12px',
          border: '1px solid #6366f1',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 600,
          animation: 'modal-enter 0.25s ease-out',
        }}>
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
            <span className="logo-badge">NoSQL S3</span>
          </div>
        </div>

        {/* Search bar */}
        {currentView === 'marketplace' && (
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher (Dracaufeu, 151, Pikachu...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px', paddingRight: '16px', background: 'rgba(255, 255, 255, 0.05)' }}
            />
          </div>
        )}

        {/* Trainer profile selector (Redis session) and actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Profile badge and Redis session switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
          }}>
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
              title="Changer de session dresseur (Session stockée avec TTL dans Redis)"
            >
              <option value="sacha" style={{ background: '#121826' }}>🧢 Sacha (250€)</option>
              <option value="ondine" style={{ background: '#121826' }}>🌊 Ondine (480€)</option>
              <option value="chen" style={{ background: '#121826' }}>🧪 Prof. Chen (1500€)</option>
            </select>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(6,182,212,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              Redis Session
            </span>
          </div>

          <button
            onClick={() => setCurrentView(currentView === 'marketplace' ? 'admin' : 'marketplace')}
            className={`btn ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
          >
            {currentView === 'admin' ? <><Store size={18} /> Marketplace</> : <><BarChart3 size={18} /> Bilan Admin NoSQL</>}
          </button>

          <button onClick={() => setIsSellModalOpen(true)} className="btn btn-gold">
            <PlusCircle size={18} /> Vendre une carte
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
                Cartes Pokémon officielles • Extensions récentes
              </div>
              <h1 className="hero-title">
                Achetez & Vendez vos cartes <span>Pokémon</span> au juste prix.
              </h1>
              <p className="hero-subtitle">
                Marketplace Pokémon style Vinted haute performance combinant <strong>MongoDB</strong> (source de vérité documents JSON), <strong>Elasticsearch</strong> (recherche floue & analytics Grafana) et <strong>Redis</strong> (sessions, favoris, cache et top cartes en direct).
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => setIsSellModalOpen(true)} className="btn btn-gold" style={{ padding: '12px 28px' }}>
                  <PlusCircle size={18} /> Mettre une carte en vente
                </button>
                <button onClick={() => setCurrentView('admin')} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
                  <BarChart3 size={18} /> Consulter le Bilan Admin NoSQL
                </button>
              </div>
            </div>
          </section>

          {/* Live top 5 trending cards (Redis ZSET) */}
          <TrendingBar onSelectCard={(card) => setSearchQuery(card.name)} />

          {/* Advanced filters bar and cache latency benchmark */}
          <div className="filters-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginRight: '8px' }}>
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

            {/* Favorites filter (Redis Set) */}
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`btn ${showOnlyFavorites ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Heart size={15} fill={showOnlyFavorites ? '#ffffff' : 'none'} />
              Mes Favoris ({favorites.size})
            </button>

            {/* Redis cache and Elasticsearch response time indicator */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  ? `⚡ Cache Redis HIT (${cacheMetrics.timeMs} ms)`
                  : `🔍 Elasticsearch Query (${cacheMetrics.timeMs} ms)`}
              </div>

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
              <p style={{ color: 'var(--text-secondary)' }}>Interrogation d'Elasticsearch & MongoDB...</p>
            </div>
          ) : displayedListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              <Sparkles size={40} color="var(--accent-gold)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
                {showOnlyFavorites ? "Vous n'avez pas encore de cartes en favoris" : "Aucune annonce trouvée"}
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                {showOnlyFavorites
                  ? "Cliquez sur le cœur d'une carte pour l'enregistrer instantanément dans votre Set Redis !"
                  : "Soyez le premier dresseur à publier une annonce avec le formulaire !"}
              </p>
              <button onClick={() => { setShowOnlyFavorites(false); setIsSellModalOpen(true); }} className="btn btn-gold">
                <PlusCircle size={18} /> Vendre une carte maintenant
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
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
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}
