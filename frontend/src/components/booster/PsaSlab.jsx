import React, { useState, useRef, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import { getRarityCfg } from './boosterConstants';

export default function PsaSlab({ card, series, revealed = true, onReveal, onInspect }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });
  const cfg = getRarityCfg(card);
  const frontImg = card?.image_large || card?.image_small || card?.image_url || POKEMON_CARD_BACK_FALLBACK;
  const priceVal = Number(card?.market_price ?? card?.price ?? card?.reference_market_price ?? 0);
  const isHolo = Boolean(card?.is_holo || card?.is_hit || card?.is_reverse || cfg.isHit);

  const certNumber = useMemo(() => {
    if (card?.cert_number) return card.cert_number;
    const seed = `${card?.id || card?.name || 'pkmn'}-${card?.slot_number || 1}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return String(80000000 + (hash % 19999999));
  }, [card?.cert_number, card?.id, card?.name, card?.slot_number]);

  const handleMouseMove = (e) => {
    if (!revealed || !cardRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setTilt({
      rx: -((yPct / 100) * 2 - 1) * 10,
      ry: ((xPct / 100) * 2 - 1) * 12,
      glareX: xPct,
      glareY: yPct,
      active: true,
    });
  };

  const resetTilt = () => setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="w-full max-w-[300px] sm:max-w-[320px] mx-auto select-none"
      style={{ perspective: '1100px' }}
    >
      {/* PSA Lucite Acrylic Case */}
      <div
        className={`rounded-[12px] border-2 bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-[#21262D] dark:via-[#161B22] dark:to-[#0D1117] p-2.5 shadow-[0_20px_48px_rgba(0,0,0,0.55)] transition-transform duration-150 ${
          revealed && cfg.isHit
            ? 'border-[#F59E0B] shadow-[0_0_32px_rgba(245,158,11,0.35),0_20px_48px_rgba(0,0,0,0.65)]'
            : 'border-slate-300 dark:border-[#484F58]'
        }`}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        {/* Top Graded PSA / Pokédex Header Plate */}
        <div className="mb-2 rounded-[7px] border-[1.5px] border-[#991B1B] bg-white dark:bg-[#0D1117] overflow-hidden">
          <div className="bg-[#DC2626] text-white px-2.5 py-1 flex items-center justify-between text-[10px] font-mono font-bold tracking-wider">
            <span>POKÉDEX GRADING · {card?.set_name || series?.set_code || 'TCG'}</span>
            <span>CERT #{certNumber}</span>
          </div>
          <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-[#111827] dark:text-[#F0F6FC] truncate">
              {revealed ? card?.name : 'BOÎTIER SCELLÉ'}
            </span>
            <span className="font-mono font-bold text-[#DC2626] shrink-0">
              {revealed ? (cfg.isHit ? 'GEM MT 10' : 'NM-MT 9') : '???'}
            </span>
          </div>
        </div>

        {/* Recessed card compartment */}
        <button
          type="button"
          onClick={() => {
            if (!revealed) {
              onReveal?.();
            } else {
              onInspect?.(card);
            }
          }}
          className="relative w-full aspect-[5/7] rounded-[8px] overflow-hidden border-[1.5px] border-slate-300 dark:border-[#30363D] bg-[#0B0F19] block cursor-pointer group"
          aria-label={
            revealed ? `Inspecter ${card?.name}` : 'Révéler cette carte du booster'
          }
        >
          <img
            src={revealed ? frontImg : POKEMON_CARD_BACK_FALLBACK}
            alt={revealed ? card?.name : 'Dos de carte Pokémon'}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
            }}
          />

          {/* Holographic Rainbow Foil Sweep on Holo / Hit / Reverse */}
          {revealed && isHolo && (
            <div
              className="absolute inset-0 pointer-events-none opacity-45 mix-blend-color-dodge animate-[rainbowSweep_3.5s_ease_infinite]"
              style={{
                background:
                  'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.7) 45%, rgba(56,189,248,0.45) 55%, transparent 75%)',
                backgroundSize: '250% 250%',
              }}
            />
          )}

          {/* Dynamic 3D acrylic glare */}
          {revealed && tilt.active && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle 130px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.32), transparent 70%)`,
              }}
            />
          )}

          {!revealed && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <span className="px-3 py-1 rounded-[5px] bg-[#090D16]/90 text-white text-xs font-bold border border-white/20">
                Cliquer pour révéler
              </span>
            </div>
          )}

          {revealed && (
            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-[5px] bg-white/95 border border-slate-300 text-[#111827] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
              <Eye size={15} aria-hidden="true" />
            </div>
          )}
        </button>

        {/* Bottom value bar */}
        <div className="mt-2 px-1 flex items-center justify-between gap-2 text-xs">
          <span
            className={`px-2 py-0.5 rounded-[4px] border text-[10px] font-bold ${
              revealed ? cfg.badgeClass : 'bg-neo-muted text-neo-ink-3 border-neo-border'
            }`}
          >
            {revealed ? card?.pull_rarity || cfg.shortLabel : 'MYSTÈRE'}
          </span>
          <span className="font-mono font-bold text-[#111827] dark:text-[#F0F6FC] tabular-nums">
            {revealed ? formatPrice(priceVal) : '-- €'}
          </span>
        </div>
      </div>
    </div>
  );
}
