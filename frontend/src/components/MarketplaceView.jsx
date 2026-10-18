import React from 'react';
import {
  Sparkles,
  Filter,
  Search,
  RefreshCw,
  Store,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Heart,
  X,
  Database,
  Layers,
  Zap,
} from 'lucide-react';
import PokemonCard3D from './PokemonCard3D';
import TrendingBar from './TrendingBar';
import {
  getSavedMarketplaceScroll,
  restoreMarketplaceScroll,
  saveMarketplaceScroll,
} from '../utils/scrollRestoration';

export default function MarketplaceView({
  listings = [],
  displayedListings = [],
  isInitialLoading = false,
  isFetching = false,
  fetchData = () => {},
  cacheMetrics = { hit: false, timeMs: 0, source: 'elasticsearch' },
  searchQuery = '',
  setSearchQuery = () => {},
  selectedSet = '',
  setSelectedSet = () => {},
  selectedCondition = '',
  setSelectedCondition = () => {},
  sortBy = 'created_at',
  setSortBy = () => {},
  sortOrder = 'desc',
  setSortOrder = () => {},
  showOnlyFavorites = false,
  setShowOnlyFavorites = () => {},
  favoriteListingsCount = 0,
  hasActiveFilters = false,
  handleResetFilters = () => {},
  favorites = new Set(),
  isCardInFavorites = null,
  handleToggleFavorite = () => {},
  handleCardSelected = () => {},
  handleQuickBuy = () => {},
  currentUser = null,
  onDeleteListing = null,
}) {
  // Dynamic list of available sets (without duplicate 30 ans classique)
  const availableSets = React.useMemo(() => {
    const knownSets = [
      'Évolutions Prismatiques',
      'Étincelles Déferlantes',
      'Couronne Stellaire',
      'Fable Nébuleuse',
      'Mascarade Crépusculaire',
      'Forces Temporelles',
      'Destinées de Paldea',
      '151',
      '30 ans Pokémon',
      'Héros Transcendants',
      'Flammes Fantasmagoriques (ME-02)',
    ];
    const fromListings = (listings || []).map((l) => l.set_name).filter(Boolean);
    return Array.from(new Set([...knownSets, ...fromListings]));
  }, [listings]);

  // Pagination State - restores previously active page if returning from card inspection
  const [currentPage, setCurrentPage] = React.useState(() => {
    const saved = getSavedMarketplaceScroll();
    return saved?.page && typeof saved.page === 'number' ? saved.page : 1;
  });
  const [pageSize, setPageSize] = React.useState(24);
  const isRestorationDoneRef = React.useRef(false);

  // Restore scroll position when listings are loaded and DOM has rendered
  React.useEffect(() => {
    if (displayedListings.length > 0 && !isRestorationDoneRef.current) {
      isRestorationDoneRef.current = true;
      restoreMarketplaceScroll();
    }
  }, [displayedListings.length, currentPage]);

  // Reset to first page ONLY when search, filter, or sorting actively changes after mount
  const prevFiltersRef = React.useRef({
    searchQuery,
    selectedSet,
    selectedCondition,
    showOnlyFavorites,
    sortBy,
    sortOrder,
  });

  React.useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.searchQuery !== searchQuery ||
      prev.selectedSet !== selectedSet ||
      prev.selectedCondition !== selectedCondition ||
      prev.showOnlyFavorites !== showOnlyFavorites ||
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder
    ) {
      setCurrentPage(1);
      prevFiltersRef.current = {
        searchQuery,
        selectedSet,
        selectedCondition,
        showOnlyFavorites,
        sortBy,
        sortOrder,
      };
    }
  }, [searchQuery, selectedSet, selectedCondition, showOnlyFavorites, sortBy, sortOrder]);

  const totalItems = displayedListings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedListings = React.useMemo(() => {
    return displayedListings.slice(startIndex, endIndex);
  }, [displayedListings, startIndex, endIndex]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    saveMarketplaceScroll({ page: newPage });
    const hub = document.querySelector('.marketplace-control-hub');
    if (hub) {
      hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const marketTabsRef = React.useRef(null);
  const [marketCanScrollLeft, setMarketCanScrollLeft] = React.useState(false);
  const [marketCanScrollRight, setMarketCanScrollRight] = React.useState(true);

  const checkMarketScroll = () => {
    const el = marketTabsRef.current;
    if (!el) return;
    setMarketCanScrollLeft(el.scrollLeft > 6);
    setMarketCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  React.useEffect(() => {
    checkMarketScroll();
    const handleResize = () => checkMarketScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [availableSets, listings]);

  const scrollMarketTabs = (offset) => {
    if (marketTabsRef.current) {
      marketTabsRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkMarketScroll, 200);
    }
  };

  return (
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
            Authentification certifiée, indexation plein-texte Elasticsearch en temps réel, transactions atomiques sans double dépense et classement tendance Redis.
          </p>
        </div>
      </section>

      {/* Redis Live Trending Bar */}
      <TrendingBar onSelectCard={handleCardSelected} />

      {/* Marketplace Control Hub (Unified Glassmorphic Command Bar) */}
      <section className="marketplace-control-hub">
        {/* Top Header Row: Live Stats Left & Cluster Telemetry Right */}
        <div className="hub-header-row">
          <div className="hub-stats-left">
            <span className="live-pulse-dot" />
            <span className="hub-title">Marketplace en direct</span>
            <span className="hub-count-pill">
              {showOnlyFavorites
                ? `${displayedListings.length} ${displayedListings.length > 1 ? 'annonces favorites' : 'annonce favorite'}`
                : `${listings.length} cartes en vente`}
            </span>
            {searchQuery && (
              <span className="hub-active-query-tag">Recherche : « {searchQuery} »</span>
            )}
          </div>

          <div className="hub-telemetry-right">
            <div className="hub-telemetry-capsule">
              <span className="telemetry-item">
                <Database size={13} className="text-sky-400" /> Elasticsearch
              </span>
              <span className="telemetry-separator">•</span>
              <span className={`telemetry-cache-badge ${cacheMetrics.hit ? 'hit' : 'miss'}`}>
                <Zap size={12} /> Redis {cacheMetrics.hit ? 'HIT' : 'MISS'}
              </span>
              <span className="telemetry-separator">•</span>
              <span className="telemetry-item telemetry-latency">
                {cacheMetrics.timeMs.toFixed(1)} ms
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hub-divider" />

        {/* Controls Row: Filters on Left | Sorting on Right */}
        <div className="hub-controls-row">
          {/* Left: Filters Group */}
          <div className="hub-filters-group">
            {/* Inline Quick Search inside Control Hub */}
            <div className="hub-search-wrapper">
              <Search size={14} className="hub-search-icon" />
              <input
                type="text"
                placeholder="Rechercher carte, rareté..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hub-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hub-search-clear"
                  title="Effacer la recherche"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="hub-label">
              <Filter size={14} />
              <span>Filtres</span>
            </div>

            {/* Set Filter */}
            <div className="hub-select-wrapper">
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="hub-select"
              >
                <option value="">Toutes les extensions ({availableSets.length})</option>
                {availableSets.map((setName) => (
                  <option key={setName} value={setName}>
                    {setName}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="hub-select-arrow" />
            </div>

            {/* Condition Filter */}
            <div className="hub-select-wrapper">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="hub-select"
              >
                <option value="">Tous les états</option>
                <option value="MINT">💎 Mint (Parfait)</option>
                <option value="NEAR_MINT">✨ Near Mint</option>
                <option value="EXCELLENT">👍 Excellent</option>
                <option value="GOOD">👌 Good</option>
                <option value="PLAYED">⚡ Played</option>
              </select>
              <ChevronDown size={14} className="hub-select-arrow" />
            </div>

            {/* Favorites Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !showOnlyFavorites;
                setShowOnlyFavorites(nextVal);
                if (nextVal) {
                  setSelectedSet('');
                }
              }}
              className={`hub-toggle-btn ${showOnlyFavorites ? 'active-favorites' : ''}`}
              title="Filtrer uniquement mes annonces favorites"
            >
              <Heart
                size={14}
                fill={showOnlyFavorites ? '#ef4444' : favoriteListingsCount > 0 ? '#ef4444' : 'none'}
                color={showOnlyFavorites ? '#ef4444' : favoriteListingsCount > 0 ? '#ef4444' : 'currentColor'}
              />
              <span>Favoris</span>
              {favoriteListingsCount > 0 && (
                <span className="hub-badge-count">{favoriteListingsCount}</span>
              )}
            </button>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="hub-reset-chip"
                title="Réinitialiser tous les filtres"
              >
                <X size={13} />
                <span>Effacer</span>
              </button>
            )}
          </div>

          {/* Right: Sorting Group */}
          <div className="hub-sort-group">
            <div className="hub-label">
              <ArrowUpDown size={14} />
              <span>Trier par</span>
            </div>

            <div className="hub-select-wrapper">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="hub-select"
              >
                <option value="created_at">Plus récentes</option>
                <option value="price">Prix</option>
                <option value="rarity">Rareté</option>
              </select>
              <ChevronDown size={14} className="hub-select-arrow" />
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="hub-action-btn"
              title="Inverser le sens du tri"
            >
              {sortOrder === 'desc' ? '↓ Décroissant' : '↑ Croissant'}
            </button>

            <button
              type="button"
              disabled={isFetching}
              onClick={fetchData}
              className="hub-action-btn hub-btn-icon-only disabled:opacity-50 cursor-pointer"
              title="Actualiser les annonces"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin text-indigo-400" : ""} />
            </button>
          </div>
        </div>

        {/* Extensions Ribbon Navigator with Left/Right Buttons and Wheel Scroll */}
        <div className="hub-extensions-ribbon">
          <button
            type="button"
            onClick={() => scrollMarketTabs(-220)}
            disabled={!marketCanScrollLeft}
            aria-label="Défiler vers la gauche"
            className="hub-ribbon-arrow left"
            title="Défiler vers la gauche"
          >
            <ChevronLeft size={14} />
          </button>

          <div
            ref={marketTabsRef}
            onScroll={checkMarketScroll}
            onWheel={(e) => {
              if (e.deltaY !== 0 && marketTabsRef.current) {
                marketTabsRef.current.scrollLeft += e.deltaY;
                checkMarketScroll();
              }
            }}
            className="hub-ribbon-track no-scrollbar"
          >
            <button
              type="button"
              onClick={() => setSelectedSet('')}
              className={`hub-ribbon-pill ${!selectedSet ? 'active' : ''}`}
            >
              Toutes les extensions ({availableSets.length})
            </button>
            {availableSets.map((setName) => {
              const isSelected = selectedSet === setName;
              return (
                <button
                  key={setName}
                  type="button"
                  onClick={() => setSelectedSet(setName)}
                  className={`hub-ribbon-pill ${isSelected ? 'active' : ''}`}
                >
                  {setName}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollMarketTabs(220)}
            disabled={!marketCanScrollRight}
            aria-label="Défiler vers la droite"
            className="hub-ribbon-arrow right"
            title="Défiler vers la droite"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Subtle animated progress bar during filter/sort updates */}
        {isFetching && <div className="hub-progress-bar" />}
      </section>

      {/* Cards catalog grid */}
      {isInitialLoading && listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0', minHeight: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw className="animate-spin" size={40} style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Connexion au cluster NoSQL & chargement des cartes...</p>
        </div>
      ) : displayedListings.length === 0 ? (
        showOnlyFavorites ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.25)', animation: 'card-appear 0.25s ease-out' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <Heart size={44} style={{ color: '#ef4444' }} fill="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
              {favorites.size === 0
                ? "Vous n'avez aucune annonce en favoris pour le moment"
                : "Aucune de vos annonces favorites ne correspond aux filtres actifs"}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {favorites.size === 0
                ? "Cliquez sur l'icône cœur en haut à gauche de n'importe quelle annonce pour l'enregistrer dans votre liste de favoris et la retrouver facilement ici."
                : "Essayez de réinitialiser l'extension ou les critères de recherche pour afficher toutes vos annonces favorites."}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowOnlyFavorites(false);
                handleResetFilters();
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Sparkles size={16} />
              <span>Explorer le catalogue</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', animation: 'card-appear 0.25s ease-out' }}>
            <Store size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Aucune carte ne correspond à votre recherche
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Essayez d'ajuster vos critères ou réinitialisez les filtres.
            </p>
            <button onClick={handleResetFilters} className="btn btn-secondary">
              Réinitialiser les filtres
            </button>
          </div>
        )
      ) : (
        <>
          <div className={`cards-grid ${isFetching ? 'is-updating' : ''}`}>
            {paginatedListings.map((item, idx) => (
              <div
                key={item.id}
                style={{ animationDelay: `${Math.min(idx * 0.03, 0.2)}s` }}
                className="card-appear-wrapper"
              >
                <PokemonCard3D
                  listing={item}
                  isFavorite={isCardInFavorites ? isCardInFavorites(item) : favorites.has(item.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onSelect={(cardItem) => {
                    saveMarketplaceScroll({ listing: cardItem, page: safeCurrentPage });
                    if (handleCardSelected) {
                      handleCardSelected(cardItem);
                    }
                  }}
                  onQuickBuy={handleQuickBuy}
                  currentUser={currentUser}
                  onDeleteListing={onDeleteListing}
                />
              </div>
            ))}
          </div>

          {/* Pagination Navigation Bar */}
          {totalPages > 1 && (
            <div className="marketplace-pagination">
              {/* Pagination Info */}
              <div className="pagination-info">
                Affichage <strong className="text-white font-semibold">{startIndex + 1}–{endIndex}</strong> sur <strong className="text-white font-semibold">{totalItems}</strong> cartes
                <span className="pagination-page-indicator">Page {safeCurrentPage} / {totalPages}</span>
              </div>

              {/* Page Number Controls */}
              <div className="pagination-controls">
                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  disabled={safeCurrentPage <= 1}
                  className="pagination-btn"
                  title="Page précédente"
                >
                  <ChevronLeft size={15} />
                  <span>Précédent</span>
                </button>

                <div className="pagination-pages-list">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const isEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {isEllipsis && <span className="pagination-ellipsis">…</span>}
                          <button
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`pagination-page-num ${safeCurrentPage === p ? 'active' : ''}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  disabled={safeCurrentPage >= totalPages}
                  className="pagination-btn"
                  title="Page suivante"
                >
                  <span>Suivant</span>
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Items per page selector */}
              <div className="pagination-size-selector">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="pagination-select"
                  title="Nombre d'annonces par page"
                >
                  <option value={24}>24 / page</option>
                  <option value={48}>48 / page</option>
                  <option value={96}>96 / page</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {/* Marketplace footer */}
      <footer style={{ marginTop: '60px', padding: '32px 0 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div>
          <strong>PokéVinted</strong> — La marketplace officielle de référence des cartes Pokémon.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>© 2026 PokéVinted — ENSIIE S3 NoSQL</span>
        </div>
      </footer>
    </main>
  );
}
