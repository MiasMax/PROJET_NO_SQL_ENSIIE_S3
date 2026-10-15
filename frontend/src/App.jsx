import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, SlidersHorizontal, BarChart3, Store, Sparkles, Filter, RefreshCw } from 'lucide-react';
import PokemonCard3D from './components/PokemonCard3D';
import SellCardModal from './components/SellCardModal';
import BuyModal from './components/BuyModal';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState('marketplace'); // 'marketplace' | 'admin'
  const [listings, setListings] = useState([]);
  const [catalogCards, setCatalogCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres de recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modales
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedListingForBuy, setSelectedListingForBuy] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Chargement du catalogue et des annonces
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Annonces avec filtres
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
      }
      if (resCards.ok) {
        const cards = await resCards.json();
        setCatalogCards(cards || []);
      }
    } catch (e) {
      console.error('Erreur chargement PokéVinted :', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedSet, selectedCondition, sortBy, sortOrder]);

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

      {/* Barre de navigation */}
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

        {/* Barre de recherche rapide */}
        {currentView === 'marketplace' && (
          <div style={{ position: 'relative', width: '360px', display: 'none', md: 'block' }}>
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

        {/* Actions de navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* Contenu principal selon la vue */}
      {currentView === 'admin' ? (
        <AdminDashboard onBackToMarketplace={() => setCurrentView('marketplace')} />
      ) : (
        <main className="container">
          {/* Bannière Hero */}
          <section className="hero-banner">
            <div style={{ maxWidth: '680px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '999px', fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '16px' }}>
                <Sparkles size={14} color="var(--accent-gold)" />
                Cartes Pokémon officielles • Extensions récentes
              </div>
              <h1 className="hero-title">
                Achetez & Vendez vos cartes <span>Pokémon</span> au juste prix.
              </h1>
              <p className="hero-subtitle">
                Le marketplace Pokémon style Vinted haute performance propulsé par <strong>MongoDB</strong> (source de vérité), <strong>Elasticsearch</strong> (recherche plein-texte) et <strong>Redis</strong> (cache & temps réel).
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => setIsSellModalOpen(true)} className="btn btn-gold" style={{ padding: '12px 28px' }}>
                  <PlusCircle size={18} /> Mettre une carte en vente
                </button>
                <button onClick={() => setCurrentView('admin')} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
                  <BarChart3 size={18} /> Consulter le Bilan Admin
                </button>
              </div>
            </div>
          </section>

          {/* Barre de Filtres Avancés */}
          <div className="filters-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginRight: '8px' }}>
              <Filter size={18} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Filtres :</span>
            </div>

            {/* Sélecteur Série / Extension */}
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

            {/* Sélecteur État */}
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="form-select"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="">Tous les états</option>
              <option value="MINT">💎 MINT (Parfait)</option>
              <option value="NEAR_MINT">✨ NEAR MINT</option>
              <option value="EXCELLENT">👍 EXCELLENT</option>
              <option value="GOOD">👌 GOOD</option>
              <option value="PLAYED">⚡ PLAYED</option>
            </select>

            {/* Tri */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Trier par :</span>
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

          {/* Grille des cartes en vente */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <RefreshCw className="animate-spin" size={32} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Interrogation d'Elasticsearch & MongoDB...</p>
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              <Sparkles size={40} color="var(--accent-gold)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Aucune annonce trouvée</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Soyez le premier dresseur à publier une annonce avec le formulaire !
              </p>
              <button onClick={() => setIsSellModalOpen(true)} className="btn btn-gold">
                <PlusCircle size={18} /> Vendre une carte maintenant
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
              {listings.map((item) => (
                <PokemonCard3D
                  key={item.id}
                  listing={item}
                  onSelect={(l) => setSelectedListingForBuy(l)}
                  onQuickBuy={(l) => setSelectedListingForBuy(l)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* Modales */}
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
