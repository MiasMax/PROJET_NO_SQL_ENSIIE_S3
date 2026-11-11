import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  BarChart3,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronRight,
  Layers,
  Trash2,
  Search,
  RefreshCw,
  FastForward,
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../utils/cardFallback';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import PokedexLens from './ui/PokedexLens';
import BoosterFXCanvas from './booster/BoosterFXCanvas';
import BoosterPackFoil from './booster/BoosterPackFoil';
import PsaSlab from './booster/PsaSlab';
import Card3DInspectModal from './booster/Card3DInspectModal';
import PullRatesModal from './booster/PullRatesModal';
import {
  FALLBACK_SERIES,
  getRarityCfg,
  loadCollectionFromStorage,
  saveCollectionToStorage,
  clearLegacySharedBinderKey,
  playBoosterAudio,
} from './booster/boosterConstants';

export default function BoosterOpeningPage({ onClose, currentUser: propUser }) {
  const { currentUser: ctxUser } = useAuth();
  const currentUser = propUser !== undefined ? propUser : ctxUser;
  const isLoggedIn = Boolean(currentUser?.id || currentUser?.username);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [stage, setStage] = useState('SELECT_SERIES'); // SELECT_SERIES | TEAR_PACK | COSMIC_WARP | REVEAL_SLAB | SUMMARY_BINDER | BINDER_COLLECTION
  const [seriesList, setSeriesList] = useState(FALLBACK_SERIES);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [packCards, setPackCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [teaseStep, setTeaseStep] = useState(2); // 0: YEAR -> 1: RARITY -> 2: PSA SLAB
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [collection, setCollection] = useState(() => (isLoggedIn ? [] : loadCollectionFromStorage()));
  const [inspectCard, setInspectCard] = useState(null);
  const [showPullRates, setShowPullRates] = useState(false);
  const [muted, setMuted] = useState(false);
  const [burstTrigger, setBurstTrigger] = useState({ key: 0, color: '#DC2626', intensity: 40 });
  const [binderSearch, setBinderSearch] = useState('');
  const [binderFilter, setBinderFilter] = useState('ALL');
  const animTimersRef = useRef([]);

  const clearAnimTimers = useCallback(() => {
    animTimersRef.current.forEach((id) => clearTimeout(id));
    animTimersRef.current = [];
  }, []);

  const scheduleAnim = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      animTimersRef.current = animTimersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    animTimersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => () => clearAnimTimers(), [clearAnimTimers]);

  // Lock background page scroll while studio overlay is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const fetchServerCollection = useCallback(async () => {
    const token = localStorage.getItem('pokevinted_token');
    if (!token) {
      setCollection([]);
      return;
    }
    try {
      const res = await fetch('/api/analytics/boosters/collection', {
        headers: { 'x-session-token': token },
      });
      if (!res.ok) {
        if (res.status === 401) setCollection([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setCollection(data);
      } else if (Array.isArray(data?.cards)) {
        setCollection(data.cards);
      } else {
        setCollection([]);
      }
    } catch {
      // keep existing state on transient error
    }
  }, []);

  // Load booster series + account-scoped binder (MongoDB for logged-in members, isolated localStorage for guests)
  useEffect(() => {
    clearLegacySharedBinderKey();

    fetch('/api/analytics/boosters/series')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSeriesList(data);
        }
      })
      .catch(() => {});

    if (isLoggedIn) {
      setCollection([]);
      fetchServerCollection();
    } else {
      setCollection(loadCollectionFromStorage());
    }
  }, [isLoggedIn, currentUser?.id, currentUser?.username, fetchServerCollection]);

  // Re-sync server binder whenever opening the binder tab while logged in
  useEffect(() => {
    if (isLoggedIn && stage === 'BINDER_COLLECTION') {
      fetchServerCollection();
    }
  }, [isLoggedIn, stage, fetchServerCollection]);

  const mergeIntoCollection = useCallback(
    (pulledCards) => {
      setCollection((prev) => {
        const map = new Map();
        prev.forEach((item) => {
          const key = item.id || item.card_id || item.name;
          map.set(key, { ...item, count: item.count || 1 });
        });
        pulledCards.forEach((card) => {
          const key = card.id || card.card_id || card.name;
          if (map.has(key)) {
            const existing = map.get(key);
            map.set(key, { ...existing, count: (existing.count || 1) + 1 });
          } else {
            map.set(key, { ...card, count: 1 });
          }
        });
        const merged = Array.from(map.values());
        if (!isLoggedIn) {
          saveCollectionToStorage(merged);
        }
        return merged;
      });
    },
    [isLoggedIn]
  );

  const revealSlab = useCallback(
    (card) => {
      if (!card) return;
      setTeaseStep(2);
      const cfg = getRarityCfg(card);
      if (cfg.isHit) {
        playBoosterAudio('hit', muted);
        setIsScreenShaking(true);
        setBurstTrigger({
          key: Date.now(),
          color: cfg.accentHex,
          intensity: cfg.key === 'SECRET' ? 70 : 48,
        });
        scheduleAnim(() => setIsScreenShaking(false), 600);
      } else {
        playBoosterAudio('flip', muted);
      }
    },
    [muted, scheduleAnim]
  );

  const startTeaseForCard = useCallback(
    (card) => {
      clearAnimTimers();
      if (!card) return;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        revealSlab(card);
        return;
      }
      setTeaseStep(0);
      playBoosterAudio('tease_tick', muted);
      scheduleAnim(() => {
        setTeaseStep(1);
        playBoosterAudio('tease_tick', muted);
        scheduleAnim(() => {
          revealSlab(card);
        }, 480);
      }, 420);
    },
    [clearAnimTimers, muted, revealSlab, scheduleAnim]
  );

  const handleSkipTease = useCallback(() => {
    clearAnimTimers();
    const card = packCards[currentIdx];
    if (card) revealSlab(card);
  }, [clearAnimTimers, packCards, currentIdx, revealSlab]);

  const handleSelectSeries = (series) => {
    clearAnimTimers();
    setSelectedSeries({
      ...series,
      pack_image: series.pack_image || `/boosters/${series.id}.jpg`,
    });
    setPackCards([]);
    setCurrentIdx(0);
    setTeaseStep(2);
    setStage('TEAR_PACK');
  };

  const handleTearPack = async () => {
    if (!selectedSeries || isOpeningPack) return;
    clearAnimTimers();
    setIsOpeningPack(true);
    playBoosterAudio('tear', muted);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch(
        `/api/analytics/boosters/open?set_id=${encodeURIComponent(selectedSeries.id)}`,
        {
          method: 'POST',
          headers: token ? { 'x-session-token': token } : {},
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Impossible d'ouvrir ce booster.");
      }
      const data = await res.json();
      const cards = Array.isArray(data.cards) ? data.cards : Array.isArray(data) ? data : [];
      if (cards.length === 0) {
        throw new Error('Aucune carte tirée pour cette extension.');
      }

      setPackCards(cards);
      setCurrentIdx(0);
      mergeIntoCollection(cards);

      playBoosterAudio('supernova', muted);
      setBurstTrigger({ key: Date.now(), color: '#38BDF8', intensity: 64 });
      setStage('COSMIC_WARP');

      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      scheduleAnim(() => {
        setStage('REVEAL_SLAB');
        setIsOpeningPack(false);
        startTeaseForCard(cards[0]);
      }, reduced ? 160 : 1950);
    } catch (err) {
      showToast(err.message, 'error');
      setIsOpeningPack(false);
    }
  };

  const handleSkipWarp = () => {
    clearAnimTimers();
    setStage('REVEAL_SLAB');
    setIsOpeningPack(false);
    if (packCards[0]) {
      startTeaseForCard(packCards[0]);
    }
  };

  const handleNextCard = useCallback(() => {
    if (teaseStep < 2) {
      handleSkipTease();
      return;
    }
    if (currentIdx + 1 < packCards.length) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      startTeaseForCard(packCards[next]);
    } else {
      clearAnimTimers();
      playBoosterAudio('summary', muted);
      setStage('SUMMARY_BINDER');
    }
  }, [teaseStep, currentIdx, packCards, handleSkipTease, startTeaseForCard, clearAnimTimers, muted]);

  const handleRevealAll = () => {
    clearAnimTimers();
    playBoosterAudio('summary', muted);
    setStage('SUMMARY_BINDER');
  };

  // Keyboard shortcuts (Escape to close, Space/Enter/ArrowRight during reveal)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && document.querySelectorAll('[role="dialog"]').length <= 1) {
        onClose?.();
      } else if (
        (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') &&
        stage === 'REVEAL_SLAB' &&
        !inspectCard &&
        !showPullRates
      ) {
        e.preventDefault();
        handleNextCard();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, stage, inspectCard, showPullRates, handleNextCard]);

  const handleClearCollection = async () => {
    const ok = await confirm({
      title: 'Vider le classeur virtuel',
      description: isLoggedIn
        ? 'Toutes les cartes accumulées dans le classeur de ce compte seront supprimées.'
        : 'Toutes les cartes accumulées dans votre classeur invité local seront supprimées.',
      details: [{ label: 'Cartes stockées', value: String(binderTotalCount) }],
      confirmLabel: 'Vider le classeur',
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      if (isLoggedIn) {
        const token = localStorage.getItem('pokevinted_token');
        await fetch('/api/analytics/boosters/collection', {
          method: 'DELETE',
          headers: token ? { 'x-session-token': token } : {},
        }).catch(() => {});
      } else {
        saveCollectionToStorage([]);
      }
    } finally {
      setCollection([]);
      showToast('Classeur virtuel vidé.', 'info');
    }
  };

  const currentCard = packCards[currentIdx] || null;
  const currentRarityCfg = getRarityCfg(currentCard);

  const packStats = useMemo(() => {
    const totalValue = packCards.reduce(
      (acc, c) => acc + Number(c.market_price ?? c.price ?? c.reference_market_price ?? 0),
      0
    );
    const hits = packCards.filter((c) => getRarityCfg(c).isHit).length;
    return { totalValue, hits };
  }, [packCards]);

  const binderTotalCount = useMemo(
    () => collection.reduce((acc, c) => acc + (c.count || 1), 0),
    [collection]
  );

  const binderTotalValue = useMemo(
    () =>
      collection.reduce(
        (acc, c) =>
          acc + Number(c.market_price ?? c.price ?? c.reference_market_price ?? 0) * (c.count || 1),
        0
      ),
    [collection]
  );

  const filteredBinder = useMemo(() => {
    const q = binderSearch.trim().toLowerCase();
    return collection.filter((card) => {
      const cfg = getRarityCfg(card);
      if (binderFilter === 'HIT' && !cfg.isHit) return false;
      if (binderFilter === 'RARE_PLUS' && cfg.key !== 'SECRET' && cfg.key !== 'ULTRA') return false;
      if (q) {
        const nameMatch = (card.name || card.card_name || '').toLowerCase().includes(q);
        const setMatch = (card.set_name || '').toLowerCase().includes(q);
        return nameMatch || setMatch;
      }
      return true;
    });
  }, [collection, binderFilter, binderSearch]);

  const isArenaStage =
    stage === 'TEAR_PACK' || stage === 'COSMIC_WARP' || stage === 'REVEAL_SLAB';

  return (
    <div
      className={`fixed inset-0 z-[150] bg-neo-canvas text-neo-ink flex flex-col overflow-hidden ${
        isScreenShaking ? 'animate-[cameraShake_0.55s_ease-in-out]' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Simulateur d'ouverture de boosters Pokémon"
    >
      <BoosterFXCanvas
        activeBurstKey={burstTrigger.key}
        color={burstTrigger.color}
        intensity={burstTrigger.intensity}
      />

      {/* Top Studio Header — Pokédex Field Module */}
      <header className="h-16 bg-neo-surface border-t-[3px] border-t-neo-vermilion border-b-[1.5px] border-b-neo-border px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <PokedexLens compact />
          <div className="min-w-0">
            <h1 className="font-display text-sm sm:text-base font-bold text-neo-ink truncate">
              Studio d&apos;Ouverture de Boosters
            </h1>
            <p className="text-[11px] text-neo-ink-3 truncate hidden sm:block font-mono">
              {selectedSeries ? `${selectedSeries.name} · ${selectedSeries.set_code || selectedSeries.id}` : 'MODULES SCELLÉS · TIRAGE POKÉDEX'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowPullRates(true)}>
            <BarChart3 size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Probabilités</span>
          </Button>

          <Button
            variant={stage === 'BINDER_COLLECTION' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() =>
              setStage((prev) =>
                prev === 'BINDER_COLLECTION' ? 'SELECT_SERIES' : 'BINDER_COLLECTION'
              )
            }
          >
            <BookOpen size={15} aria-hidden="true" />
            <span>Classeur ({binderTotalCount})</span>
          </Button>

          <Button variant="subtle" size="sm" onClick={onClose}>
            <X size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Fermer</span>
          </Button>
        </div>
      </header>

      {/* Main Content Stage */}
      <div className={`flex-1 overflow-y-auto ${isArenaStage ? 'bg-[#090D16] text-white' : 'bg-neo-canvas'}`}>
        {/* STAGE 1: SELECT SERIES */}
        {stage === 'SELECT_SERIES' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-neo-cobalt">
                  Catalogue scellé
                </p>
                <h2 className="font-display text-2xl font-bold text-neo-ink tracking-tight mt-0.5">
                  Choisissez une extension à ouvrir
                </h2>
              </div>
              <p className="text-xs text-neo-ink-3">
                Les cartes tirées sont ajoutées automatiquement à votre classeur virtuel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {seriesList.map((series) => {
                const packImg = series.pack_image || `/boosters/${series.id}.jpg`;
                return (
                  <div
                    key={series.id}
                    className="bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-cobalt rounded-[8px] p-4 shadow-tactile-sm flex flex-col justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-20 h-28 rounded-[6px] bg-neo-muted border border-neo-border overflow-hidden shrink-0">
                        <img
                          src={packImg}
                          alt={series.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                          }}
                        />
                      </div>
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-[4px] bg-neo-muted border border-neo-border font-mono text-[11px] font-bold text-neo-ink-2">
                            {series.set_code || series.id.toUpperCase()}
                          </span>
                          {series.card_count && (
                            <span className="font-mono text-xs text-neo-ink-3 shrink-0">
                              {series.card_count} cartes
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-base font-bold text-neo-ink leading-snug">
                          {series.name}
                        </h3>
                        <p className="text-xs text-neo-ink-3">
                          Booster 10 cartes · Emplacement Hit garanti possible
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => handleSelectSeries(series)}
                    >
                      <span>Sélectionner ce booster</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 2: TEAR PACK */}
        {stage === 'TEAR_PACK' && selectedSeries && (
          <div className="min-h-full relative flex flex-col items-center justify-center px-4 py-8 gap-6 overflow-hidden">
            {/* Ambient radial spotlight */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 42%, rgba(56,189,248,0.16), transparent 60%)',
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <BoosterPackFoil
                series={selectedSeries}
                onTearComplete={handleTearPack}
                isOpening={isOpeningPack}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStage('SELECT_SERIES')}
                disabled={isOpeningPack}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Changer d&apos;extension</span>
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 3: COSMIC WARP & SUPERNOVA TUNNEL */}
        {stage === 'COSMIC_WARP' && selectedSeries && (
          <div className="min-h-full relative flex flex-col items-center justify-center overflow-hidden select-none">
            {/* Spinning conic warp tunnel */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vmax] h-[140vmax] opacity-40 pointer-events-none animate-[cosmicTunnelSpin_1.8s_linear_forwards]"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent, rgba(56,189,248,0.65), transparent, rgba(220,38,38,0.55), transparent, rgba(250,204,21,0.55), transparent)',
                maskImage: 'repeating-conic-gradient(from 0deg, #000 0deg 8deg, transparent 8deg 16deg)',
                WebkitMaskImage:
                  'repeating-conic-gradient(from 0deg, #000 0deg 8deg, transparent 8deg 16deg)',
              }}
            />

            {/* Radiant Center Light Beam */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.35)_0%,transparent_65%)] pointer-events-none" />

            {/* 3D Tumbling Booster Pack */}
            <div
              className="absolute left-1/2 top-1/2 pointer-events-none animate-[packTumble3D_1.6s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
              style={{ perspective: '1200px' }}
            >
              <div className="w-[260px] h-[410px] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(56,189,248,0.9)] border-2 border-white/60 relative bg-[#0F172A]">
                <img
                  src={selectedSeries.pack_image}
                  alt={selectedSeries.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                  }}
                />
                <div className="absolute top-12 left-0 right-0 h-2 bg-white shadow-[0_0_20px_#fff] animate-ping" />
              </div>
            </div>

            {/* Supernova Expansion Sphere */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none z-30 animate-[supernovaExpand_1.4s_ease-out_0.55s_forwards] opacity-0"
              style={{ background: 'radial-gradient(circle, #ffffff 0%, #67e8f9 45%, transparent 70%)' }}
            />

            {/* Scattered star sparks */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, idx) => (
                <div
                  key={idx}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white/90 animate-ping"
                  style={{
                    left: `${15 + ((idx * 29) % 70)}%`,
                    top: `${15 + ((idx * 37) % 70)}%`,
                    animationDelay: `${(idx % 5) * 120}ms`,
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSkipWarp}
              className="relative z-40 mt-auto mb-8 px-4 py-2 rounded-[6px] bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-mono font-bold text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FastForward size={13} aria-hidden="true" />
              <span>Passer l&apos;animation</span>
            </button>
          </div>
        )}

        {/* STAGE 4: GACHA TEASE & PSA SLAB REVEAL */}
        {stage === 'REVEAL_SLAB' && currentCard && (
          <div
            className="min-h-full relative flex flex-col items-center justify-center px-4 py-6 gap-4 overflow-hidden select-none"
            onClick={() => {
              if (teaseStep < 2) handleSkipTease();
            }}
          >
            {/* Overhead spotlight beam */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[620px] pointer-events-none opacity-45 animate-[spotlightGlow_3s_ease-in-out_infinite]"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.38) 0%, rgba(29,78,216,0.16) 45%, transparent 75%)',
              }}
            />

            {/* Counter header */}
            <div className="relative z-10 w-full max-w-md flex items-center justify-between text-xs font-mono">
              <span className="px-2.5 py-1 rounded-[5px] bg-white/10 border border-white/15 text-slate-200 font-bold">
                CARTE {currentIdx + 1} / {packCards.length}
              </span>
              <span className="text-slate-300 truncate max-w-[200px]">
                {selectedSeries?.name}
              </span>
            </div>

            {/* Tease Typography Sequence (ANNÉE -> RARETÉ -> SLAB) */}
            <div className="h-16 flex flex-col items-center justify-center text-center relative z-10">
              {teaseStep === 0 && (
                <div className="animate-[pulseTeaseText_0.35s_ease-out]">
                  <span className="text-[10px] font-mono font-bold tracking-[0.35em] text-slate-400 uppercase">
                    ANNÉE DE SORTIE
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-widest mt-0.5">
                    {currentCard.year || selectedSeries?.release_year || '2024'}
                  </h2>
                </div>
              )}

              {teaseStep === 1 && (
                <div className="animate-[pulseTeaseText_0.35s_ease-out]">
                  <span className="text-[10px] font-mono font-bold tracking-[0.35em] text-slate-400 uppercase">
                    RARETÉ DÉTECTÉE
                  </span>
                  <h2
                    className="text-2xl sm:text-3xl font-display font-bold tracking-wider mt-0.5 uppercase"
                    style={{ color: currentRarityCfg.accentHex }}
                  >
                    {currentCard.pull_rarity || currentCard.rarity || 'COMMUNE'}
                  </h2>
                </div>
              )}

              {teaseStep >= 2 && (
                <div className="animate-[pulseTeaseText_0.3s_ease-out] flex items-center gap-2">
                  {currentRarityCfg.isHit && (
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#DC2626] text-white font-mono text-xs font-bold">
                      HIT TIRÉ
                    </span>
                  )}
                  <span className="text-sm font-mono text-sky-300 font-bold">
                    {currentCard.slot_label || `Carte #${currentIdx + 1}`}
                  </span>
                </div>
              )}
            </div>

            {/* Revealed PSA Slab or Mystery Placeholder */}
            <div className="relative z-10 w-full max-w-[320px]">
              {teaseStep < 2 ? (
                <button
                  type="button"
                  onClick={handleSkipTease}
                  className="w-full aspect-[5/7] rounded-[12px] border-2 border-white/25 bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-pulse"
                >
                  <Sparkles size={32} className="text-sky-400 mb-3" aria-hidden="true" />
                  <p className="font-mono text-xs tracking-widest text-slate-300 uppercase">
                    Analyse du tirage…
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cliquer pour révéler immédiatement
                  </p>
                </button>
              ) : (
                <div className="animate-[slabRiseUp_0.45s_cubic-bezier(0.2,0.8,0.2,1)_forwards]">
                  <PsaSlab
                    card={currentCard}
                    series={selectedSeries}
                    revealed={true}
                    onInspect={(c) => setInspectCard(c)}
                  />
                </div>
              )}
            </div>

            <div className="relative z-10 flex items-center gap-2.5 flex-wrap justify-center pt-1">
              <Button variant="primary" size="md" onClick={handleNextCard}>
                <span>
                  {teaseStep < 2
                    ? 'Révéler maintenant'
                    : currentIdx + 1 < packCards.length
                    ? 'Carte suivante (Espace)'
                    : 'Voir le récapitulatif'}
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
              <Button variant="outline" size="md" onClick={handleRevealAll}>
                Tout révéler ({packCards.length})
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 5: PACK SUMMARY */}
        {stage === 'SUMMARY_BINDER' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-neo-cobalt">
                  Bilan de l&apos;ouverture · {selectedSeries?.name}
                </p>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="font-mono text-2xl font-bold text-neo-ink tabular-nums">
                    {formatPrice(packStats.totalValue)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-[5px] bg-[#FEF3C7] dark:bg-[#422006] border border-[#F59E0B] text-[#92400E] dark:text-[#FCD34D] font-mono text-xs font-bold">
                    {packStats.hits} Hit{packStats.hits > 1 ? 's' : ''} tiré{packStats.hits > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setStage('BINDER_COLLECTION')}>
                  <BookOpen size={15} aria-hidden="true" />
                  <span>Voir le classeur</span>
                </Button>
                <Button variant="primary" size="sm" onClick={() => setStage('TEAR_PACK')}>
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>Ouvrir un autre booster</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {packCards.map((card, i) => {
                const cfg = getRarityCfg(card);
                const imgUrl = card.image_large || card.image_small || card.image_url || POKEMON_CARD_BACK_FALLBACK;
                const priceVal = Number(card.market_price ?? card.price ?? card.reference_market_price ?? 0);
                return (
                  <button
                    key={`${card.id || card.name}-${i}`}
                    type="button"
                    onClick={() => setInspectCard(card)}
                    className={`bg-neo-surface border-[1.5px] rounded-[8px] p-2.5 text-left cursor-pointer transition-all hover:-translate-y-0.5 ${
                      cfg.isHit
                        ? 'border-neo-vermilion shadow-tactile'
                        : 'border-neo-border hover:border-neo-cobalt shadow-tactile-sm'
                    }`}
                  >
                    <div className="aspect-[5/7] rounded-[5px] bg-neo-muted overflow-hidden mb-2 relative">
                      <img
                        src={imgUrl}
                        alt={card.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                        }}
                      />
                      {cfg.isHit && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[4px] bg-neo-vermilion text-white font-mono text-[10px] font-bold">
                          HIT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-neo-ink truncate">{card.name}</p>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${cfg.badgeClass}`}>
                        {cfg.shortLabel}
                      </span>
                      <span className="font-mono text-xs font-bold text-neo-ink tabular-nums">
                        {formatPrice(priceVal)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 6: BINDER COLLECTION */}
        {stage === 'BINDER_COLLECTION' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
            <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold text-neo-ink">
                    {isLoggedIn
                      ? `Classeur de ${currentUser.name || currentUser.username}`
                      : 'Classeur Invité'} ({binderTotalCount} cartes)
                  </h2>
                  <span className="px-2 py-0.5 rounded-[4px] bg-neo-muted border border-neo-border font-mono text-[10px] font-bold text-neo-ink-2">
                    {isLoggedIn ? `@${currentUser.username || currentUser.id} · MongoDB` : 'Local · Non connecté'}
                  </span>
                </div>
                <p className="text-xs text-neo-ink-3 mt-1">
                  Valeur estimée du classeur :{' '}
                  <span className="font-mono font-bold text-neo-ink tabular-nums">
                    {formatPrice(binderTotalValue)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="primary" size="sm" onClick={() => setStage('SELECT_SERIES')}>
                  <Sparkles size={15} aria-hidden="true" />
                  <span>Ouvrir un booster</span>
                </Button>
                {collection.length > 0 && (
                  <Button variant="danger-outline" size="sm" onClick={handleClearCollection}>
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Vider</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Binder filter toolbar */}
            <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-neo-muted border border-neo-border rounded-[6px] p-0.5 w-fit">
                {[
                  { id: 'ALL', label: 'Toutes' },
                  { id: 'HIT', label: 'Hits uniquement' },
                  { id: 'RARE_PLUS', label: 'Ultra / Secrètes' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBinderFilter(f.id)}
                    className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                      binderFilter === f.id
                        ? 'bg-neo-surface text-neo-ink border border-neo-border shadow-tactile-sm'
                        : 'text-neo-ink-3 hover:text-neo-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={binderSearch}
                  onChange={(e) => setBinderSearch(e.target.value)}
                  placeholder="Rechercher dans le classeur..."
                  aria-label="Rechercher dans le classeur"
                  className="neo-input w-full pl-9 pr-3 py-1.5 text-xs"
                />
              </div>
            </div>

            {filteredBinder.length === 0 ? (
              <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] py-14 px-4 text-center space-y-3">
                <div className="w-11 h-11 rounded-[8px] bg-neo-muted border border-neo-border flex items-center justify-center mx-auto text-neo-ink-3">
                  <Layers size={20} aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-neo-ink">
                  {collection.length === 0
                    ? 'Votre classeur est vide'
                    : 'Aucune carte ne correspond à ce filtre'}
                </p>
                {collection.length === 0 && (
                  <Button variant="primary" size="sm" onClick={() => setStage('SELECT_SERIES')}>
                    Ouvrir votre premier booster
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                {filteredBinder.map((card, i) => {
                  const cfg = getRarityCfg(card);
                  const imgUrl = card.image_large || card.image_small || card.image_url || POKEMON_CARD_BACK_FALLBACK;
                  const priceVal = Number(card.market_price ?? card.price ?? card.reference_market_price ?? 0);
                  return (
                    <button
                      key={`${card.id || card.name}-${i}`}
                      type="button"
                      onClick={() => setInspectCard(card)}
                      className="bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-cobalt rounded-[8px] p-2.5 text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-tactile-sm"
                    >
                      <div className="aspect-[5/7] rounded-[5px] bg-neo-muted overflow-hidden mb-2 relative">
                        <img
                          src={imgUrl}
                          alt={card.name || card.card_name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                          }}
                        />
                        {(card.count || 1) > 1 && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[4px] bg-neo-ink text-neo-surface font-mono text-[10px] font-bold">
                            x{card.count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-neo-ink truncate">
                        {card.name || card.card_name}
                      </p>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <span className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${cfg.badgeClass}`}>
                          {cfg.shortLabel}
                        </span>
                        <span className="font-mono text-xs font-bold text-neo-ink tabular-nums">
                          {formatPrice(priceVal)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Card3DInspectModal card={inspectCard} onClose={() => setInspectCard(null)} />
      <PullRatesModal isOpen={showPullRates} onClose={() => setShowPullRates(false)} />
    </div>
  );
}
