import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { CONDITION_OPTIONS } from '../utils/format';
import {
  getSavedMarketplaceScroll,
  restoreMarketplaceScroll,
  saveMarketplaceScroll,
} from '../utils/scrollRestoration';
import PokemonCard3D from './PokemonCard3D';
import TrendingBar from './TrendingBar';
import Button from './ui/Button';
import PokedexLens from './ui/PokedexLens';

const KNOWN_SETS = [
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

export default function MarketplaceView() {
  const { currentUser, favorites, isCardInFavorites, handleToggleFavorite } = useAuth();
  const {
    listings,
    displayedListings,
    isInitialLoading,
    isFetching,
    fetchData,
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
    favoriteListingsCount,
    hasActiveFilters,
    handleResetFilters,
    handleCardSelected,
    handleQuickBuy,
    requestDeleteListing,
  } = useMarketplace();

  const availableSets = useMemo(() => {
    const fromListings = (listings || []).map((l) => l.set_name).filter(Boolean);
    return Array.from(new Set([...KNOWN_SETS, ...fromListings]));
  }, [listings]);

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = getSavedMarketplaceScroll();
    return saved?.page && typeof saved.page === 'number' ? saved.page : 1;
  });
  const [pageSize, setPageSize] = useState(24);
  const isRestorationDoneRef = useRef(false);

  useEffect(() => {
    if (displayedListings.length > 0 && !isRestorationDoneRef.current) {
      isRestorationDoneRef.current = true;
      restoreMarketplaceScroll();
    }
  }, [displayedListings.length, currentPage]);

  const prevFiltersRef = useRef({
    searchQuery,
    selectedSet,
    selectedCondition,
    showOnlyFavorites,
    sortBy,
    sortOrder,
  });

  useEffect(() => {
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

  const paginatedListings = useMemo(
    () => displayedListings.slice(startIndex, endIndex),
    [displayedListings, startIndex, endIndex]
  );

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    saveMarketplaceScroll({ page: newPage });
    document.getElementById('marketplace-controls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const marketTabsRef = useRef(null);
  const [marketCanScrollLeft, setMarketCanScrollLeft] = useState(false);
  const [marketCanScrollRight, setMarketCanScrollRight] = useState(true);

  const checkMarketScroll = () => {
    const el = marketTabsRef.current;
    if (!el) return;
    setMarketCanScrollLeft(el.scrollLeft > 6);
    setMarketCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkMarketScroll();
    window.addEventListener('resize', checkMarketScroll);
    return () => window.removeEventListener('resize', checkMarketScroll);
  }, [availableSets, listings]);

  const scrollMarketTabs = (offset) => {
    if (marketTabsRef.current) {
      marketTabsRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkMarketScroll, 200);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Pokédex Index Strip */}
      <section className="neo-panel overflow-hidden mb-6">
        <div className="h-1 bg-neo-vermilion w-full" aria-hidden="true" />
        <div className="p-4 sm:px-6 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <PokedexLens compact />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neo-lens">
                Pokédex Marché · Entrées vérifiées
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neo-ink leading-tight">
              Cartes Pokémon à l’unité entre collectionneurs
            </h1>
            <p className="text-sm text-neo-ink-3 mt-1 leading-relaxed">
              Comparez l’état réel de chaque exemplaire, négociez directement avec le vendeur et réglez sans frais cachés.
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neo-border">
            <div>
              <div className="font-mono text-base font-bold text-neo-ink tabular-nums">
                #{String(listings.length).padStart(3, '0')}
              </div>
              <div className="text-xs text-neo-ink-3">entrées actives</div>
            </div>
            <div className="w-px h-7 bg-neo-border" aria-hidden="true" />
            <div>
              <div className="font-mono text-base font-bold text-neo-lens tabular-nums">
                {cacheMetrics.timeMs.toFixed(1)} ms
              </div>
              <div className="text-xs text-neo-ink-3">
                {cacheMetrics.hit ? 'cache direct' : 'index'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Strip */}
      <TrendingBar onSelectCard={handleCardSelected} />

      {/* Control Bar & Filters */}
      <section
        id="marketplace-controls"
        aria-label="Filtres et tri du catalogue"
        className="neo-panel p-4 mb-6 space-y-3 relative"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-neo-ink">Catalogue</span>
            <span className="px-2 py-0.5 rounded-[5px] bg-neo-muted border border-neo-border font-mono text-xs font-semibold text-neo-ink-2">
              {showOnlyFavorites
                ? `${displayedListings.length} favori${displayedListings.length > 1 ? 's' : ''}`
                : `${displayedListings.length} résultat${displayedListings.length > 1 ? 's' : ''}`}
            </span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-[5px] bg-[#FEF3C7] dark:bg-[#422006] border border-[#FCD34D] dark:border-[#B45309] text-xs font-semibold text-[#92400E] dark:text-[#FDE68A]">
                « {searchQuery} »
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <label htmlFor="sort-by-select" className="sr-only">Trier par</label>
              <select
                id="sort-by-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-border-strong rounded-[6px] h-9 pl-3 pr-8 text-xs font-semibold text-neo-ink cursor-pointer"
              >
                <option value="created_at">Plus récentes</option>
                <option value="price">Prix</option>
                <option value="name">Nom</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none" aria-hidden="true" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              title="Inverser l'ordre de tri"
            >
              <ArrowUpDown size={13} aria-hidden="true" />
              <span>{sortOrder === 'desc' ? 'Décroissant' : 'Croissant'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={fetchData}
              aria-label="Actualiser les annonces"
              className="px-2.5"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin text-neo-cobalt' : ''} aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-neo-border">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <label htmlFor="hub-search" className="sr-only">Filtrer les annonces</label>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none" aria-hidden="true" />
            <input
              id="hub-search"
              type="text"
              placeholder="Filtrer par nom ou rareté…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-8 bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] text-xs text-neo-ink placeholder:text-neo-ink-3 focus:bg-neo-surface focus:outline-none focus:border-neo-cobalt"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer le filtre texte"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neo-ink-3 hover:text-neo-ink cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-neo-ink-3">
            <Filter size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Filtres</span>
          </div>

          <div className="relative">
            <label htmlFor="filter-set" className="sr-only">Extension</label>
            <select
              id="filter-set"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="appearance-none bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-border-strong rounded-[6px] h-9 pl-3 pr-8 text-xs font-medium text-neo-ink cursor-pointer max-w-[210px] truncate"
            >
              <option value="">Toutes les extensions ({availableSets.length})</option>
              {availableSets.map((setName) => (
                <option key={setName} value={setName}>
                  {setName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none" aria-hidden="true" />
          </div>

          <div className="relative">
            <label htmlFor="filter-condition" className="sr-only">État de la carte</label>
            <select
              id="filter-condition"
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="appearance-none bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-border-strong rounded-[6px] h-9 pl-3 pr-8 text-xs font-medium text-neo-ink cursor-pointer"
            >
              <option value="">Tous les états</option>
              {CONDITION_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.tagline})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none" aria-hidden="true" />
          </div>

          <Button
            variant={showOnlyFavorites ? 'danger-outline' : 'outline'}
            size="sm"
            onClick={() => {
              const nextVal = !showOnlyFavorites;
              setShowOnlyFavorites(nextVal);
              if (nextVal) setSelectedSet('');
            }}
            aria-pressed={showOnlyFavorites}
          >
            <Heart
              size={13}
              className={showOnlyFavorites || favoriteListingsCount > 0 ? 'text-neo-vermilion fill-neo-vermilion' : ''}
              aria-hidden="true"
            />
            <span>Favoris</span>
            {favoriteListingsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-neo-alt font-mono text-[10px] font-bold">
                {favoriteListingsCount}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-neo-vermilion hover:bg-[#FEF2F2]">
              <X size={13} aria-hidden="true" />
              <span>Réinitialiser</span>
            </Button>
          )}
        </div>

        {/* Extensions Quick Ribbon */}
        <div className="flex items-center gap-1.5 pt-2.5 border-t border-neo-border">
          <button
            type="button"
            onClick={() => scrollMarketTabs(-220)}
            disabled={!marketCanScrollLeft}
            aria-label="Défiler les extensions vers la gauche"
            className="w-8 h-8 rounded-[6px] border-[1.5px] border-neo-border bg-neo-surface text-neo-ink-2 hover:border-neo-cobalt hover:text-neo-cobalt disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 cursor-pointer transition-colors"
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
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5"
          >
            <button
              type="button"
              onClick={() => setSelectedSet('')}
              className={`shrink-0 px-3 py-1.5 rounded-[6px] text-xs font-semibold border-[1.5px] whitespace-nowrap cursor-pointer transition-colors ${
                !selectedSet
                  ? 'bg-neo-ink text-neo-surface border-neo-ink'
                  : 'bg-neo-muted text-neo-ink-2 border-neo-border hover:border-neo-border-strong'
              }`}
            >
              Toutes ({availableSets.length})
            </button>
            {availableSets.map((setName) => {
              const isSelected = selectedSet === setName;
              return (
                <button
                  key={setName}
                  type="button"
                  onClick={() => setSelectedSet(setName)}
                  className={`shrink-0 px-3 py-1.5 rounded-[6px] text-xs font-semibold border-[1.5px] whitespace-nowrap cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-neo-cobalt text-white border-neo-cobalt'
                      : 'bg-neo-surface text-neo-ink-2 border-neo-border hover:border-neo-cobalt hover:text-neo-ink'
                  }`}
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
            aria-label="Défiler les extensions vers la droite"
            className="w-8 h-8 rounded-[6px] border-[1.5px] border-neo-border bg-neo-surface text-neo-ink-2 hover:border-neo-cobalt hover:text-neo-cobalt disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* Catalog Grid */}
      {isInitialLoading && listings.length === 0 ? (
        <div className="neo-panel py-24 text-center flex flex-col items-center justify-center">
          <RefreshCw className="animate-spin text-neo-cobalt mb-3" size={32} aria-hidden="true" />
          <p className="text-sm font-medium text-neo-ink-2">Chargement des annonces…</p>
        </div>
      ) : displayedListings.length === 0 ? (
        <div className="neo-panel py-16 px-6 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-[8px] bg-neo-muted border-[1.5px] border-neo-border flex items-center justify-center mx-auto mb-3 text-neo-ink-3">
            {showOnlyFavorites ? <Heart size={22} className="text-neo-vermilion" /> : <Store size={22} />}
          </div>
          <h2 className="text-lg font-bold text-neo-ink mb-1">
            {showOnlyFavorites
              ? favorites.size === 0
                ? 'Aucune annonce favorite'
                : 'Aucun favori ne correspond à vos filtres'
              : 'Aucune carte trouvée'}
          </h2>
          <p className="text-sm text-neo-ink-3 mb-5">
            {showOnlyFavorites && favorites.size === 0
              ? 'Enregistrez des annonces avec le cœur pour les suivre facilement ici.'
              : 'Modifiez votre recherche ou réinitialisez les filtres actifs.'}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setShowOnlyFavorites(false);
              handleResetFilters();
            }}
          >
            Voir tout le catalogue
          </Button>
        </div>
      ) : (
        <>
          <div
            className={`grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-150 ${
              isFetching ? 'opacity-65 pointer-events-none' : ''
            }`}
          >
            {paginatedListings.map((item) => (
              <PokemonCard3D
                key={item.id}
                listing={item}
                isFavorite={isCardInFavorites(item)}
                onToggleFavorite={handleToggleFavorite}
                onSelect={(cardItem) => {
                  saveMarketplaceScroll({ listing: cardItem, page: safeCurrentPage });
                  handleCardSelected(cardItem);
                }}
                onQuickBuy={handleQuickBuy}
                currentUser={currentUser}
                onDeleteListing={requestDeleteListing}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="neo-panel mt-8 px-4 py-3.5 flex items-center justify-between flex-wrap gap-3"
            >
              <div className="text-xs text-neo-ink-3 flex items-center gap-2">
                <span>
                  <strong className="font-mono text-neo-ink">{startIndex + 1}–{endIndex}</strong> sur{' '}
                  <strong className="font-mono text-neo-ink">{totalItems}</strong> annonces
                </span>
                <span className="px-2 py-0.5 rounded-[4px] bg-neo-muted border border-neo-border font-mono text-[11px] text-neo-ink-2">
                  Page {safeCurrentPage}/{totalPages}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  <span>Précédent</span>
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const isEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {isEllipsis && <span className="px-1 text-xs text-neo-ink-3">…</span>}
                        <button
                          type="button"
                          onClick={() => handlePageChange(p)}
                          aria-current={safeCurrentPage === p ? 'page' : undefined}
                          className={`w-9 h-9 rounded-[6px] border-[1.5px] font-mono text-xs font-bold cursor-pointer transition-colors ${
                            safeCurrentPage === p
                              ? 'bg-neo-cobalt text-white border-neo-cobalt'
                              : 'bg-neo-surface text-neo-ink-2 border-neo-border hover:border-neo-cobalt'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                >
                  <span>Suivant</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>

              <div>
                <label htmlFor="page-size-select" className="sr-only">Annonces par page</label>
                <select
                  id="page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-neo-surface border-[1.5px] border-neo-border rounded-[6px] h-9 px-2.5 text-xs font-medium text-neo-ink cursor-pointer"
                >
                  <option value={24}>24 / page</option>
                  <option value={48}>48 / page</option>
                  <option value={96}>96 / page</option>
                </select>
              </div>
            </nav>
          )}
        </>
      )}

      <footer className="mt-12 pt-5 border-t-[1.5px] border-neo-border flex flex-wrap items-center justify-between gap-3 text-xs text-neo-ink-3">
        <span>
          <strong className="text-neo-ink">PokéVinted</strong> — Achat & vente de cartes Pokémon entre collectionneurs
        </span>
        <span>ENSIIE S3 · 2026</span>
      </footer>
    </main>
  );
}
