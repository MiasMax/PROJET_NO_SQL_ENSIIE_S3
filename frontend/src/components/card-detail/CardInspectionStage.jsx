import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Layers, Sparkles, Eye } from 'lucide-react';
import { CONDITION_OPTIONS } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import CardWearOverlay from '../CardWearOverlay';

const FOIL_MODES = [
  { id: 'off', label: 'Mat' },
  { id: 'standard', label: 'Holo' },
  { id: 'cosmos', label: 'Cosmos' },
  { id: 'rainbow', label: 'Prisme' },
];

export default function CardInspectionStage({
  item,
  simulatedCondition,
  onSimulatedConditionChange,
  isSold,
  isOrderView,
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glare: { x: 50, y: 50 }, active: false });
  const [isFlipped, setIsFlipped] = useState(false);
  const [foilMode, setFoilMode] = useState('standard');
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [magPos, setMagPos] = useState({ x: 50, y: 50, visible: false });
  const [showWearPins, setShowWearPins] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    setIsFlipped(false);
    setIsMagnifierActive(false);
    setMagPos({ x: 50, y: 50, visible: false });
  }, [item?.id, item?.card_id]);

  useEffect(() => {
    if (simulatedCondition === 'MINT') {
      setShowWearPins(false);
    }
  }, [simulatedCondition]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (isMagnifierActive && !isFlipped) {
      setMagPos({ x: xPct, y: yPct, visible: true });
    }

    if (prefersReducedMotion) return;
    const normX = (xPct / 100) * 2 - 1;
    const normY = (yPct / 100) * 2 - 1;
    setTilt({
      rotateX: -normY * 9,
      rotateY: normX * 11,
      glare: { x: xPct, y: yPct },
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glare: { x: 50, y: 50 }, active: false });
    setMagPos((prev) => ({ ...prev, visible: false }));
  };

  const frontImage = item?.image_url || POKEMON_CARD_BACK_FALLBACK;
  const foilClass =
    !isFlipped && foilMode !== 'off'
      ? foilMode === 'rainbow'
        ? 'bg-[linear-gradient(115deg,transparent_18%,rgba(239,68,68,0.18)_34%,rgba(59,130,246,0.18)_50%,rgba(16,185,129,0.18)_66%,transparent_82%)]'
        : foilMode === 'cosmos'
        ? 'bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.28)_0%,transparent_45%),radial-gradient(circle_at_75%_70%,rgba(96,165,250,0.22)_0%,transparent_48%)]'
        : 'bg-[linear-gradient(125deg,transparent_25%,rgba(255,255,255,0.22)_48%,transparent_70%)]'
      : '';

  return (
    <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] shadow-tactile overflow-hidden">
      {/* Inspection pad */}
      <div className="relative bg-neo-muted p-6 sm:p-8 flex flex-col items-center justify-center min-h-[420px] sm:min-h-[490px] border-b-[1.5px] border-neo-border">
        {/* Status badge top-left */}
        <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-10">
          {isOrderView ? (
            <span className="px-2.5 py-1 rounded-[5px] bg-[#DBEAFE] dark:bg-[#0B2545] border border-[#93C5FD] dark:border-[#1D4ED8] text-[#1E40AF] dark:text-[#93C5FD] text-xs font-bold">
              Archive commande
            </span>
          ) : isSold ? (
            <span className="px-2.5 py-1 rounded-[5px] bg-neo-ink text-neo-surface text-xs font-bold">
              Vendue
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-[5px] bg-neo-surface border-[1.5px] border-neo-border text-neo-ink-2 text-[11px] font-mono font-semibold">
              Inspection HD
            </span>
          )}
        </div>

        {/* Controls top-right */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={() => {
              setIsFlipped((prev) => !prev);
              setIsMagnifierActive(false);
            }}
            className="h-9 px-2.5 rounded-[6px] bg-neo-surface hover:bg-neo-alt border-[1.5px] border-neo-border text-xs font-semibold text-neo-ink flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Retourner la carte"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>{isFlipped ? 'Recto' : 'Verso'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isFlipped) setIsFlipped(false);
              setIsMagnifierActive((prev) => !prev);
            }}
            aria-pressed={isMagnifierActive}
            className={`h-9 px-2.5 rounded-[6px] border-[1.5px] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isMagnifierActive
                ? 'bg-neo-cobalt text-white border-[#1E3A8A]'
                : 'bg-neo-surface hover:bg-neo-alt border-neo-border text-neo-ink'
            }`}
            title="Activer la loupe 2,5x"
          >
            {isMagnifierActive ? <ZoomOut size={14} aria-hidden="true" /> : <ZoomIn size={14} aria-hidden="true" />}
            <span>Loupe</span>
          </button>
        </div>

        {/* Card stage */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full max-w-[290px] sm:max-w-[320px] aspect-[5/7] my-4 select-none"
          style={{ perspective: '1000px' }}
        >
          <div
            className="w-full h-full rounded-[12px] border-[1.5px] border-neo-ink bg-white shadow-[0_12px_28px_rgba(17,24,39,0.16)] overflow-hidden relative transition-transform duration-150 ease-out"
            style={{
              transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={isFlipped ? POKEMON_CARD_BACK_FALLBACK : frontImage}
              alt={isFlipped ? `Verso de ${item?.card_name}` : item?.card_name || 'Carte Pokémon'}
              className="w-full h-full object-contain bg-[#F8FAFC] dark:bg-[#0D1117]"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
              }}
            />

            {/* Foil overlay */}
            {!isFlipped && foilMode !== 'off' && (
              <div
                className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-200 ${foilClass} ${
                  tilt.active ? 'opacity-90' : 'opacity-45'
                }`}
              />
            )}

            {/* Dynamic surface glare */}
            {tilt.active && !prefersReducedMotion && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle 140px at ${tilt.glare.x}% ${tilt.glare.y}%, rgba(255,255,255,0.28), transparent 70%)`,
                }}
              />
            )}

            {/* Wear overlay on front */}
            {!isFlipped && (
              <CardWearOverlay
                condition={simulatedCondition}
                showPinDetails={showWearPins}
                isDetailStage={true}
                glarePos={tilt.glare}
              />
            )}

            {/* 2.5x Loupe lens */}
            {isMagnifierActive && !isFlipped && magPos.visible && (
              <div
                className="absolute w-32 h-32 rounded-full border-2 border-neo-ink shadow-tactile pointer-events-none bg-white overflow-hidden"
                style={{
                  left: `calc(${magPos.x}% - 64px)`,
                  top: `calc(${magPos.y}% - 64px)`,
                  backgroundImage: `url("${frontImage}")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '250% 250%',
                  backgroundPosition: `${magPos.x}% ${magPos.y}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Foil toolbar */}
        <div className="flex items-center gap-1.5 bg-neo-surface border-[1.5px] border-neo-border rounded-[6px] p-1 mt-1">
          <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-neo-ink-3 flex items-center gap-1">
            <Sparkles size={12} aria-hidden="true" />
            <span>Rendu</span>
          </span>
          {FOIL_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setFoilMode(m.id)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                foilMode === m.id
                  ? 'bg-neo-cobalt text-white'
                  : 'text-neo-ink-2 hover:bg-neo-muted hover:text-neo-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Condition simulator bar */}
      <div className="p-4 bg-neo-surface space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-neo-ink-3 flex items-center gap-1.5">
            <Layers size={13} aria-hidden="true" />
            <span>Aperçu visuel de l&apos;état</span>
          </span>

          {simulatedCondition !== 'MINT' && (
            <button
              type="button"
              onClick={() => setShowWearPins((prev) => !prev)}
              className={`px-2.5 py-1 rounded-[5px] border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                showWearPins
                  ? 'bg-[#EFF6FF] border-neo-cobalt text-neo-cobalt'
                  : 'bg-neo-muted border-neo-border text-neo-ink-2 hover:text-neo-ink'
              }`}
            >
              <Eye size={12} aria-hidden="true" />
              <span>{showWearPins ? 'Masquer repères' : 'Repères usure'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {CONDITION_OPTIONS.map((opt) => {
            const active = simulatedCondition === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSimulatedConditionChange(opt.value)}
                className={`py-2 px-1 rounded-[6px] border-[1.5px] text-center cursor-pointer transition-colors ${
                  active
                    ? 'bg-neo-cobalt text-white border-[#1E3A8A]'
                    : 'bg-neo-muted border-neo-border text-neo-ink-2 hover:border-neo-ink-3'
                }`}
              >
                <p className="text-[11px] font-bold leading-tight">{opt.shortLabel}</p>
                <p className={`text-[10px] font-mono ${active ? 'text-blue-100' : 'text-neo-ink-3'}`}>
                  {opt.grade}/10
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

