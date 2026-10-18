import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Star,
  RefreshCw,
  X,
  Zap,
  Volume2,
  VolumeX,
  Flame,
  Trophy,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Eye,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
} from 'lucide-react';

// ─── POKÉMON CARD BACK FALLBACK (Vector SVG) ────────────────────────────────
export const POKEMON_CARD_BACK_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <radialGradient id="ballGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="60%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </radialGradient>
  </defs>
  <rect width="300" height="420" rx="16" fill="url(#bg)"/>
  <rect x="10" y="10" width="280" height="400" rx="12" fill="none" stroke="url(#borderGrad)" stroke-width="2" opacity="0.6"/>
  <circle cx="150" cy="200" r="56" fill="#0f172a" stroke="#6366f1" stroke-width="4"/>
  <path d="M 94 200 A 56 56 0 0 1 206 200 Z" fill="url(#ballGrad)"/>
  <path d="M 94 200 A 56 56 0 0 0 206 200 Z" fill="#f8fafc"/>
  <line x1="94" y1="200" x2="206" y2="200" stroke="#0f172a" stroke-width="8"/>
  <circle cx="150" cy="200" r="18" fill="#0f172a"/>
  <circle cx="150" cy="200" r="12" fill="#f8fafc" stroke="#6366f1" stroke-width="2"/>
  <text x="150" y="315" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#a5b4fc" text-anchor="middle" letter-spacing="3">POKÉVINTED</text>
  <text x="150" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">OFFICIAL TRADING CARD</text>
</svg>
`);

// ─── Pure Web Audio API Sound Synthesizer ──────────────────────────────────
const playBoosterAudio = (type, enabled = true) => {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'tear') {
      // Crisp metallic foil tearing sound
      const bufferSize = Math.floor(ctx.sampleRate * 0.4);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(3.0, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'flip') {
      // Clean card glide swoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'holo') {
      // High-pitched crystalline shimmer
      [900, 1350, 1800].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.5);
      });
    } else if (type === 'god_pull') {
      // Grand celebratory fanfare arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.28, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.75);
      });
    }
  } catch {
    // Audio Context might require prior interaction
  }
};

// ─── Rarity Configuration & Styling ─────────────────────────────────────────
const RARITY_CONFIG = {
  Commune: {
    color: '#9ca3af',
    glow: 'rgba(156,163,175,0.3)',
    border: 'rgba(156,163,175,0.4)',
    label: 'Commune',
    bg: 'bg-slate-800/80',
    tier: 1,
  },
  'Peu Commune': {
    color: '#34d399',
    glow: 'rgba(52,211,153,0.35)',
    border: 'rgba(52,211,153,0.5)',
    label: 'Peu Commune',
    bg: 'bg-emerald-950/80',
    tier: 2,
  },
  Rare: {
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.5)',
    border: 'rgba(96,165,250,0.6)',
    label: 'Rare Holo',
    bg: 'bg-blue-950/80',
    tier: 3,
  },
  'Double rare': {
    color: '#c084fc',
    glow: 'rgba(192,132,252,0.65)',
    border: 'rgba(192,132,252,0.7)',
    label: 'Double Rare ex',
    bg: 'bg-purple-950/80',
    tier: 4,
  },
  'Illustration rare': {
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.7)',
    border: 'rgba(251,146,60,0.75)',
    label: 'Illustration Rare (AR)',
    bg: 'bg-orange-950/80',
    tier: 5,
  },
  'Ultra Rare': {
    color: '#facc15',
    glow: 'rgba(250,204,21,0.75)',
    border: 'rgba(250,204,21,0.8)',
    label: 'Ultra Rare Full Art',
    bg: 'bg-amber-950/80',
    tier: 6,
  },
  'Illustration spéciale rare': {
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.85)',
    border: 'rgba(236,72,153,0.9)',
    label: 'Illustration Spéciale (SAR)',
    bg: 'bg-pink-950/80',
    tier: 7,
  },
  'Hyper rare': {
    color: '#fef08a',
    glow: 'rgba(254,240,138,0.9)',
    border: 'rgba(254,240,138,0.95)',
    label: 'Hyper Rare Gold UR',
    bg: 'bg-yellow-950/80',
    tier: 8,
  },
  'HIGH-TECH rare': {
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.8)',
    border: 'rgba(56,189,248,0.85)',
    label: 'HIGH-TECH (Ace Spec)',
    bg: 'bg-sky-950/80',
    tier: 6,
  },
  'Shiny rare': {
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.75)',
    border: 'rgba(168,85,247,0.8)',
    label: 'Chromatique Shiny',
    bg: 'bg-violet-950/80',
    tier: 5,
  },
};

const getRarityCfg = (rarity) => {
  if (!rarity) return RARITY_CONFIG['Commune'];
  for (const [key, cfg] of Object.entries(RARITY_CONFIG)) {
    if (rarity.toLowerCase().includes(key.toLowerCase())) return cfg;
  }
  return RARITY_CONFIG['Commune'];
};

// ─── Default Fallback Series (SV Era) with Packaging Artworks ──────────────
const FALLBACK_SERIES = [
  {
    id: 'sv03.5',
    name: '151',
    series: 'Écarlate et Violet',
    code: 'MEW',
    release_year: '2023',
    card_count: 207,
    pack_image: '/boosters/sv03.5.jpg',
    theme_gradient: 'from-red-600 via-rose-600 to-amber-700',
    accent_color: '#e11d48',
    badge: 'Édition Culte Kanto',
    description: 'Le retour légendaire des 151 premiers Pokémon avec Dracaufeu SAR, Tortank et Florizarre.',
    chase_cards: [
      { name: 'Dracaufeu ex', rarity: 'Illustration spéciale rare', price: 340.7, image: 'https://assets.tcgdex.net/fr/sv/sv03.5/199/low.webp' },
      { name: 'Tortank ex', rarity: 'Illustration spéciale rare', price: 142.86, image: 'https://assets.tcgdex.net/fr/sv/sv03.5/200/low.webp' },
      { name: 'Florizarre ex', rarity: 'Illustration spéciale rare', price: 109.04, image: 'https://assets.tcgdex.net/fr/sv/sv03.5/198/low.webp' },
    ],
  },
  {
    id: 'sv08',
    name: 'Étincelles Déferlantes',
    series: 'Écarlate et Violet',
    code: 'SSP',
    release_year: '2024',
    card_count: 252,
    pack_image: '/boosters/sv08.jpg',
    theme_gradient: 'from-amber-400 via-yellow-500 to-indigo-900',
    accent_color: '#eab308',
    badge: 'Apogée Électrique',
    description: "L'apogée électrique de Pikachu ex Téracristal Stellaire et les dragons légendaires Latias & Latios.",
    chase_cards: [
      { name: 'Pikachu ex', rarity: 'Illustration spéciale rare', price: 299.86, image: 'https://assets.tcgdex.net/fr/sv/sv08/238/low.webp' },
      { name: 'Pikachu ex (Gold)', rarity: 'Hyper rare', price: 60.16, image: 'https://assets.tcgdex.net/fr/sv/sv08/247/low.webp' },
      { name: 'Latias ex', rarity: 'Illustration spéciale rare', price: 185.0, image: 'https://assets.tcgdex.net/fr/sv/sv08/239/low.webp' },
    ],
  },
  {
    id: 'sv07',
    name: 'Couronne Stellaire',
    series: 'Écarlate et Violet',
    code: 'SCR',
    release_year: '2024',
    card_count: 175,
    pack_image: '/boosters/sv07.jpg',
    theme_gradient: 'from-cyan-400 via-teal-500 to-indigo-950',
    accent_color: '#06b6d4',
    badge: 'Téracristal Stellaire',
    description: "Les mystères du Cratère de Paldea révélés avec Terapagos ex Stellaire et l'Institut Myrtille.",
    chase_cards: [
      { name: 'Terapagos ex', rarity: 'Illustration spéciale rare', price: 31.14, image: 'https://assets.tcgdex.net/fr/sv/sv07/170/low.webp' },
      { name: 'Pomdorochi ex', rarity: 'Ultra Rare', price: 28.5, image: 'https://assets.tcgdex.net/fr/sv/sv07/156/low.webp' },
      { name: 'Lokhlass ex', rarity: 'Ultra Rare', price: 22.0, image: 'https://assets.tcgdex.net/fr/sv/sv07/158/low.webp' },
    ],
  },
  {
    id: 'sv08.5',
    name: 'Évolutions Prismatiques',
    series: 'Écarlate et Violet',
    code: 'PRE',
    release_year: '2025',
    card_count: 175,
    pack_image: '/boosters/sv08.5.jpg',
    theme_gradient: 'from-pink-500 via-purple-600 to-amber-500',
    accent_color: '#ec4899',
    badge: 'Évolitions Téracristal',
    description: 'Les 8 évolutions emblématiques d\'Évoli sublimées par les cristaux stellaires et les dorures.',
    chase_cards: [
      { name: 'Noctali ex', rarity: 'Illustration spéciale rare', price: 380.0, image: 'https://assets.tcgdex.net/fr/sv/sv08.5/161/low.webp' },
      { name: 'Mentali ex', rarity: 'Illustration spéciale rare', price: 195.0, image: 'https://assets.tcgdex.net/fr/sv/sv08.5/155/low.webp' },
      { name: 'Évoli ex', rarity: 'Illustration spéciale rare', price: 160.0, image: 'https://assets.tcgdex.net/fr/sv/sv08.5/143/low.webp' },
    ],
  },
  {
    id: 'sv04.5',
    name: 'Destinées de Paldea',
    series: 'Écarlate et Violet',
    code: 'PAF',
    release_year: '2024',
    card_count: 245,
    pack_image: '/boosters/sv04.5.jpg',
    theme_gradient: 'from-violet-500 via-indigo-600 to-slate-900',
    accent_color: '#8b5cf6',
    badge: 'Pokémon Chromatiques',
    description: 'La fête des Pokémon Shiny et les illustrations alternatives exclusives de Dracaufeu & Mew.',
    chase_cards: [
      { name: 'Dracaufeu ex Shiny', rarity: 'Illustration spéciale rare', price: 135.0, image: 'https://assets.tcgdex.net/fr/sv/sv04.5/234/low.webp' },
      { name: 'Mew ex Shiny', rarity: 'Illustration spéciale rare', price: 110.0, image: 'https://assets.tcgdex.net/fr/sv/sv04.5/232/low.webp' },
    ],
  },
  {
    id: 'sv05',
    name: 'Forces Temporelles',
    series: 'Écarlate et Violet',
    code: 'TEF',
    release_year: '2024',
    card_count: 218,
    pack_image: '/boosters/sv05.jpg',
    theme_gradient: 'from-blue-500 via-cyan-600 to-emerald-800',
    accent_color: '#3b82f6',
    badge: 'Temps Passé & Futur',
    description: 'La collision entre Pokémon Temps Passé et Futur avec Serpente-Eau ex et Ire-Foudre ex.',
    chase_cards: [
      { name: 'Ire-Foudre ex', rarity: 'Illustration spéciale rare', price: 115.0, image: 'https://assets.tcgdex.net/fr/sv/sv05/208/low.webp' },
      { name: 'Serpente-Eau ex', rarity: 'Illustration spéciale rare', price: 65.0, image: 'https://assets.tcgdex.net/fr/sv/sv05/205/low.webp' },
    ],
  },
  {
    id: 'sv06',
    name: 'Mascarade Crépusculaire',
    series: 'Écarlate et Violet',
    code: 'TWM',
    release_year: '2024',
    card_count: 226,
    pack_image: '/boosters/sv06.jpg',
    theme_gradient: 'from-teal-400 via-emerald-600 to-purple-900',
    accent_color: '#14b8a6',
    badge: 'Festival de Septentria',
    description: "Le festival traditionnel de Septentria et les masques mythiques d'Ogerpon avec Amphinobi ex.",
    chase_cards: [
      { name: 'Amphinobi ex', rarity: 'Illustration spéciale rare', price: 240.0, image: 'https://assets.tcgdex.net/fr/sv/sv06/214/low.webp' },
      { name: 'Carmine', rarity: 'Illustration spéciale rare', price: 110.0, image: 'https://assets.tcgdex.net/fr/sv/sv06/217/low.webp' },
      { name: 'Ogerpon Masque Turquoise ex', rarity: 'Illustration spéciale rare', price: 42.0, image: 'https://assets.tcgdex.net/fr/sv/sv06/211/low.webp' },
    ],
  },
  {
    id: 'sv06.5',
    name: 'Fable Nébuleuse',
    series: 'Écarlate et Violet',
    code: 'SFA',
    release_year: '2024',
    card_count: 99,
    pack_image: '/boosters/sv06.5.jpg',
    theme_gradient: 'from-fuchsia-600 via-purple-900 to-zinc-950',
    accent_color: '#c026d3',
    badge: 'Ombres & Toxines',
    description: "L'influence toxique de Pêchaminus et des Adorables Trois dans une ambiance mystique obscure.",
    chase_cards: [
      { name: 'Félinferno ex', rarity: 'Illustration spéciale rare', price: 68.0, image: 'https://assets.tcgdex.net/fr/sv/sv06.5/094/low.webp' },
      { name: 'Pêchaminus ex', rarity: 'Illustration spéciale rare', price: 55.0, image: 'https://assets.tcgdex.net/fr/sv/sv06.5/095/low.webp' },
    ],
  },
];

// ─── Official Authentic Pokémon Card Back Component ────────────────────────
export function PokemonCardBack({ className = '', style = {} }) {
  return (
    <div
      className={`w-full h-full rounded-2xl relative overflow-hidden select-none bg-[#111936] shadow-xl ${className}`}
      style={style}
    >
      <img
        src="/images/pokemon-card-back.jpg"
        alt="Dos officiel de carte Pokémon"
        className="w-full h-full object-cover rounded-2xl pointer-events-none select-none"
        draggable={false}
        onError={(e) => {
          e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
        }}
      />
      {/* Subtle edge highlight */}
      <div className="absolute inset-0 rounded-2xl border border-blue-400/20 pointer-events-none" />
    </div>
  );
}

// ─── 3D Card Inspector Modal (For Fun Simulation Showcase) ──────────────────
function Card3DInspectModal({ card, onClose, isSaved, onToggleSave }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef(null);

  if (!card) return null;
  const cfg = getRarityCfg(card.pull_rarity || card.rarity);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 30;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -30;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col md:flex-row items-center gap-8 max-w-4xl p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors z-20"
          title="Fermer"
        >
          <X size={20} />
        </button>

        {/* 3D Card Stage */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative select-none cursor-grab active:cursor-grabbing"
          style={{
            width: '300px',
            height: '420px',
            perspective: '1200px',
          }}
        >
          <div
            className="w-full h-full relative transition-transform duration-300 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${tilt.x + (isFlipped ? 180 : 0)}deg) rotateX(${tilt.y}deg)`,
              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px ${cfg.glow}`,
            }}
          >
            {/* FRONT FACE */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-950 border-2"
              style={{
                backfaceVisibility: 'hidden',
                borderColor: cfg.color,
              }}
            >
              <img
                src={card.image_large || card.image_small || '/placeholder-card.png'}
                alt={card.name}
                className="w-full h-full object-cover"
              />
              {/* Holographic light reflection */}
              {(card.is_holo || card.is_hit || card.is_reverse) && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-50 mix-blend-color-dodge transition-opacity"
                  style={{
                    background: `radial-gradient(circle at ${50 + tilt.x * 2}% ${50 - tilt.y * 2}%, rgba(255,255,255,0.85) 0%, rgba(255,200,255,0.3) 30%, transparent 60%)`,
                  }}
                />
              )}
            </div>

            {/* BACK FACE (Official Card Back) */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <PokemonCardBack />
            </div>
          </div>
        </div>

        {/* Card Details & Actions */}
        <div className="flex flex-col justify-between max-w-sm space-y-4 text-left">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm"
                style={{
                  background: `${cfg.color}20`,
                  borderColor: cfg.border,
                  color: cfg.color,
                }}
              >
                {card.pull_rarity || card.rarity}
              </span>
              {card.is_hit && (
                <span className="flex items-center gap-1 text-xs font-black text-amber-400">
                  <Star size={13} fill="currentColor" />
                  <span>Hit Majeur</span>
                </span>
              )}
            </div>

            <h3 className="text-2xl font-black text-white">{card.name}</h3>
            <p className="text-xs text-gray-400 mt-1">
              Extension <strong className="text-white">{card.set_name}</strong> • N° {card.number}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Cote indicative marché</span>
              <span className="text-base font-black text-emerald-400">
                {card.market_price ? `${card.market_price.toFixed(2)} €` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">État de sortie de booster</span>
              <span className="font-bold text-amber-300">Neuf (MINT / Pack Fresh)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Mode</span>
              <span className="font-bold text-violet-300">Simulation de Collection</span>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              <span>{isFlipped ? 'Voir le recto' : 'Retourner la carte (Verso)'}</span>
            </button>

            <button
              onClick={() => onToggleSave(card.id)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isSaved
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg'
              }`}
            >
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              <span>{isSaved ? 'Enregistrée dans mon classeur' : 'Conserver dans mon classeur'}</span>
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center italic">
            Carte virtuelle tirée pour le plaisir de collectionner • Non vendable sur la marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 3D Booster Pack Wrapper Visual with Authentic Packaging Artwork ────────
function BoosterPackFoil({ series, isTorn, onTear, isShaking }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const foilRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!foilRef.current || isTorn) return;
    const rect = foilRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -24;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });
  const packImg = series?.pack_image || `/boosters/${series?.id}.jpg`;

  return (
    <div
      ref={foilRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none cursor-pointer group transition-transform duration-200 ${
        isShaking ? 'animate-[shake_0.2s_infinite]' : ''
      }`}
      style={{
        width: '320px',
        height: '490px',
        perspective: '1200px',
      }}
      onClick={onTear}
    >
      {/* 3D tilt container */}
      <div
        className="w-full h-full relative transition-transform duration-300 ease-out"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Ambient atmospheric backlight matching series theme */}
        <div
          className="absolute inset-4 rounded-3xl blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"
          style={{ background: series.accent_color }}
        />

        {/* Cards emerging from inside the torn booster wrapper */}
        <div
          className={`absolute inset-x-8 top-10 h-48 rounded-xl overflow-hidden transition-all duration-700 ease-out pointer-events-none z-10 flex flex-col items-center justify-start ${
            isTorn ? 'translate-y-[-48px] opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            boxShadow: '0 0 45px rgba(251,191,36,0.95), 0 0 20px rgba(255,255,255,0.8)',
          }}
        >
          <div className="w-full h-full rounded-xl bg-gradient-to-t from-amber-500 via-rose-500 to-indigo-600 p-1 flex items-center justify-center">
            <PokemonCardBack />
          </div>
          {/* Prismatic flare beam erupting */}
          <div
            className="absolute inset-0 animate-ping opacity-80"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.6) 50%, transparent 80%)',
            }}
          />
        </div>

        {/* Physical Booster Pack Wrapper Container */}
        <div
          className="w-full h-full relative overflow-hidden rounded-2xl"
          style={{
            filter: `drop-shadow(0 25px 35px rgba(0,0,0,0.9)) drop-shadow(0 0 30px ${series.accent_color}50)`,
          }}
        >
          {/* Top Foil Crimp (The serrated sealed hanger strip that rips away) */}
          <div
            className="absolute inset-0 z-30 transition-all duration-700 ease-out pointer-events-none"
            style={{
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 16%, 85% 18%, 70% 15%, 50% 19%, 30% 16%, 15% 20%, 0% 17%)',
              transform: isTorn ? 'translateY(-140px) rotate(-14deg) scale(0.85)' : 'translateY(0) rotate(0deg)',
              opacity: isTorn ? 0 : 1,
            }}
          >
            <img
              src={packImg}
              alt={series.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {/* Shimmer on top crimp */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at ${50 + tilt.x * 2.5}% 15%, rgba(255,255,255,0.6) 0%, transparent 60%)`,
                mixBlendMode: 'overlay',
              }}
            />
          </div>

          {/* Lower Booster Foil Sleeve (Slides downward slightly when ripped) */}
          <div
            className="absolute inset-0 z-20 transition-all duration-700 ease-out"
            style={{
              clipPath: 'polygon(0% 17%, 15% 20%, 30% 16%, 50% 19%, 70% 15%, 85% 18%, 100% 16%, 100% 100%, 0% 100%)',
              transform: isTorn ? 'translateY(28px)' : 'translateY(0)',
            }}
          >
            <img
              src={packImg}
              alt={series.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {/* Metallic holographic foil glare following mouse tilt */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${50 + tilt.x * 2.5}% ${50 - tilt.y * 2.5}%, rgba(255,255,255,0.45) 0%, rgba(255,220,150,0.2) 35%, transparent 65%)`,
                mixBlendMode: 'overlay',
              }}
            />
          </div>

          {/* Tear notch / pull cue ribbon when intact */}
          {!isTorn && (
            <div className="absolute top-12 left-4 right-4 z-40 text-center pointer-events-none animate-pulse">
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-black/85 border border-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.6)] inline-flex items-center gap-1.5">
                <Zap size={13} className="text-amber-400" />
                <span>Cliquer pour déchirer le scellé</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Booster Studio Component ──────────────────────────────────────────
export default function BoosterOpeningPage({ onClose }) {
  // Phase: 'SELECT_SERIES' | 'TEAR_PACK' | 'REVEAL_STACK' | 'SUMMARY_BINDER'
  const [phase, setPhase] = useState('SELECT_SERIES');
  const [seriesList, setSeriesList] = useState(FALLBACK_SERIES);
  const [selectedSeries, setSelectedSeries] = useState(FALLBACK_SERIES[0]);
  const [packData, setPackData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Deck Reveal Stack State
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0); // 0 to 9
  const [revealedCardIndices, setRevealedCardIndices] = useState(new Set());
  const [isCardFlipping, setIsCardFlipping] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isTorn, setIsTorn] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // 3D Tilt for active card in stack
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });

  // Session stats tracker
  const [sessionStats, setSessionStats] = useState({
    openedCount: 0,
    hitsCount: 0,
    totalValue: 0.0,
  });

  // 3D Inspector Modal State
  const [inspectCard, setInspectCard] = useState(null);

  // Pull rates modal toggle & bookmarks
  const [showPullRates, setShowPullRates] = useState(false);
  const [savedToPortfolio, setSavedToPortfolio] = useState(new Set());

  // Fetch available series from backend API
  useEffect(() => {
    let isMounted = true;
    fetch('/api/analytics/boosters/series')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const enriched = data.map((item) => ({
            ...item,
            pack_image: item.pack_image || `/boosters/${item.id}.jpg`,
          }));
          setSeriesList(enriched);
          setSelectedSeries(enriched[0]);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (inspectCard) {
          setInspectCard(null);
        } else {
          onClose?.();
        }
      } else if ((e.key === ' ' || e.key === 'Enter') && phase === 'REVEAL_STACK') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowRight' && phase === 'REVEAL_STACK') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft' && phase === 'REVEAL_STACK') {
        e.preventDefault();
        handlePreviousCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentSlotIndex, packData, inspectCard]);

  // Start pack opening process
  const handleSelectSeriesAndOpen = async (series) => {
    setSelectedSeries(series);
    setLoading(true);
    setError(null);
    setPackData(null);
    setIsTorn(false);

    try {
      const res = await fetch(`/api/analytics/boosters/open?set_id=${encodeURIComponent(series.id)}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Échec de la génération du booster.');
      const data = await res.json();
      setPackData(data);
      setPhase('TEAR_PACK');
    } catch (err) {
      setError(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  // Perform the physical rip of the pack wrapper
  const handleTearPack = () => {
    if (isTorn || !packData) return;
    playBoosterAudio('tear', audioEnabled);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setIsTorn(true);
      setTimeout(() => {
        setPhase('REVEAL_STACK');
        setCurrentSlotIndex(0);
        setRevealedCardIndices(new Set());
      }, 1000);
    }, 350);
  };

  // Fast forward directly into reveal stack
  const handleSkipTear = () => {
    if (!packData) return;
    setIsTorn(true);
    setPhase('REVEAL_STACK');
    setCurrentSlotIndex(0);
    setRevealedCardIndices(new Set());
  };

  // Reveal current card on the stack
  const handleRevealCurrentCard = () => {
    if (!packData || isCardFlipping) return;
    const card = packData.cards[currentSlotIndex];
    if (!card) return;

    if (!revealedCardIndices.has(currentSlotIndex)) {
      setIsCardFlipping(true);

      // Play audio matching rarity tier
      if (card.hit_tier === 'sar' || card.hit_tier === 'hyper_rare') {
        playBoosterAudio('god_pull', audioEnabled);
      } else if (card.is_holo || card.is_reverse || card.is_hit) {
        playBoosterAudio('holo', audioEnabled);
      } else {
        playBoosterAudio('flip', audioEnabled);
      }

      setRevealedCardIndices((prev) => new Set(prev).add(currentSlotIndex));
      setTimeout(() => setIsCardFlipping(false), 350);
    }
  };

  // Proceed to next card in the stack
  const handleNextCard = () => {
    if (!packData) return;
    if (!revealedCardIndices.has(currentSlotIndex)) {
      handleRevealCurrentCard();
      return;
    }
    if (currentSlotIndex < packData.cards.length - 1) {
      setCurrentSlotIndex((prev) => prev + 1);
      setCardTilt({ x: 0, y: 0 });
    } else {
      // Reached the end of the 10-card pack! Update session statistics and view summary
      const hitsCount = packData.cards.filter((c) => c.is_hit).length;
      setSessionStats((prev) => ({
        openedCount: prev.openedCount + 1,
        hitsCount: prev.hitsCount + hitsCount,
        totalValue: Number((prev.totalValue + packData.total_estimated_value).toFixed(2)),
      }));
      setPhase('SUMMARY_BINDER');
    }
  };

  // Previous card navigation
  const handlePreviousCard = () => {
    if (currentSlotIndex > 0) {
      setCurrentSlotIndex((prev) => prev - 1);
      setCardTilt({ x: 0, y: 0 });
    }
  };

  // Skip step-by-step reveal and reveal all cards instantly
  const handleRevealAllInstantly = () => {
    if (!packData) return;
    playBoosterAudio('god_pull', audioEnabled);
    const allIndices = new Set(packData.cards.map((_, i) => i));
    setRevealedCardIndices(allIndices);
    const hitsCount = packData.cards.filter((c) => c.is_hit).length;
    setSessionStats((prev) => ({
      openedCount: prev.openedCount + 1,
      hitsCount: prev.hitsCount + hitsCount,
      totalValue: Number((prev.totalValue + packData.total_estimated_value).toFixed(2)),
    }));
    setPhase('SUMMARY_BINDER');
  };

  // Bookmark card to personal collection binder
  const handleToggleSavePortfolio = (cardId) => {
    setSavedToPortfolio((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // Mouse tilt tracking on active card
  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 22;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -22;
    setCardTilt({ x, y });
  };

  const handleCardMouseLeave = () => setCardTilt({ x: 0, y: 0 });

  // Current card being inspected in REVEAL_STACK
  const currentCard = packData?.cards?.[currentSlotIndex];
  const isCurrentCardRevealed = revealedCardIndices.has(currentSlotIndex);
  const currentRarityCfg = currentCard ? getRarityCfg(currentCard.pull_rarity) : null;

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col justify-between overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #151828 0%, #0c0e18 60%, #06070c 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Keyframe styles ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          15% { transform: translate(-8px, -2px) rotate(-3deg); }
          30% { transform: translate(8px, 2px) rotate(3deg); }
          45% { transform: translate(-6px, 1px) rotate(-2deg); }
          60% { transform: translate(6px, -1px) rotate(2deg); }
          75% { transform: translate(-4px, 2px) rotate(-1deg); }
          90% { transform: translate(4px, -1px) rotate(1deg); }
        }
        @keyframes rainbowSweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes hitPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(251,191,36,0.5)); }
          50% { transform: scale(1.02); filter: drop-shadow(0 0 35px rgba(251,191,36,0.9)); }
        }
      `}</style>

      {/* ── Top Bar / Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 w-full px-6 py-4 flex items-center justify-between border-b border-white/[0.08] bg-black/60 backdrop-blur-md z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg border border-white/20">
            <Sparkles size={20} className="text-white drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white uppercase tracking-wider">
                PokéVinted Booster Studio
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                TCG SIMULATOR
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Ouverture pour le fun & la collection • Ratios officiels Écarlate & Violet
            </p>
          </div>
        </div>

        {/* Global session counter & controls */}
        <div className="flex items-center gap-4">
          {sessionStats.openedCount > 0 && (
            <div className="hidden md:flex items-center gap-4 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
              <div>
                <span className="text-gray-400">Packs ouverts : </span>
                <span className="font-bold text-white">{sessionStats.openedCount}</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div>
                <span className="text-gray-400">Hits obtenus : </span>
                <span className="font-bold text-amber-400">{sessionStats.hitsCount}</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div>
                <span className="text-gray-400">Cote cumulée : </span>
                <span className="font-black text-emerald-400">{sessionStats.totalValue.toFixed(2)} €</span>
              </div>
            </div>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
            title={audioEnabled ? 'Désactiver le son' : 'Activer le son'}
          >
            {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Pull rates modal button */}
          <button
            onClick={() => setShowPullRates(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
            title="Consulter les probabilités de tirage"
          >
            <HelpCircle size={14} />
            <span>Probabilités TCG</span>
          </button>

          {/* Close studio button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
            title="Fermer le studio (Échap)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── Main Dynamic Stage ────────────────────────────────────────────── */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
        {/* Error notification */}
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-900/40 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-2">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STAGE 1: SERIES SELECTION SCREEN ─────────────────────────────── */}
        {phase === 'SELECT_SERIES' && (
          <div className="w-full max-w-6xl flex flex-col items-center gap-6 py-4">
            <div className="text-center max-w-xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
                Mode Découverte & Simulation Gratuite
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Choisissez votre Booster Pokémon
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Ouvrez des packs virtuels pour le plaisir de collectionner, admirez les illustrations et enrichissez votre classeur personnel.
              </p>
            </div>

            {/* Grid of SV Era Series */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {seriesList.map((series) => {
                const isSelected = selectedSeries?.id === series.id;
                return (
                  <div
                    key={series.id}
                    onClick={() => setSelectedSeries(series)}
                    className={`rounded-2xl p-4 transition-all duration-300 cursor-pointer border flex flex-col justify-between group relative overflow-hidden ${
                      isSelected
                        ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)] bg-slate-900/90 scale-[1.02]'
                        : 'border-white/[0.08] hover:border-white/20 bg-slate-900/50 hover:bg-slate-900/80 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Top ambient glow */}
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                      style={{ background: series.accent_color }}
                    />

                    <div>
                      {/* Pack Visual Preview with realistic packaging */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/40 mb-3 shadow-inner flex items-center justify-center p-2">
                        <img
                          src={series.pack_image}
                          alt={series.name}
                          className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* 10 cards badge */}
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[9px] font-black text-amber-300 border border-white/20">
                          10 CARTES
                        </div>
                      </div>

                      {/* Series Title */}
                      <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                        <span>{series.name}</span>
                        {isSelected && <CheckCircle size={16} className="text-amber-400 shrink-0" />}
                      </h3>

                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {series.description}
                      </p>

                      {/* Chase Cards Highlights */}
                      {series.chase_cards && series.chase_cards.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Trophy size={10} className="text-amber-400" />
                            Hits majeurs :
                          </p>
                          <div className="flex items-center gap-1.5">
                            {series.chase_cards.slice(0, 3).map((chase, idx) => (
                              <div
                                key={idx}
                                className="flex-1 flex items-center gap-1 p-1 rounded-md bg-black/40 border border-white/[0.06]"
                                title={`${chase.name} — Cote : ${chase.price} €`}
                              >
                                {chase.image && (
                                  <img
                                    src={chase.image}
                                    alt={chase.name}
                                    className="w-5 h-7 object-cover rounded shadow"
                                    loading="lazy"
                                  />
                                )}
                                <div className="overflow-hidden">
                                  <p className="text-[9px] font-bold text-white truncate">{chase.name}</p>
                                  <p className="text-[8px] font-black text-emerald-400">{chase.price} €</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom action trigger */}
                    <div className="mt-4 pt-2.5 flex items-center justify-between border-t border-white/[0.06]">
                      <span className="text-[11px] text-gray-400">
                        <strong className="text-white font-bold">{series.card_count}</strong> cartes
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSeriesAndOpen(series);
                        }}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 active:scale-95"
                        style={{
                          background: `linear-gradient(135deg, ${series.accent_color}, #4c1d95)`,
                          boxShadow: `0 4px 12px ${series.accent_color}50`,
                        }}
                      >
                        <Zap size={12} />
                        <span>Ouvrir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STAGE 2: TEAR PACK (PHYSICAL RIPPING RITUAL WITH AUTHENTIC PACK) ─ */}
        {phase === 'TEAR_PACK' && selectedSeries && (
          <div className="my-auto flex flex-col items-center gap-6 max-w-md text-center py-4">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
                Étape 2 • Le Rituel de Déchirement
              </span>
              <h2 className="text-2xl font-black text-white mt-2">
                Déchirez le scellé de votre booster
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Booster officiel <span className="text-white font-bold">{selectedSeries.name}</span> • 10 cartes sous scellé
              </p>
            </div>

            {/* 3D Foil Pack with physics & authentic packaging artwork */}
            <BoosterPackFoil
              series={selectedSeries}
              isTorn={isTorn}
              onTear={handleTearPack}
              isShaking={isShaking}
            />

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleTearPack}
                disabled={isTorn}
                className="px-8 py-3 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20"
              >
                <Zap size={16} className="text-yellow-300 animate-pulse" />
                <span>{isTorn ? 'OUVERTURE DU PACK...' : 'DÉCHIRER LE SCELLÉ HOLOGRAPHIQUE'}</span>
              </button>

              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handleSkipTear}
                  className="text-xs text-amber-400/80 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <Zap size={12} />
                  <span>Passer l'animation</span>
                </button>
                <span className="text-gray-600">•</span>
                <button
                  onClick={() => setPhase('SELECT_SERIES')}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft size={12} />
                  <span>Changer d'extension</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STAGE 3: REVEAL DECK STACK (CARD BY CARD TCG SUSPENSE) ────────── */}
        {phase === 'REVEAL_STACK' && packData && currentCard && (
          <div className="my-auto flex flex-col items-center gap-5 w-full max-w-4xl py-4">
            {/* Top slot pill & indicator */}
            <div className="flex items-center justify-between w-full max-w-md px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-gray-400">
                  CARTE {currentSlotIndex + 1} / 10
                </span>
                <span
                  className="text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-sm"
                  style={{
                    background: `${currentRarityCfg.color}20`,
                    borderColor: currentRarityCfg.border,
                    color: currentRarityCfg.color,
                  }}
                >
                  {currentCard.slot_label || currentRarityCfg.label}
                </span>
              </div>

              {currentCard.is_hit && isCurrentCardRevealed && (
                <span className="flex items-center gap-1 text-xs font-black text-amber-400 animate-bounce">
                  <Star size={14} fill="currentColor" />
                  <span>HIT DÉBLOQUÉ !</span>
                </span>
              )}
            </div>

            {/* 3D Stack Area with Authentic Pokémon Card Backs */}
            <div
              className="relative cursor-pointer select-none"
              style={{
                width: '290px',
                height: '406px',
                perspective: '1200px',
              }}
              onClick={handleRevealCurrentCard}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              {/* Stack depth perspective cards underneath with authentic Pokémon back */}
              {Array.from({ length: Math.min(3, 9 - currentSlotIndex) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-2xl pointer-events-none transition-transform"
                  style={{
                    transform: `translateY(${(i + 1) * 4}px) scale(${1 - (i + 1) * 0.02})`,
                    zIndex: -i - 1,
                    opacity: 0.85 - i * 0.2,
                  }}
                >
                  <PokemonCardBack />
                </div>
              ))}

              {/* The Active Top Card */}
              <div
                className={`w-full h-full relative rounded-2xl transition-transform duration-500 ease-out ${
                  currentCard.is_hit && isCurrentCardRevealed ? 'animate-[hitPulse_2s_infinite]' : ''
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isCurrentCardRevealed
                    ? `rotateY(0deg) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg)`
                    : 'rotateY(180deg)',
                  boxShadow:
                    currentCard.is_hit && isCurrentCardRevealed
                      ? `0 0 35px ${currentRarityCfg.glow}, 0 20px 40px rgba(0,0,0,0.8)`
                      : '0 15px 35px rgba(0,0,0,0.7)',
                }}
              >
                {/* BACK FACE (Unrevealed Authentic Pokémon Card Back) */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <PokemonCardBack />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/0 transition-colors">
                    <span className="px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-xl animate-pulse flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Cliquer pour révéler ⚡</span>
                    </span>
                  </div>
                </div>

                {/* FRONT FACE (Revealed official card artwork) */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    backfaceVisibility: 'hidden',
                    border: `3px solid ${currentRarityCfg.color}`,
                    background: '#0f111a',
                  }}
                >
                  {/* Card Artwork */}
                  <img
                    src={currentCard.image_large || currentCard.image_small || '/placeholder-card.png'}
                    alt={currentCard.name}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />

                  {/* Holographic foil sweep for Holo/Reverse */}
                  {currentCard.is_holo && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge"
                      style={{
                        background:
                          'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.7) 45%, transparent 70%)',
                        backgroundSize: '250% 250%',
                        animation: 'rainbowSweep 3s ease infinite',
                      }}
                    />
                  )}

                  {/* Top overlay pills */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-20">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-md text-white shadow-md backdrop-blur-md"
                      style={{
                        background: currentRarityCfg.bg,
                        border: `1px solid ${currentRarityCfg.color}80`,
                      }}
                    >
                      {currentCard.pull_rarity || currentCard.rarity}
                    </span>
                    {currentCard.is_reverse && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-600/80 text-white border border-white/20">
                        REVERSE
                      </span>
                    )}
                  </div>

                  {/* Market value badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 border border-white/20 text-emerald-400 font-black text-xs shadow-md">
                    {currentCard.market_price ? `${currentCard.market_price.toFixed(2)} €` : '—'}
                  </div>

                  {/* Bottom title gradient */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <p className="text-sm font-black text-white truncate drop-shadow">
                      {currentCard.name}
                    </p>
                    <p className="text-[10px] text-gray-300 flex items-center justify-between mt-0.5">
                      <span>
                        N° {currentCard.number} • {currentCard.set_name}
                      </span>
                      {currentCard.is_hit && (
                        <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                          <Flame size={11} /> Chase Card
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Suspense progress indicator & controls */}
            <div className="flex flex-col items-center gap-3 w-full max-w-md mt-2">
              {/* Dots tracker */}
              <div className="flex items-center justify-center gap-1.5 w-full">
                {packData.cards.map((c, idx) => {
                  const isCurrent = idx === currentSlotIndex;
                  const isPast = idx < currentSlotIndex;
                  const isSlotHit = c.is_hit;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentSlotIndex(idx);
                        if (!revealedCardIndices.has(idx)) {
                          handleRevealCurrentCard();
                        }
                      }}
                      className={`h-2 rounded-full transition-all ${
                        isCurrent
                          ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                          : isPast
                          ? isSlotHit
                            ? 'w-3 bg-pink-500'
                            : 'w-2 bg-emerald-500'
                          : 'w-2 bg-white/20'
                      }`}
                      title={`Carte ${idx + 1}`}
                    />
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 w-full justify-center">
                {currentSlotIndex > 0 && (
                  <button
                    onClick={handlePreviousCard}
                    className="p-3 rounded-xl text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-colors"
                    title="Carte précédente (Flèche gauche)"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}

                {!isCurrentCardRevealed ? (
                  <button
                    onClick={handleRevealCurrentCard}
                    className="flex-1 py-3 px-6 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-500 to-rose-600 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={16} />
                    <span>Révéler la carte (Espace)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextCard}
                    className="flex-1 py-3 px-6 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{currentSlotIndex === 9 ? 'Voir le Bilan du Pack 🏆' : 'Carte Suivante →'}</span>
                  </button>
                )}

                <button
                  onClick={handleRevealAllInstantly}
                  className="px-4 py-3 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-colors"
                  title="Tout révéler d'un coup"
                >
                  Tout Révéler ⚡
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STAGE 4: SUMMARY BINDER (COLLECTOR PORTFOLIO SHOWCASE) ────────── */}
        {phase === 'SUMMARY_BINDER' && packData && (
          <div className="w-full max-w-6xl flex flex-col items-center gap-6">
            {/* Header Hero Banner */}
            <div className="w-full rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-white/[0.1] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="relative z-10 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Tirage Terminé
                  </span>
                  <span className="text-xs text-gray-400">
                    Extension <strong className="text-white">{packData.set_name}</strong>
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                  Bilan de votre Booster Pokémon
                </h2>
                {packData.best_hit ? (
                  <p className="text-xs md:text-sm text-amber-300 flex items-center gap-1.5 mt-1">
                    <Trophy size={14} className="text-yellow-400" />
                    <span>
                      Meilleur Hit : <strong>{packData.best_hit.name}</strong> ({packData.best_hit.pull_rarity}) •{' '}
                      {packData.best_hit.market_price} €
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    Pack régulier composé de communes, peu communes et reverse holos.
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-2 italic">
                  Mode Découverte & Simulation • Cartes ajoutées à votre classeur personnel pour le fun (non vendables).
                </p>
              </div>

              {/* Total Pack Valuation */}
              <div className="relative z-10 flex flex-col items-center md:items-end">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Valeur totale indicative du pack
                </span>
                <span className="text-3xl md:text-4xl font-black text-emerald-400 drop-shadow">
                  {packData.total_estimated_value.toFixed(2)} €
                </span>
                <span className="text-[11px] font-bold text-gray-400 mt-0.5">
                  10 cartes authentiques • Sortie de booster (MINT)
                </span>
              </div>
            </div>

            {/* 10-Card Collector Binder Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 w-full">
              {packData.cards.map((card, idx) => {
                const cfg = getRarityCfg(card.pull_rarity);
                const isSaved = savedToPortfolio.has(card.id);
                return (
                  <div
                    key={`${card.id}-${idx}`}
                    className={`rounded-xl overflow-hidden border p-2.5 bg-slate-900/60 transition-all duration-200 flex flex-col justify-between group hover:scale-[1.03] ${
                      card.is_hit
                        ? 'border-amber-400/60 shadow-[0_4px_16px_rgba(251,191,36,0.15)] bg-slate-900/90'
                        : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div>
                      {/* Card thumbnail container */}
                      <div
                        className="relative aspect-[2/3] rounded-lg overflow-hidden bg-black/50 mb-2 cursor-pointer"
                        onClick={() => setInspectCard(card)}
                      >
                        <img
                          src={card.image_small || card.image_large || '/placeholder-card.png'}
                          alt={card.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* Reverse Holo overlay */}
                        {card.is_reverse && (
                          <div
                            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge"
                            style={{
                              background:
                                'linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.6) 50%, transparent 80%)',
                            }}
                          />
                        )}
                        {/* Hit star */}
                        {card.is_hit && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white shadow">
                            <Star size={11} fill="currentColor" />
                          </div>
                        )}
                        {/* Quick 3D inspect hover pill */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="px-2.5 py-1 rounded-lg bg-black/80 text-white text-[10px] font-bold border border-white/20 flex items-center gap-1">
                            <Eye size={12} />
                            <span>Inspecter 3D</span>
                          </span>
                        </div>
                      </div>

                      {/* Card meta */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[110px]"
                          style={{
                            background: `${cfg.color}20`,
                            color: cfg.color,
                            border: `1px solid ${cfg.color}40`,
                          }}
                        >
                          {card.pull_rarity}
                        </span>
                        <span className="text-xs font-black text-emerald-400">
                          {card.market_price ? `${card.market_price.toFixed(2)} €` : '—'}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-white truncate">{card.name}</p>
                      <p className="text-[10px] text-gray-500">
                        N° {card.number} • {card.set_name}
                      </p>
                    </div>

                    {/* Fun Collector Actions (NO SELLING) */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center gap-1.5">
                      <button
                        onClick={() => setInspectCard(card)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold text-white bg-indigo-600/80 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1"
                        title="Examiner la carte en 3D avec reflets et dos officiel"
                      >
                        <Eye size={11} />
                        <span>Inspecter 3D</span>
                      </button>

                      <button
                        onClick={() => handleToggleSavePortfolio(card.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isSaved
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-white'
                        }`}
                        title={isSaved ? 'Enregistrée dans ma collection' : 'Conserver dans ma collection'}
                      >
                        <CheckCircle size={13} className={isSaved ? 'text-emerald-400' : ''} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom action bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              <button
                onClick={() => handleSelectSeriesAndOpen(selectedSeries)}
                disabled={loading}
                className="px-6 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-500 to-red-600 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <RefreshCw size={15} />
                <span>Ouvrir un autre booster ({selectedSeries.name})</span>
              </button>

              <button
                onClick={() => setPhase('SELECT_SERIES')}
                className="px-5 py-3 rounded-xl font-bold text-sm text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all flex items-center gap-2"
              >
                <Layers size={15} />
                <span>Changer d'extension Pokémon</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── 3D Card Inspector Modal Overlay ─────────────────────────────── */}
      {inspectCard && (
        <Card3DInspectModal
          card={inspectCard}
          onClose={() => setInspectCard(null)}
          isSaved={savedToPortfolio.has(inspectCard.id)}
          onToggleSave={handleToggleSavePortfolio}
        />
      )}

      {/* ── Drop Rates Modal Overlay ────────────────────────────────────── */}
      {showPullRates && (
        <div
          className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowPullRates(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 bg-slate-900 border border-white/[0.12] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPullRates(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-2">
              <Zap size={18} className="text-yellow-400" />
              <span>Taux de Tirage Officiels (Ère SV)</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Basés sur l'échantillonnage statistique communautaire officiel pour les boosters modernes à 10 cartes.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slots 1 à 4 (Communes)</span>
                <span className="font-bold text-gray-400">4 garanties</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slots 5 à 7 (Peu Communes)</span>
                <span className="font-bold text-gray-400">3 garanties</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slot 8 (Reverse Holo 1)</span>
                <span className="font-bold text-violet-400">100% Reverse</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slot 9 (Wildcard / AR / Ace Spec)</span>
                <span className="font-bold text-orange-400">~18% Illustration Rare</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slot 10 : Double Rare (ex)</span>
                <span className="font-bold text-purple-400">~20% (1 sur 5 packs)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slot 10 : Ultra Rare (Full Art)</span>
                <span className="font-bold text-amber-400">~9% (1 sur 11 packs)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slot 10 : Illustration Spéciale (SAR)</span>
                <span className="font-bold text-pink-400">~6% (1 sur 17 packs)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                <span className="text-gray-300">Slot 10 : Hyper Rare (Gold UR)</span>
                <span className="font-bold text-yellow-300">~3% (1 sur 33 packs)</span>
              </div>
            </div>

            <button
              onClick={() => setShowPullRates(false)}
              className="w-full mt-5 py-2.5 rounded-xl font-bold text-xs text-white bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
