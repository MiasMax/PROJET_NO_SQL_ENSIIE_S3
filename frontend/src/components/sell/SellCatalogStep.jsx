import React, { useRef, useState, useEffect } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import Button from '../ui/Button';

export default function SellCatalogStep({
  catalog,
  filteredCatalog,
  availableSets,
  selectedCard,
  selectedCardId,
  searchQuery,
  setSearchQuery,
  selectedSet,
  setSelectedSet,
  sortBy,
  setSortBy,
  onSelectCard,
  onDoubleSelectCard,
  onNextStep,
}) {
  const chipsContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkChipsScroll = () => {
    const el = chipsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkChipsScroll();
    window.addEventListener('resize', checkChipsScroll);
    return () => window.removeEventListener('resize', checkChipsScroll);
  }, [availableSets, catalog]);

  const scrollChips = (offset) => {
    if (chipsContainerRef.current) {
      chipsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkChipsScroll, 200);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-5 space-y-3.5 flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <label htmlFor="sell-catalog-search" className="sr-only">Rechercher dans le catalogue</label>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
            <input
              id="sell-catalog-search"
              type="text"
              placeholder="Rechercher par nom (ex: Dracaufeu) ou n° (#199)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input pl-9 pr-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neo-ink-3 hover:text-neo-ink cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrer par extension"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="neo-input w-auto h-9 py-0 text-xs max-w-[175px]"
            >
              <option value="ALL">Toutes ({availableSets.length})</option>
              {availableSets.map((setName) => (
                <option key={setName} value={setName}>
                  {setName}
                </option>
              ))}
            </select>

            <div className="relative flex items-center">
              <SlidersHorizontal size={13} className="absolute left-2.5 text-neo-ink-3 pointer-events-none" aria-hidden="true" />
              <select
                aria-label="Trier le catalogue"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="neo-input w-auto h-9 py-0 pl-8 text-xs"
              >
                <option value="cote_desc">Cote décroissante</option>
                <option value="cote_asc">Cote croissante</option>
                <option value="name_asc">Nom (A-Z)</option>
                <option value="number">Numéro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Extensions Ribbon */}
        <div className="flex items-center gap-1.5 bg-neo-muted p-1.5 rounded-[6px] border border-neo-border">
          <button
            type="button"
            onClick={() => scrollChips(-240)}
            disabled={!canScrollLeft}
            aria-label="Extensions précédentes"
            className="w-7 h-7 rounded-[4px] border border-neo-border bg-neo-surface text-neo-ink-2 hover:border-neo-cobalt disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>

          <div
            ref={chipsContainerRef}
            onScroll={checkChipsScroll}
            onWheel={(e) => {
              if (e.deltaY !== 0 && chipsContainerRef.current) {
                chipsContainerRef.current.scrollLeft += e.deltaY;
                checkChipsScroll();
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1"
          >
            <button
              type="button"
              onClick={() => setSelectedSet('ALL')}
              className={`shrink-0 px-2.5 py-1 rounded-[5px] text-xs font-semibold border cursor-pointer transition-colors ${
                selectedSet === 'ALL'
                  ? 'bg-neo-ink text-neo-surface border-neo-ink'
                  : 'bg-neo-surface text-neo-ink-2 border-neo-border hover:border-neo-border-strong'
              }`}
            >
              Toutes ({catalog.length})
            </button>
            {availableSets.map((setName) => {
              const isSelected = selectedSet === setName;
              return (
                <button
                  key={setName}
                  type="button"
                  onClick={() => setSelectedSet(setName)}
                  className={`shrink-0 px-2.5 py-1 rounded-[5px] text-xs font-medium border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-neo-cobalt text-white border-neo-cobalt font-semibold'
                      : 'bg-neo-surface text-neo-ink-2 border-neo-border hover:border-neo-cobalt'
                  }`}
                >
                  {setName}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollChips(240)}
            disabled={!canScrollRight}
            aria-label="Extensions suivantes"
            className="w-7 h-7 rounded-[4px] border border-neo-border bg-neo-surface text-neo-ink-2 hover:border-neo-cobalt disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[260px] max-h-[400px]">
          {filteredCatalog.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-neo-ink">Aucune carte trouvée</p>
              <p className="text-xs text-neo-ink-3">
                Ajustez votre recherche « {searchQuery} » ou changez de série.
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSet('ALL');
                }}
              >
                Réinitialiser
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredCatalog.map((card) => {
                const isSelected = selectedCardId === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onSelectCard(card)}
                    onDoubleClick={() => onDoubleSelectCard(card)}
                    className={`relative flex flex-col text-left p-2.5 rounded-[6px] border-[1.5px] cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#EFF6FF] dark:bg-[#0B2545] border-neo-cobalt shadow-tactile-cobalt'
                        : 'bg-neo-surface border-neo-border hover:border-neo-border-strong'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-neo-cobalt text-white text-[10px] font-bold">
                        <Check size={10} strokeWidth={3} /> Choisie
                      </span>
                    )}

                    <div className="w-full h-32 bg-neo-muted rounded-[4px] border border-neo-border flex items-center justify-center p-1.5 mb-2">
                      <img
                        src={card.image_small || card.image_large || POKEMON_CARD_BACK_FALLBACK}
                        alt={card.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                        }}
                        className="max-h-28 w-auto object-contain rounded-[3px]"
                      />
                    </div>

                    <div className="text-[10px] text-neo-ink-3 flex items-center justify-between gap-1 w-full">
                      <span className="truncate">{card.set_name}</span>
                      <span className="font-mono shrink-0">{card.number}</span>
                    </div>
                    <div className="text-xs font-bold text-neo-ink truncate w-full mt-0.5">
                      {card.name}
                    </div>
                    <div className="flex items-center justify-between gap-1 w-full mt-1.5 pt-1.5 border-t border-neo-border">
                      <span className="text-[10px] text-neo-ink-3 truncate">{card.rarity}</span>
                      <span className="font-mono text-xs font-bold text-neo-ink tabular-nums">
                        {card.market_price ? formatPrice(card.market_price) : '-- €'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Selection Bar */}
      <div className="px-5 py-3.5 border-t-[1.5px] border-neo-border bg-neo-muted flex items-center justify-between gap-4 flex-wrap shrink-0">
        {selectedCard ? (
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={selectedCard.image_small || POKEMON_CARD_BACK_FALLBACK}
              alt={selectedCard.name}
              className="w-8 h-11 object-contain rounded-[3px] bg-neo-surface border border-neo-border shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-neo-ink truncate">
                {selectedCard.name} <span className="font-mono text-neo-ink-3">{selectedCard.number}</span>
              </div>
              <div className="text-[11px] text-neo-ink-3 truncate">
                {selectedCard.set_name} · Cote {formatPrice(selectedCard.market_price || 20)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-neo-ink-3">Sélectionnez une carte pour continuer.</span>
        )}

        <Button variant="primary" size="md" disabled={!selectedCard} onClick={onNextStep}>
          <span>Configurer le prix</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

