import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Tag,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Check,
  Zap,
  Layers,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { POKEMON_CARD_BACK_FALLBACK } from './PokemonCard3D';
import CardWearOverlay from './CardWearOverlay';

const CONDITIONS = [
  {
    value: 'MINT',
    label: 'Mint',
    emoji: '💎',
    badgeClass: 'badge-mint',
    tagline: 'Parfait état',
    multiplier: 1.05,
    pctLabel: '+5%',
    desc: 'Sortie de booster sous toploader, 0 défaut.',
  },
  {
    value: 'NEAR_MINT',
    label: 'Near Mint',
    emoji: '✨',
    badgeClass: 'badge-near-mint',
    tagline: 'Quasi neuf',
    multiplier: 1.00,
    pctLabel: '100% (Réf.)',
    desc: 'Infimes micro-défauts invisibles, non jouée.',
  },
  {
    value: 'EXCELLENT',
    label: 'Excellent',
    emoji: '👍',
    badgeClass: 'badge-excellent',
    tagline: 'Très bon état',
    multiplier: 0.80,
    pctLabel: '-20%',
    desc: 'Légers points blancs de bord ou micro-frottements.',
  },
  {
    value: 'GOOD',
    label: 'Good',
    emoji: '👌',
    badgeClass: 'badge-played',
    tagline: 'Bon état',
    multiplier: 0.60,
    pctLabel: '-40%',
    desc: 'Traces superficielles de manipulation, sans pliure.',
  },
  {
    value: 'PLAYED',
    label: 'Played',
    emoji: '⚡',
    badgeClass: 'badge-played',
    tagline: 'Jouée',
    multiplier: 0.45,
    pctLabel: '-55%',
    desc: 'Usure prononcée visible, idéale pour jeu ou classeur.',
  },
];

const CONDITION_MULTIPLIERS = {
  MINT: 1.05,
  NEAR_MINT: 1.00,
  EXCELLENT: 0.80,
  GOOD: 0.60,
  PLAYED: 0.45,
};

const QUICK_TAGS = [
  'Double sleeve + Toploader',
  'Envoi blindé sous bulles',
  'Sortie de booster',
  'Centrage parfait (Gradable)',
  'Envoi suivi sous 24h',
];

export default function SellCardModal({
  isOpen,
  onClose,
  onListingCreated,
  catalogCards = [],
  initialCardId = null,
  currentUser,
  onOpenLogin,
}) {
  // Stepper state: 1 = Visual Catalog Selection, 2 = Listing Pricing & Details
  const [step, setStep] = useState(1);

  // Catalog state
  const [catalog, setCatalog] = useState(catalogCards);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('ALL');
  const [sortBy, setSortBy] = useState('cote_desc');

  // Form details state
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('NEAR_MINT');
  const [sellerName, setSellerName] = useState(currentUser?.name || currentUser?.username || '');
  const [description, setDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync catalog cards if passed from parent or fetch fallback
  useEffect(() => {
    if (catalogCards && catalogCards.length > 0) {
      setCatalog(catalogCards);
    } else if (isOpen) {
      // Fallback fetch if catalogCards was not loaded
      fetch('/api/cards?limit=3000')
        .then((res) => (res.ok ? res.json() : []))
        .then((cards) => setCatalog(cards || []))
        .catch(() => {});
    }
  }, [catalogCards, isOpen]);

  // Sync current user name
  useEffect(() => {
    if (currentUser) {
      setSellerName(currentUser.name || currentUser.username || '');
    }
  }, [currentUser]);

  // Set default selected card (only when no specific card was requested)
  useEffect(() => {
    if (catalog.length > 0 && !selectedCardId && !initialCardId) {
      setSelectedCardId(catalog[0].id);
      setPrice(catalog[0].market_price ? catalog[0].market_price.toString() : '20');
    }
  }, [catalog, selectedCardId, initialCardId]);

  // Reset step when modal is opened. When a specific card was requested
  // (e.g. "Vendre cette carte" from a booster pull), the pre-select effect below
  // jumps straight to step 2, so only reset to step 1 for the generic flow.
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (!initialCardId) setStep(1);
    }
  }, [isOpen, initialCardId]);

  // Pre-select a card passed from the parent (booster pull) and jump to pricing.
  useEffect(() => {
    if (!isOpen || !initialCardId || catalog.length === 0) return;
    const card = catalog.find((c) => c.id === initialCardId);
    if (card) {
      setSelectedCardId(card.id);
      setPrice(card.market_price ? card.market_price.toFixed(2) : '20');
      setStep(2);
    } else {
      // Requested card not in catalog: fall back to manual selection.
      setStep(1);
    }
  }, [isOpen, initialCardId, catalog]);

  const selectedCard = useMemo(() => {
    return catalog.find((c) => c.id === selectedCardId) || catalog[0] || null;
  }, [catalog, selectedCardId]);

  // Extract distinct set names for chips filter
  const availableSets = useMemo(() => {
    const sets = new Set();
    (catalog || []).forEach((c) => {
      if (c.set_name) sets.add(c.set_name);
    });
    return Array.from(sets);
  }, [catalog]);

  const chipsContainerRef = React.useRef(null);
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
    const handleResize = () => checkChipsScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [availableSets, catalog, isOpen]);

  const scrollChips = (offset) => {
    if (chipsContainerRef.current) {
      chipsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkChipsScroll, 200);
    }
  };

  // Filtered & sorted catalog for Step 1 visual browser
  const filteredCatalog = useMemo(() => {
    let list = (catalog || []).filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.set_name?.toLowerCase().includes(q) ||
        c.number?.toLowerCase().includes(q) ||
        c.rarity?.toLowerCase().includes(q);

      const matchesSet = selectedSet === 'ALL' || c.set_name === selectedSet;
      return matchesSearch && matchesSet;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'cote_desc') return (b.market_price || 0) - (a.market_price || 0);
      if (sortBy === 'cote_asc') return (a.market_price || 0) - (b.market_price || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'number') return (a.number || '').localeCompare(b.number || '');
      return 0;
    });

    return list;
  }, [catalog, searchQuery, selectedSet, sortBy]);

  const currentConditionObj = useMemo(() => {
    return CONDITIONS.find((c) => c.value === condition) || CONDITIONS[1];
  }, [condition]);

  const conditionMultiplier = currentConditionObj.multiplier || 1.0;
  const baseMarketPrice = selectedCard?.market_price || 20;
  const conditionAdjustedPrice = Math.max(0.5, Math.round(baseMarketPrice * conditionMultiplier * 2) / 2);

  if (!isOpen) return null;

  const handleConditionChange = (newCondition) => {
    setCondition(newCondition);
    const target = CONDITIONS.find((c) => c.value === newCondition);
    const mult = target?.multiplier || 1.0;
    if (selectedCard?.market_price) {
      const computed = Math.max(0.5, Math.round(selectedCard.market_price * mult * 2) / 2);
      setPrice(computed.toFixed(2));
    }
  };

  const handleCardSelect = (card) => {
    setSelectedCardId(card.id);
    if (card.market_price) {
      const computed = Math.max(0.5, Math.round(card.market_price * conditionMultiplier * 2) / 2);
      setPrice(computed.toFixed(2));
    }
  };

  const handleCardDoubleSelect = (card) => {
    handleCardSelect(card);
    setStep(2);
  };

  // Pricing presets relative to condition-adjusted market value
  const applyPricePreset = (multiplier) => {
    if (!conditionAdjustedPrice) return;
    const computed = Math.max(0.5, Math.round(conditionAdjustedPrice * multiplier * 2) / 2);
    setPrice(computed.toFixed(2));
  };

  // Append quick description tag
  const appendQuickTag = (tagText) => {
    setDescription((prev) => {
      if (!prev) return tagText;
      if (prev.includes(tagText)) return prev;
      return `${prev.trim()} • ${tagText}`;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Veuillez vous connecter pour publier une annonce.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (!selectedCardId) {
      setError('Veuillez sélectionner une carte dans le catalogue.');
      setStep(1);
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Veuillez renseigner un prix de vente valide.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: selectedCardId,
          price: numericPrice,
          condition: condition,
          seller_name: sellerName || currentUser.name || 'Dresseur',
          description: description,
          custom_image_url: customImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Erreur lors de la création de l\'annonce');
      }

      const newListing = await response.json();
      onListingCreated(newListing);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-5xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header with Stepper */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c101c]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Mettre en vente une Carte Pokémon
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Parcourez le catalogue officiel, comparez les visuels et fixez votre prix.
              </p>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-full border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                step === 1
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>1. Choisir la carte</span>
              {catalog.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">
                  {catalog.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => selectedCard && setStep(2)}
              disabled={!selectedCard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                step === 2
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <Tag size={13} />
              <span>2. Prix & Détails</span>
              {selectedCard && (
                <CheckCircle2 size={12} className={step === 2 ? 'text-slate-950' : 'text-emerald-400'} />
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Guarantee sub-banner */}
        <div className="px-6 py-2.5 bg-indigo-500/[0.06] border-b border-white/[0.06] flex items-center justify-between text-xs text-indigo-200/90 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
            <span>
              <strong>0% de commission vendeur</strong> • Référencement instantané dans la recherche floue Elasticsearch.
            </span>
          </div>
          <div className="text-slate-400 text-[11px] hidden md:block">
            Double-cliquez sur une carte pour valider directement
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: VISUAL CATALOG BROWSER */}
        {step === 1 && (
          <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom (ex: Dracaufeu, Pikachu, Mew) ou n° (#199)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-900/90 border border-white/[0.1] rounded-xl text-slate-100 placeholder-slate-400 text-xs font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Controls: Quick Extension Jump & Sort Selector */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Direct Extension Dropdown Jump */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/[0.1] rounded-xl px-2.5 py-1.5">
                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Extension :</span>
                  <select
                    value={selectedSet}
                    onChange={(e) => setSelectedSet(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
                    title="Accès direct à une extension"
                  >
                    <option value="ALL" className="bg-slate-900">Toutes ({availableSets.length})</option>
                    {availableSets.map((setName) => (
                      <option key={setName} value={setName} className="bg-slate-900">
                        {setName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/[0.1] rounded-xl px-2.5 py-1.5">
                  <SlidersHorizontal size={13} className="text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="cote_desc" className="bg-slate-900">Cote : Plus élevée</option>
                    <option value="cote_asc" className="bg-slate-900">Cote : Plus abordable</option>
                    <option value="name_asc" className="bg-slate-900">Nom : A → Z</option>
                    <option value="number" className="bg-slate-900">Numéro de carte</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Extension / Series Filter Ribbon with Left/Right Buttons and Wheel Scroll */}
            <div className="relative flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/[0.06]">
              {/* Scroll Left Button */}
              <button
                type="button"
                onClick={() => scrollChips(-240)}
                disabled={!canScrollLeft}
                aria-label="Défiler vers la gauche"
                className={`p-1.5 rounded-xl border border-white/10 bg-slate-800/90 text-slate-300 transition-all shrink-0 ${
                  canScrollLeft
                    ? 'hover:bg-indigo-600 hover:text-white hover:border-indigo-500 cursor-pointer opacity-100 shadow-sm'
                    : 'opacity-20 cursor-not-allowed'
                }`}
                title="Défiler vers la gauche"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Scrollable Track with mouse-wheel support */}
              <div
                ref={chipsContainerRef}
                onScroll={checkChipsScroll}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && chipsContainerRef.current) {
                    chipsContainerRef.current.scrollLeft += e.deltaY;
                    checkChipsScroll();
                  }
                }}
                className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar text-xs select-none scroll-smooth flex-1"
              >
                <button
                  type="button"
                  onClick={() => setSelectedSet('ALL')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedSet === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/30'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
                  }`}
                >
                  Toutes les séries ({catalog.length})
                </button>
                {availableSets.map((setName) => {
                  const count = catalog.filter((c) => c.set_name === setName).length;
                  const isSelected = selectedSet === setName;
                  return (
                    <button
                      key={setName}
                      type="button"
                      onClick={() => setSelectedSet(setName)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/30 font-semibold'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
                      }`}
                    >
                      <span>{setName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-black/35 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Scroll Right Button */}
              <button
                type="button"
                onClick={() => scrollChips(240)}
                disabled={!canScrollRight}
                aria-label="Défiler vers la droite"
                className={`p-1.5 rounded-xl border border-white/10 bg-slate-800/90 text-slate-300 transition-all shrink-0 ${
                  canScrollRight
                    ? 'hover:bg-indigo-600 hover:text-white hover:border-indigo-500 cursor-pointer opacity-100 shadow-sm'
                    : 'opacity-20 cursor-not-allowed'
                }`}
                title="Défiler vers la droite"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Visual Card Catalog Grid */}
            <div className="flex-1 overflow-y-auto max-h-[440px] pr-1 scrollbar-thin">
              {filteredCatalog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <Search size={36} className="text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Aucune carte trouvée</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Aucun Pokémon ne correspond à votre filtre "{searchQuery}". Essayez un autre nom ou réinitialisez les filtres.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSet('ALL');
                    }}
                    className="mt-4 px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/15 text-xs text-slate-200 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredCatalog.map((card) => {
                    const isSelected = selectedCardId === card.id;
                    return (
                      <div
                        key={card.id}
                        onClick={() => handleCardSelect(card)}
                        onDoubleClick={() => handleCardDoubleSelect(card)}
                        className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-950/20 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/40'
                            : 'bg-[#151c2e]/70 hover:bg-[#1a233a] border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        {/* Selected Indicator Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                            <Check size={11} strokeWidth={3} />
                            <span>CHOISIE</span>
                          </div>
                        )}

                        {/* Card Artwork */}
                        <div className="w-full flex items-center justify-center py-2 h-36">
                          <img
                            src={card.image_small || card.image_large || POKEMON_CARD_BACK_FALLBACK}
                            alt={card.name}
                            className="max-h-32 w-auto object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-200 rounded"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK; }}
                          />
                        </div>

                        {/* Card Info */}
                        <div className="mt-2 pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                            <span className="truncate max-w-[120px]">{card.set_name}</span>
                            <span className="font-mono text-slate-300 font-semibold">{card.number}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                            {card.name}
                          </h4>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04]">
                            <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                              {card.rarity}
                            </span>
                            <span className="text-xs font-extrabold text-amber-400 tabular-nums">
                              {card.market_price ? `${card.market_price.toFixed(2)} €` : '-- €'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Bar: Selection Summary & Continue Button */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
              {selectedCard ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-12 rounded bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={selectedCard.image_small}
                      alt={selectedCard.name}
                      className="h-full w-auto object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{selectedCard.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{selectedCard.number}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{selectedCard.set_name}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">
                        Cote : {selectedCard.market_price ? `${selectedCard.market_price.toFixed(2)} €` : '20.00 €'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Sélectionnez une carte dans la grille ci-dessus pour continuer.
                </div>
              )}

              <button
                type="button"
                disabled={!selectedCard}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Étape suivante : Fixer le prix</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PRICING, CONDITION & LISTING DETAILS */}
        {step === 2 && selectedCard && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            {/* Selected Card Pill Banner */}
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-14 rounded-md bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow">
                  <img
                    src={selectedCard.image_small || selectedCard.image_large}
                    alt={selectedCard.name}
                    className="h-full w-auto object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">{selectedCard.name}</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                      {selectedCard.number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedCard.set_name} • <span className="text-slate-300">{selectedCard.rarity}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] text-slate-400">
                    Cote réf. (NM) : <span className="text-slate-300 font-medium">{baseMarketPrice.toFixed(2)} €</span>
                  </div>
                  <div className="text-sm font-bold text-amber-400 tabular-nums">
                    Estimée ({currentConditionObj.label}) : <span className="text-amber-300 font-extrabold">{conditionAdjustedPrice.toFixed(2)} €</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-200 transition-all cursor-pointer font-medium"
                  title="Revenir à la galerie de cartes"
                >
                  <RefreshCw size={12} />
                  <span>Changer de carte</span>
                </button>
              </div>
            </div>

            {/* Split Form & Live Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-6 p-6">
              {/* Left Column: Form Controls */}
              <div className="flex flex-col gap-5">
                {/* 1. Condition Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    1. État d'usure de votre carte
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CONDITIONS.map((c) => {
                      const isChosen = condition === c.value;
                      return (
                        <div
                          key={c.value}
                          onClick={() => handleConditionChange(c.value)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChosen
                              ? 'bg-indigo-600/15 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500'
                              : 'bg-slate-900/50 hover:bg-slate-900/90 border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{c.emoji}</span>
                              <span>{c.label}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300 ml-0.5">
                                {c.pctLabel}
                              </span>
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${c.badgeClass}`}>
                              {c.tagline}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-1">
                            {c.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Price in EUR + Smart Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      2. Prix de vente demandé (€)
                    </label>
                    <span className="text-xs text-amber-400 font-semibold">
                      0% de frais vendeur
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-4 pr-12 py-3 bg-[#162035] border border-white/10 rounded-xl text-slate-100 text-lg font-bold font-sans focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all tabular-nums"
                      placeholder="ex: 45.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base pointer-events-none">
                      €
                    </span>
                  </div>

                  {/* Smart Price Shortcuts (dynamically scaled by card condition) */}
                  {selectedCard?.market_price && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] text-slate-400">
                        Suggestions ({currentConditionObj.label}) :
                      </span>
                      <button
                        type="button"
                        onClick={() => applyPricePreset(0.9)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 font-semibold transition-colors cursor-pointer"
                        title={`Prix conseillé vente rapide (-10% de la cote ${currentConditionObj.label})`}
                      >
                        ⚡ Vente rapide (-10% : {(conditionAdjustedPrice * 0.9).toFixed(1)}€)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPricePreset(1.0)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-300 font-semibold transition-colors cursor-pointer"
                        title={`Cote de marché pour l'état ${currentConditionObj.label}`}
                      >
                        🎯 Cote exacte ({conditionAdjustedPrice.toFixed(1)}€)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPricePreset(1.15)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 font-semibold transition-colors cursor-pointer"
                        title={`Prix premium (+15% de la cote ${currentConditionObj.label})`}
                      >
                        💎 Neuf/Gradé (+15% : {(conditionAdjustedPrice * 1.15).toFixed(1)}€)
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Description & Quick Tags */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    3. Description & Atouts de la carte
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendQuickTag(tag)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#162035] border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-xs font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
                    placeholder="Précisez l'emballage, l'état précis du verso, toploader fourni..."
                  />
                </div>

                {/* 4. Seller Username */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    4. Vendeur
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-white/[0.08] rounded-xl text-xs text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white flex items-center justify-center font-bold text-[10px]">
                      {(sellerName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold">{sellerName || 'Dresseur Anonyme'}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20 font-bold ml-auto">
                      Dresseur Vérifié
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-time Buyer Mockup Preview */}
              <div className="flex flex-col items-center justify-between p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0e1424] border border-white/[0.08] text-center relative overflow-hidden">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider mb-3">
                  <span>Aperçu de votre annonce</span>
                  <span className="text-emerald-400 font-bold">En direct</span>
                </div>

                {/* Card Artwork in 3D frame */}
                <div className="w-48 my-2 relative group overflow-hidden rounded-lg">
                  <img
                    src={selectedCard.image_large || selectedCard.image_small}
                    alt={selectedCard.name}
                    className="w-full h-auto rounded-lg drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform duration-300"
                    style={{
                      filter: condition === 'PLAYED'
                        ? 'saturate(0.90) contrast(0.96)'
                        : condition === 'GOOD'
                        ? 'saturate(0.95)'
                        : 'none',
                    }}
                  />
                  {/* Physical condition wear overlay in sell preview */}
                  <CardWearOverlay condition={condition} />
                  <div className="absolute top-2 left-2 z-20">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md ${
                      CONDITIONS.find((c) => c.value === condition)?.badgeClass || 'badge-near-mint'
                    }`}>
                      {condition}
                    </span>
                  </div>
                </div>

                {/* Card details preview */}
                <div className="w-full mt-3 pt-3 border-t border-white/[0.06]">
                  <h4 className="text-sm font-bold text-slate-100 truncate">
                    {selectedCard.name}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedCard.set_name} • {selectedCard.number}
                  </p>

                  <div className="mt-3 text-2xl font-extrabold text-amber-400 tabular-nums">
                    {price && !isNaN(parseFloat(price)) ? `${parseFloat(price).toFixed(2)} €` : '-- €'}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400">
                    Vendeur : <strong className="text-slate-200">{sellerName || 'Vous'}</strong>
                  </div>

                  <div className="mt-3 py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                    🛡️ Vente garantie NoSQL sans double dépense
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar - Sticky so always accessible */}
            <div className="sticky bottom-0 z-20 px-6 py-3.5 bg-[#0c101c]/95 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-between gap-3 flex-wrap mt-auto">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Retour au catalogue</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Publication en cours...</span>
                ) : (
                  <>
                    <Zap size={15} fill="currentColor" />
                    <span>
                      Publier l'annonce ({price && !isNaN(parseFloat(price)) ? `${parseFloat(price).toFixed(2)} €` : '-- €'})
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
