import React, { useState, useRef } from 'react';
import { Scissors, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

export default function BoosterPackFoil({ series, onTearComplete, isOpening }) {
  const [tearProgress, setTearProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });
  const trackRef = useRef(null);
  const foilRef = useRef(null);
  const triggeredRef = useRef(false);

  const packArtworkUrl = series?.pack_image || (series?.id ? `/boosters/${series.id}.jpg` : null);

  const handlePackMouseMove = (e) => {
    if (!foilRef.current || isOpening) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = foilRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setTilt({
      rx: -((yPct / 100) * 2 - 1) * 11,
      ry: ((xPct / 100) * 2 - 1) * 13,
      glareX: xPct,
      glareY: yPct,
      active: true,
    });
  };

  const handlePackMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });
  };

  const handlePointerUpdate = (clientX) => {
    if (!trackRef.current || triggeredRef.current || isOpening) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setTearProgress(pct);
    if (pct >= 84) {
      triggeredRef.current = true;
      setTearProgress(100);
      setIsDragging(false);
      onTearComplete?.();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* 3D Interactive Foil Booster Pack */}
      <div
        ref={foilRef}
        onMouseMove={handlePackMouseMove}
        onMouseLeave={handlePackMouseLeave}
        style={{ perspective: '1100px' }}
      >
        <div
          className={`relative w-[250px] sm:w-[285px] aspect-[5/8] rounded-[14px] border-2 border-slate-500/80 bg-[#0F172A] shadow-[0_22px_50px_rgba(0,0,0,0.65),0_0_32px_rgba(56,189,248,0.18)] overflow-hidden flex flex-col justify-between transition-transform duration-150 ease-out ${
            isOpening ? 'animate-[shake_0.45s_ease-in-out]' : ''
          }`}
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          }}
        >
          {/* Metallic rainbow shimmer sheen across foil */}
          <div
            className="absolute inset-0 pointer-events-none z-10 mix-blend-color-dodge opacity-35 animate-[rainbowSweep_4s_ease_infinite]"
            style={{
              background:
                'linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.45) 45%, rgba(56,189,248,0.35) 55%, transparent 75%)',
              backgroundSize: '250% 250%',
            }}
          />

          {/* Interactive glare */}
          {tilt.active && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: `radial-gradient(circle 140px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.34), transparent 70%)`,
              }}
            />
          )}

          {/* Top crimp seal + interactive tear strip */}
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              setIsDragging(true);
              handlePointerUpdate(e.clientX);
            }}
            onPointerMove={(e) => {
              if (isDragging) handlePointerUpdate(e.clientX);
            }}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
            className="relative h-14 bg-[#090D16] border-b-2 border-dashed border-sky-400/70 flex items-center px-3.5 cursor-ew-resize z-20"
            title="Glissez de gauche à droite pour déchirer le booster"
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#DC2626]/45 to-sky-400/45 pointer-events-none transition-all duration-75"
              style={{ width: `${tearProgress}%` }}
            />
            {tearProgress > 2 && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_14px_#fff] pointer-events-none"
                style={{ left: `${tearProgress}%` }}
              />
            )}
            <div className="relative z-10 w-full flex items-center justify-between text-[11px] font-mono font-bold text-slate-100">
              <span className="flex items-center gap-1.5">
                <Scissors size={13} className="text-[#EF4444]" aria-hidden="true" />
                <span>GLISSER POUR OUVRIR</span>
              </span>
              <span className="text-sky-300">{Math.round(tearProgress)}%</span>
            </div>
          </div>

          {/* Packaging artwork */}
          {packArtworkUrl && !imgFailed ? (
            <div className="relative flex-1 bg-[#0F172A] overflow-hidden">
              <img
                src={packArtworkUrl}
                alt={series?.name || 'Booster Pokémon'}
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-transparent">
                <span className="font-mono text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                  {series?.set_code || series?.id?.toUpperCase()} · 10 CARTES
                </span>
                <h2 className="font-display text-base font-bold text-white leading-tight truncate mt-0.5">
                  {series?.name || 'Booster Pokémon'}
                </h2>
              </div>
            </div>
          ) : (
            <div className="p-5 text-center space-y-3 my-auto relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">
                <span>{series?.set_code || 'TCG'}</span>
                <span>· 10 CARTES</span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
                {series?.name || 'Booster Pokémon'}
              </h2>

              <div className="w-16 h-16 rounded-full border-2 border-white/25 bg-[#DC2626] flex items-center justify-center mx-auto shadow-md">
                <Sparkles size={24} className="text-white" aria-hidden="true" />
              </div>

              <p className="text-xs text-slate-300">
                10 cartes officielles aléatoires · Tirage vérifié
              </p>
            </div>
          )}

          {/* Bottom crimp */}
          <div className="h-7 bg-[#090D16] border-t border-slate-700 flex items-center justify-center z-20">
            <span className="font-mono text-[10px] tracking-widest text-slate-400">
              POKÉDEX · BOOSTER SCÉLLÉ
            </span>
          </div>
        </div>
      </div>

      {/* Accessible primary open CTA */}
      <Button
        variant="primary"
        size="lg"
        disabled={isOpening}
        onClick={() => {
          if (triggeredRef.current) return;
          triggeredRef.current = true;
          setTearProgress(100);
          onTearComplete?.();
        }}
      >
        <Scissors size={16} aria-hidden="true" />
        <span>{isOpening ? 'Ouverture...' : 'Déchirer le booster'}</span>
      </Button>
    </div>
  );
}
