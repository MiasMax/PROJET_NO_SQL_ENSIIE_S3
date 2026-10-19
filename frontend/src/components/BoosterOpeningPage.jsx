import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Trash2,
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

// ─── LocalStorage Key for Virtual Booster Collection ────────────────────────
const BINDER_STORAGE_KEY = 'pokevinted_booster_collection';

const loadCollectionFromStorage = () => {
  try {
    const raw = localStorage.getItem(BINDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCollectionToStorage = (cards) => {
  try {
    localStorage.setItem(BINDER_STORAGE_KEY, JSON.stringify(cards));
  } catch {}
};

// ─── Pure Web Audio API Sound Synthesizer (Ultra-Realistic TCG Audio) ────────
const playBoosterAudio = (type, enabled = true) => {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'tear') {
      // 1. Initial crisp metallic foil tear snap & friction
      const bufferSize = Math.floor(ctx.sampleRate * 0.55);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env =
          Math.exp(-i / (ctx.sampleRate * 0.15)) +
          (i > ctx.sampleRate * 0.1
            ? 0.35 * Math.exp(-(i - ctx.sampleRate * 0.1) / (ctx.sampleRate * 0.12))
            : 0);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(3200, now);
      bpf.frequency.exponentialRampToValueAtTime(1400, now + 0.45);
      bpf.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(bpf);
      bpf.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

      // 2. Low-frequency foil tear friction rumble
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'crinkle') {
      // Short metallic cellophane plastic rustle (on hover / drag)
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4500, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'slide') {
      // Soft card glide whoosh (drawing card from foil sleeve)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (type === 'flip') {
      // Clean tactile card snap / flip whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.11);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'holo') {
      // Shimmering celestial harmonic crystal chords
      [880, 1174.66, 1396.91, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.22, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.6);
      });
    } else if (type === 'god_pull') {
      // 1. Sub-bass cinematic boom
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(95, now);
      bass.frequency.exponentialRampToValueAtTime(30, now + 0.45);
      bassGain.gain.setValueAtTime(0.65, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 0.5);

      // 2. Celebratory Golden Fanfare Arpeggio
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i > 5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.3, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.9);
      });
    }
  } catch {}
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
      className={`w-full h-full rounded-2xl relative overflow-hidden select-none bg-[#111936] shadow-xl aspect-[63/88] ${className}`}
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
      {/* Subtle border bezel */}
      <div className="absolute inset-0 rounded-2xl border border-blue-400/25 pointer-events-none" />
    </div>
  );
}

// ─── 3D Card Inspector Modal ───────────────────────────────────────────────
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
        className="relative flex flex-col md:flex-row items-center gap-8 max-w-4xl p-6 rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl"
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
          className="relative select-none cursor-grab active:cursor-grabbing shrink-0"
          style={{
            width: '280px',
            height: '392px',
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
              <span className="text-gray-400">État</span>
              <span className="font-bold text-amber-300">Neuf (Pack Fresh / MINT)</span>
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

// ─── High-Performance Canvas Particle System (Stardust, Foil Shards & Confetti) ──
function BoosterFXCanvas({ tearTrigger, celebrationTrigger, accentColor = '#ffd700' }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initial ambient stardust
    const list = particlesRef.current;
    if (list.length === 0) {
      for (let i = 0; i < 30; i++) {
        list.push({
          type: 'stardust',
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.2 - Math.random() * 0.4,
          size: 1 + Math.random() * 2.2,
          alpha: 0.15 + Math.random() * 0.55,
          color: Math.random() > 0.4 ? '#facc15' : '#c7d2fe',
          pulseSpeed: 0.01 + Math.random() * 0.02,
        });
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const parts = particlesRef.current;

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === 'stardust') {
          p.alpha += Math.sin(Date.now() * p.pulseSpeed) * 0.008;
          if (p.y < -10) p.y = canvas.height + 10;
          if (p.x < -10) p.x = canvas.width + 10;
          if (p.x > canvas.width + 10) p.x = -10;

          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(0.85, p.alpha));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'foil' || p.type === 'confetti') {
          p.vy += p.gravity || 0.18;
          p.vx *= 0.985;
          p.rot += p.vRot;
          p.life -= p.decay || 0.014;

          if (p.life <= 0 || p.y > canvas.height + 25) {
            parts.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(Math.cos(p.rot * 1.8), 1);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);

          if (p.isStar) {
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(
                Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size,
                -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size
              );
              ctx.lineTo(
                Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.size * 0.45),
                -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.size * 0.45)
              );
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size2 / 2, p.size, p.size2);
          }
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Listen for pack tear trigger -> burst metallic foil shards
  useEffect(() => {
    if (!tearTrigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.36;
    const colors = ['#f59e0b', '#fbbf24', '#fef08a', '#e2e8f0', '#ffffff', accentColor, '#ec4899', '#38bdf8'];

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI + Math.PI; // Upwards fan
      const speed = 4 + Math.random() * 13;
      particlesRef.current.push({
        type: 'foil',
        x: centerX + (Math.random() - 0.5) * 220,
        y: centerY + (Math.random() - 0.5) * 25,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 5,
        vy: Math.sin(angle) * speed - 2.5,
        gravity: 0.22,
        size: 5 + Math.random() * 9,
        size2: 3 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.015,
        isStar: Math.random() > 0.6,
      });
    }
  }, [tearTrigger, accentColor]);

  // Listen for celebratory card pull trigger -> full fireworks confetti
  useEffect(() => {
    if (!celebrationTrigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#facc15', '#ffffff'];

    for (let c = 0; c < 100; c++) {
      const fromLeft = c % 2 === 0;
      const originX = fromLeft ? canvas.width * 0.15 : canvas.width * 0.85;
      const originY = canvas.height * 0.65;
      const angle = fromLeft
        ? -Math.PI / 4 + (Math.random() - 0.5) * 0.55
        : (-3 * Math.PI) / 4 + (Math.random() - 0.5) * 0.55;
      const speed = 10 + Math.random() * 15;

      particlesRef.current.push({
        type: 'confetti',
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.24,
        size: 7 + Math.random() * 9,
        size2: 4 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.28,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.008 + Math.random() * 0.008,
        isStar: Math.random() > 0.5,
      });
    }
  }, [celebrationTrigger]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[350]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

// ─── 3D Booster Pack Wrapper with Authentic Tear Ritual ─────────────────────
function BoosterPackFoil({ series, isTorn, onTear, isShaking, audioEnabled = true }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [tearProgress, setTearProgress] = useState(0);
  const [isDraggingTear, setIsDraggingTear] = useState(false);
  const dragStartRef = useRef(0);
  const foilRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!foilRef.current || isTorn) return;
    const rect = foilRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 22;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -22;
    setTilt({ x, y });

    if (isDraggingTear) {
      const currentX = e.clientX - rect.left;
      const delta = currentX - dragStartRef.current;
      const progress = Math.max(0, Math.min(1, delta / (rect.width * 0.72)));
      setTearProgress(progress);
      playBoosterAudio('crinkle', audioEnabled);

      if (progress >= 0.72) {
        setIsDraggingTear(false);
        setTearProgress(1);
        onTear();
      }
    }
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    if (isDraggingTear) {
      setIsDraggingTear(false);
      setTearProgress(0);
    }
  };

  const handleTearStart = (e) => {
    if (isTorn) return;
    e.stopPropagation();
    const rect = foilRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartRef.current = clientX - rect.left;
    setIsDraggingTear(true);
    playBoosterAudio('crinkle', audioEnabled);
  };

  const handleTearEnd = () => {
    if (isDraggingTear) {
      if (tearProgress >= 0.65) {
        onTear();
      } else {
        setTearProgress(0);
      }
      setIsDraggingTear(false);
    }
  };

  const packImg = series?.pack_image || `/boosters/${series?.id}.jpg`;

  // Top serrated teeth clip-path
  const topTeethClip =
    'polygon(0% 0%, 2% 5px, 4% 0%, 6% 5px, 8% 0%, 10% 5px, 12% 0%, 14% 5px, 16% 0%, 18% 5px, 20% 0%, 22% 5px, 24% 0%, 26% 5px, 28% 0%, 30% 5px, 32% 0%, 34% 5px, 36% 0%, 38% 5px, 40% 0%, 42% 5px, 44% 0%, 46% 5px, 48% 0%, 50% 5px, 52% 0%, 54% 5px, 56% 0%, 58% 5px, 60% 0%, 62% 5px, 64% 0%, 66% 5px, 68% 0%, 70% 5px, 72% 0%, 74% 5px, 76% 0%, 78% 5px, 80% 0%, 82% 5px, 84% 0%, 86% 5px, 88% 0%, 90% 5px, 92% 0%, 94% 5px, 96% 0%, 98% 5px, 100% 0%, 100% 100%, 0% 100%)';

  // Bottom serrated teeth clip-path
  const bottomTeethClip =
    'polygon(0% 0%, 100% 0%, 100% 100%, 98% calc(100% - 5px), 96% 100%, 94% calc(100% - 5px), 92% 100%, 90% calc(100% - 5px), 88% 100%, 86% calc(100% - 5px), 84% 100%, 82% calc(100% - 5px), 80% 100%, 78% calc(100% - 5px), 76% 100%, 74% calc(100% - 5px), 72% 100%, 70% calc(100% - 5px), 68% 100%, 66% calc(100% - 5px), 64% 100%, 62% calc(100% - 5px), 60% 100%, 58% calc(100% - 5px), 56% 100%, 54% calc(100% - 5px), 52% 100%, 50% calc(100% - 5px), 48% 100%, 46% calc(100% - 5px), 44% 100%, 42% calc(100% - 5px), 40% 100%, 38% calc(100% - 5px), 36% 100%, 34% calc(100% - 5px), 32% 100%, 30% calc(100% - 5px), 28% 100%, 26% calc(100% - 5px), 24% 100%, 22% calc(100% - 5px), 20% 100%, 18% calc(100% - 5px), 16% 100%, 14% calc(100% - 5px), 12% 100%, 10% calc(100% - 5px), 8% 100%, 6% calc(100% - 5px), 4% 100%, 2% calc(100% - 5px), 0% 100%)';

  return (
    <div
      ref={foilRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleTearEnd}
      onTouchMove={(e) => {
        if (!foilRef.current || isTorn || !isDraggingTear) return;
        const rect = foilRef.current.getBoundingClientRect();
        const clientX = e.touches[0].clientX;
        const delta = clientX - rect.left - dragStartRef.current;
        const progress = Math.max(0, Math.min(1, delta / (rect.width * 0.72)));
        setTearProgress(progress);
        playBoosterAudio('crinkle', audioEnabled);
        if (progress >= 0.72) {
          setIsDraggingTear(false);
          setTearProgress(1);
          onTear();
        }
      }}
      onTouchEnd={handleTearEnd}
      className={`relative select-none cursor-pointer group transition-transform duration-200 ${
        isShaking ? 'animate-[shake_0.2s_infinite]' : ''
      }`}
      style={{
        width: '320px',
        height: '500px',
        perspective: '1200px',
      }}
      onClick={() => {
        if (!isTorn) onTear();
      }}
    >
      {/* 3D tilt container */}
      <div
        className="w-full h-full relative transition-transform duration-300 ease-out"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Dynamic Studio Overhead Spotlight Cone */}
        <div
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-3xl opacity-35 pointer-events-none"
          style={{ background: series.accent_color }}
        />

        {/* Ambient Backlight matching series theme */}
        <div
          className="absolute inset-2 rounded-3xl blur-3xl opacity-50 group-hover:opacity-85 transition-opacity pointer-events-none"
          style={{ background: series.accent_color }}
        />

        {/* Ground Contact Shadow on Studio Table */}
        <div
          className="absolute -bottom-8 left-6 right-6 h-10 rounded-[100%] blur-xl opacity-80 pointer-events-none transition-transform duration-300"
          style={{
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.95) 0%, transparent 75%)',
            transform: `scale(${1 - tilt.y * 0.01}) translateX(${tilt.x * 0.8}px)`,
          }}
        />

        {/* CARDS EMERGING OUT OF THE OPEN FOIL SLEEVE */}
        <div
          className={`absolute inset-x-8 top-10 z-10 transition-all duration-800 ease-out pointer-events-none flex flex-col items-center ${
            isTorn ? 'translate-y-[-85px] opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
          }`}
          style={{
            filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.95))',
          }}
        >
          <div className="w-[240px] aspect-[63/88] rounded-2xl overflow-hidden ring-2 ring-amber-400/90 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <PokemonCardBack />
          </div>
          {/* Prismatic flare beam explosion */}
          <div
            className="absolute -inset-6 rounded-3xl animate-ping opacity-85 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(251,191,36,0.6) 40%, transparent 75%)',
            }}
          />
        </div>

        {/* PHYSICAL BOOSTER PACK WRAPPER CONTAINER */}
        <div
          className="w-full h-full relative overflow-visible rounded-2xl"
          style={{
            filter: `drop-shadow(0 25px 40px rgba(0,0,0,0.95)) drop-shadow(0 0 25px ${series.accent_color}60)`,
          }}
        >
          {/* ── TOP FOIL CRIMP SEAL (Severs and flutters away in 3D on tear) ── */}
          <div
            className="absolute inset-x-0 top-0 h-[17%] z-30 transition-all duration-800 ease-out pointer-events-none overflow-hidden"
            style={{
              clipPath: topTeethClip,
              transform: isTorn
                ? 'translateY(-165px) rotate(-22deg) rotateX(45deg) scale(0.85)'
                : 'translateY(0) rotate(0deg)',
              opacity: isTorn ? 0 : 1,
            }}
          >
            {/* Top portion of authentic booster packaging */}
            <img
              src={packImg}
              alt={series.name}
              className="w-full h-[500px] object-cover object-top absolute top-0 left-0"
              loading="eager"
            />
            {/* Metallic vertical crimping ridges */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.15) 2px, rgba(0,0,0,0.3) 4px, rgba(255,255,255,0.35) 6px)',
                mixBlendMode: 'overlay',
              }}
            />
            {/* Euro-Slot Hanger Hole in center of top seal */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-3.5 rounded-full bg-slate-950/80 border border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none flex items-center justify-center">
              <div className="w-10 h-1.5 rounded-full bg-black/60" />
            </div>
            {/* Holographic light shimmer */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${50 + tilt.x * 2.5}% 20%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
                mixBlendMode: 'color-dodge',
              }}
            />
          </div>

          {/* ── INTERACTIVE TEAR CUT LINE / STRIP (PULL-TAB & LASER) ────────── */}
          {!isTorn && (
            <div
              className="absolute top-[16.5%] inset-x-0 h-8 z-40 flex items-center justify-between px-3 cursor-ew-resize group/tear"
              onMouseDown={handleTearStart}
              onTouchStart={handleTearStart}
              title="Glissez de gauche à droite pour déchirer le booster"
            >
              {/* Dashed Tear Perforation */}
              <div className="absolute inset-x-4 h-[2px] border-b-2 border-dashed border-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />

              {/* Real-time laser burn progress line */}
              {tearProgress > 0 && (
                <div
                  className="absolute left-4 h-[3px] bg-gradient-to-r from-yellow-300 via-rose-500 to-amber-400 shadow-[0_0_15px_#f59e0b] rounded-full transition-all"
                  style={{ width: `${tearProgress * 85}%` }}
                />
              )}

              {/* Left Pull-Tab Notch */}
              <div
                className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 border border-white/40 shadow-[0_0_12px_rgba(251,191,36,0.8)] flex items-center justify-center z-10 transition-transform group-hover/tear:scale-110 active:scale-95"
                style={{
                  transform: `translateX(${tearProgress * 210}px)`,
                }}
              >
                <Zap size={14} className="text-white fill-white animate-pulse" />
              </div>

              {/* Right Cut Arrow Indicator */}
              <div className="text-[10px] font-black tracking-wider text-amber-300 bg-black/85 px-2.5 py-0.5 rounded-full border border-amber-400/50 shadow-md flex items-center gap-1 z-10">
                <span>{isDraggingTear ? `${Math.round(tearProgress * 100)}%` : 'GLISSER →'}</span>
              </div>
            </div>
          )}

          {/* ── LOWER FOIL SLEEVE (Body holding the 10-card deck with 3D bevel) ── */}
          <div
            className="absolute inset-x-0 top-[17%] bottom-0 z-20 transition-all duration-700 ease-out overflow-hidden rounded-b-2xl"
            style={{
              clipPath: bottomTeethClip,
              transform: isTorn ? 'translateY(28px)' : 'translateY(0)',
              boxShadow: 'inset 0 0 25px rgba(255,255,255,0.22), inset 0 0 45px rgba(0,0,0,0.7)',
            }}
          >
            {/* Authentic Packaging Artwork */}
            <img
              src={packImg}
              alt={series.name}
              className="w-full h-[500px] object-cover absolute top-[-85px] left-0"
              loading="eager"
            />

            {/* 3D Pillow Bulge (10 cards inside create a rounded center bevel) */}
            <div
              className="absolute inset-x-4 top-2 bottom-8 rounded-2xl pointer-events-none"
              style={{
                boxShadow:
                  'inset 0 0 25px rgba(255,255,255,0.25), inset 0 0 40px rgba(0,0,0,0.65), 0 0 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />

            {/* Cellophane Foil Diagonal Wrinkle Glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, transparent 38%, rgba(255,255,255,0.3) 48%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.3) 52%, transparent 62%)',
                mixBlendMode: 'overlay',
              }}
            />

            {/* Dynamic Holographic Foil Glare Tracking Mouse Tilt */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${50 + tilt.x * 2.2}% ${
                  50 - tilt.y * 2.2
                }%, rgba(255,255,255,0.65) 0%, rgba(255,220,180,0.35) 25%, rgba(180,220,255,0.2) 45%, transparent 70%)`,
                mixBlendMode: 'color-dodge',
              }}
            />

            {/* Bottom Crimp Metallic Ridges */}
            <div
              className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.15) 2px, rgba(0,0,0,0.3) 4px, rgba(255,255,255,0.35) 6px)',
                mixBlendMode: 'overlay',
              }}
            />
          </div>

          {/* Floating Instructions Ribbon when intact */}
          {!isTorn && (
            <div className="absolute bottom-6 inset-x-4 z-40 text-center pointer-events-none">
              <span className="px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider text-white bg-black/90 backdrop-blur-md border border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)] inline-flex items-center gap-2 animate-bounce">
                <Sparkles size={14} className="text-amber-400" />
                <span>Glisser ou cliquer pour ouvrir ⚡</span>
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
  // Phase: 'SELECT_SERIES' | 'TEAR_PACK' | 'REVEAL_STACK' | 'SUMMARY_BINDER' | 'BINDER_COLLECTION'
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
  const [isPeeking, setIsPeeking] = useState(false);
  const [isCardSliding, setIsCardSliding] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isTorn, setIsTorn] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [tearTrigger, setTearTrigger] = useState(0);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);

  // 3D Tilt for active card in stack
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });

  // Virtual Binder Collection State (loaded from localStorage)
  const [collection, setCollection] = useState(() => loadCollectionFromStorage());
  const [binderSearch, setBinderSearch] = useState('');
  const [binderSeriesFilter, setBinderSeriesFilter] = useState('ALL');
  const [binderRarityFilter, setBinderRarityFilter] = useState('ALL');
  const [binderSort, setBinderSort] = useState('PRICE_DESC');

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

  // Save collection changes to localStorage
  const addCardsToCollection = (newCards, series) => {
    setCollection((prev) => {
      const copy = [...prev];
      newCards.forEach((card) => {
        const existingIdx = copy.findIndex((c) => c.id === card.id);
        if (existingIdx >= 0) {
          copy[existingIdx] = {
            ...copy[existingIdx],
            count: (copy[existingIdx].count || 1) + 1,
            last_pulled_at: new Date().toISOString(),
          };
        } else {
          copy.push({
            id: card.id,
            name: card.name,
            number: card.number,
            set_id: card.set_id || series?.id,
            set_name: card.set_name || series?.name,
            image_small: card.image_small,
            image_large: card.image_large,
            pull_rarity: card.pull_rarity || card.rarity,
            market_price: card.market_price || 0,
            is_hit: !!card.is_hit,
            is_holo: !!card.is_holo,
            is_reverse: !!card.is_reverse,
            count: 1,
            first_pulled_at: new Date().toISOString(),
          });
        }
      });
      saveCollectionToStorage(copy);
      return copy;
    });
  };

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
        } else if (phase === 'BINDER_COLLECTION') {
          setPhase(packData ? 'SUMMARY_BINDER' : 'SELECT_SERIES');
        } else {
          onClose?.();
        }
      } else if ((e.key === ' ' || e.key === 'Enter') && phase === 'REVEAL_STACK') {
        e.preventDefault();
        handleCardClick();
      } else if (e.key === 'ArrowRight' && phase === 'REVEAL_STACK') {
        e.preventDefault();
        handleCardClick();
      } else if (e.key === 'ArrowLeft' && phase === 'REVEAL_STACK') {
        e.preventDefault();
        handlePreviousCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentSlotIndex, packData, inspectCard, revealedCardIndices]);

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
    setTearTrigger(Date.now());
    setTimeout(() => {
      setIsShaking(false);
      setIsTorn(true);
      // Automatically add cards to user's collection binder
      addCardsToCollection(packData.cards, selectedSeries);
      setTimeout(() => {
        setPhase('REVEAL_STACK');
        setCurrentSlotIndex(0);
        setRevealedCardIndices(new Set());
      }, 1250);
    }, 280);
  };

  // Fast forward directly into reveal stack
  const handleSkipTear = () => {
    if (!packData) return;
    setIsTorn(true);
    addCardsToCollection(packData.cards, selectedSeries);
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

      // Play audio matching rarity tier & trigger celebration on Hits
      if (card.hit_tier === 'sar' || card.hit_tier === 'hyper_rare' || card.is_hit) {
        playBoosterAudio('god_pull', audioEnabled);
        setCelebrationTrigger(Date.now());
        setIsScreenShaking(true);
        setTimeout(() => setIsScreenShaking(false), 900);
      } else if (card.is_holo || card.is_reverse) {
        playBoosterAudio('holo', audioEnabled);
      } else {
        playBoosterAudio('flip', audioEnabled);
      }

      setRevealedCardIndices((prev) => new Set(prev).add(currentSlotIndex));
      setTimeout(() => setIsCardFlipping(false), 300);
    }
  };

  // Card click handler: if facedown, reveal. If already revealed, advance to next card!
  const handleCardClick = () => {
    if (!packData) return;
    if (!revealedCardIndices.has(currentSlotIndex)) {
      handleRevealCurrentCard();
    } else {
      handleNextCard();
    }
  };

  // Proceed to next card in the stack
  const handleNextCard = () => {
    if (!packData || isCardSliding) return;
    setIsCardSliding(true);
    playBoosterAudio('slide', audioEnabled);
    setTimeout(() => {
      if (currentSlotIndex < packData.cards.length - 1) {
        setCurrentSlotIndex((prev) => prev + 1);
        setCardTilt({ x: 0, y: 0 });
        setIsPeeking(false);
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
      setIsCardSliding(false);
    }, 240);
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

  // Filtered & Sorted Binder Collection
  const filteredCollection = useMemo(() => {
    return collection
      .filter((card) => {
        if (binderSearch.trim()) {
          const q = binderSearch.toLowerCase();
          if (!card.name.toLowerCase().includes(q) && !card.number.includes(q)) return false;
        }
        if (binderSeriesFilter !== 'ALL' && card.set_id !== binderSeriesFilter) {
          return false;
        }
        if (binderRarityFilter === 'HITS' && !card.is_hit) return false;
        if (binderRarityFilter === 'SAR_GOLD' && !card.pull_rarity?.includes('spéciale') && !card.pull_rarity?.includes('Hyper')) return false;
        if (binderRarityFilter === 'HOLO' && !card.is_holo && !card.is_reverse) return false;
        return true;
      })
      .sort((a, b) => {
        if (binderSort === 'PRICE_DESC') return (b.market_price || 0) - (a.market_price || 0);
        if (binderSort === 'PRICE_ASC') return (a.market_price || 0) - (b.market_price || 0);
        if (binderSort === 'NAME_ASC') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [collection, binderSearch, binderSeriesFilter, binderRarityFilter, binderSort]);

  // Total Collection Valuation & Metrics
  const collectionMetrics = useMemo(() => {
    const totalCount = collection.reduce((acc, c) => acc + (c.count || 1), 0);
    const uniqueCount = collection.length;
    const hitsCount = collection.filter((c) => c.is_hit).reduce((acc, c) => acc + (c.count || 1), 0);
    const totalValue = collection.reduce((acc, c) => acc + (c.market_price || 0) * (c.count || 1), 0);
    return { totalCount, uniqueCount, hitsCount, totalValue };
  }, [collection]);

  // Current card being inspected in REVEAL_STACK
  const currentCard = packData?.cards?.[currentSlotIndex];
  const isCurrentCardRevealed = revealedCardIndices.has(currentSlotIndex);
  const currentRarityCfg = currentCard ? getRarityCfg(currentCard.pull_rarity) : null;

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col justify-start overflow-hidden ${
        isScreenShaking ? 'animate-[cameraShake_0.6s_ease-in-out]' : ''
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #151828 0%, #0c0e18 60%, #06070c 100%)',
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
        @keyframes sunburstSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cameraShake {
          0%, 100% { transform: translate(0, 0) scale(1); }
          10% { transform: translate(-6px, -4px) scale(1.02); }
          20% { transform: translate(6px, 4px) scale(1.01); }
          30% { transform: translate(-5px, 2px); }
          40% { transform: translate(5px, -2px); }
          50% { transform: translate(-3px, -1px); }
          60% { transform: translate(3px, 1px); }
          70% { transform: translate(-2px, 0); }
          80% { transform: translate(2px, 0); }
          90% { transform: translate(-1px, 0); }
        }
        @keyframes floatGently {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes godRays {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.08); }
        }
      `}</style>

      {/* ── 60 FPS Canvas Particle Engine (Ambient Stardust, Foil Shards & Confetti) ── */}
      <BoosterFXCanvas
        tearTrigger={tearTrigger}
        celebrationTrigger={celebrationTrigger}
        accentColor={selectedSeries?.accent_color || '#ffd700'}
      />

      {/* ── Top Bar / Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.08] bg-black/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg border border-white/20 shrink-0">
            <Sparkles size={18} className="text-white drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                PokéVinted Booster Studio
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                TCG SIMULATOR
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Ouverture de boosters & simulation de collection • 100% Fun
            </p>
          </div>
        </div>

        {/* Global session counter & controls */}
        <div className="flex items-center gap-3">
          {/* Virtual Binder Access Button */}
          <button
            onClick={() => setPhase(phase === 'BINDER_COLLECTION' ? 'SELECT_SERIES' : 'BINDER_COLLECTION')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-lg ${
              phase === 'BINDER_COLLECTION'
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
            title="Consulter votre classeur de cartes virtuelles"
          >
            <BookOpen size={15} />
            <span>Mon Classeur</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-black/40 text-amber-300">
              {collectionMetrics.totalCount}
            </span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
            title={audioEnabled ? 'Désactiver le son' : 'Activer le son'}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Pull rates modal button */}
          <button
            onClick={() => setShowPullRates(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
            title="Consulter les probabilités de tirage"
          >
            <HelpCircle size={14} />
            <span>Ratios TCG</span>
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

      {/* ── Main Dynamic Stage (Scroll starts at the top, NEVER clipped by header) ── */}
      <main className="flex-1 w-full flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto relative scroll-smooth">
        {/* Error notification */}
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-900/40 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-2">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STAGE 1: SERIES SELECTION SCREEN ─────────────────────────────── */}
        {phase === 'SELECT_SERIES' && (
          <div className="w-full max-w-6xl flex flex-col items-center gap-6 py-2 pb-12">
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
              audioEnabled={audioEnabled}
            />

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleTearPack}
                disabled={isTorn}
                className="px-8 py-3.5 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 shadow-[0_0_30px_rgba(244,63,94,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border border-white/20"
              >
                <Zap size={18} className="text-yellow-300 fill-yellow-300 animate-pulse" />
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

        {/* ── STAGE 3: REVEAL DECK STACK (CLICK CARD OR ARROWS TO ADVANCE) ───── */}
        {phase === 'REVEAL_STACK' && packData && currentCard && (
          <div className="my-auto flex flex-col items-center gap-4 w-full max-w-4xl py-2">
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

              {currentCard.is_hit && isCurrentCardRevealed ? (
                <span className="flex items-center gap-1.5 text-xs font-black text-amber-300 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-bounce">
                  <Star size={14} fill="currentColor" className="text-amber-400" />
                  <span>HIT MAJEUR DÉBLOQUÉ !</span>
                </span>
              ) : (
                <button
                  onMouseDown={() => setIsPeeking(true)}
                  onMouseUp={() => setIsPeeking(false)}
                  onTouchStart={() => setIsPeeking(true)}
                  onTouchEnd={() => setIsPeeking(false)}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                    isPeeking
                      ? 'bg-amber-400/25 border-amber-400 text-amber-300 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                  }`}
                  title="Maintenez pour soulever légèrement la carte et entrevoir sa bordure"
                >
                  👁️ Peeker la bordure
                </button>
              )}
            </div>

            {/* 3D Stack Area with Side Navigation Arrows */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 w-full relative">
              {/* Rotating Sunburst God-Rays when a HIT is pulled */}
              {currentCard.is_hit && isCurrentCardRevealed && (
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none rounded-full opacity-65 animate-[sunburstSpin_22s_linear_infinite] z-0"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg 20deg, rgba(251,191,36,0.35) 20deg 40deg, transparent 40deg 60deg, rgba(251,191,36,0.35) 60deg 80deg, transparent 80deg 100deg, rgba(251,191,36,0.35) 100deg 120deg, transparent 120deg 140deg, rgba(251,191,36,0.35) 140deg 160deg, transparent 160deg 180deg, rgba(251,191,36,0.35) 180deg 200deg, transparent 200deg 220deg, rgba(251,191,36,0.35) 220deg 240deg, transparent 240deg 260deg, rgba(251,191,36,0.35) 260deg 280deg, transparent 280deg 300deg, rgba(251,191,36,0.35) 300deg 320deg, transparent 320deg 340deg, rgba(251,191,36,0.35) 340deg 360deg)',
                  }}
                />
              )}

              {/* Floating Left Arrow (Previous Card) */}
              <button
                onClick={handlePreviousCard}
                disabled={currentSlotIndex === 0}
                className={`p-3 rounded-2xl border transition-all z-20 ${
                  currentSlotIndex === 0
                    ? 'opacity-20 cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600'
                    : 'hover:scale-110 active:scale-95 bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-xl'
                }`}
                title="Carte précédente (Flèche gauche)"
              >
                <ChevronLeft size={24} />
              </button>

              {/* The Card Container with Click-to-Flip and Click-to-Next */}
              <div
                className="relative cursor-pointer select-none z-10"
                style={{
                  width: '295px',
                  height: '412px',
                  perspective: '1200px',
                  transform: isCardSliding
                    ? 'translateX(125%) rotate(12deg) scale(0.92)'
                    : isPeeking
                    ? 'translateY(-32px) rotate(-1.5deg)'
                    : 'none',
                  opacity: isCardSliding ? 0 : 1,
                  transition: isCardSliding
                    ? 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'transform 0.22s ease-out, opacity 0.2s',
                }}
                onClick={handleCardClick}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                {/* Stack depth perspective cards underneath showing physical cardstock layers */}
                {Array.from({ length: Math.min(4, 9 - currentSlotIndex) }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-2xl pointer-events-none transition-transform"
                    style={{
                      transform: `translate(${(i + 1) * 3}px, ${(i + 1) * 4}px) scale(${
                        1 - (i + 1) * 0.015
                      })`,
                      zIndex: -i - 1,
                      opacity: 0.9 - i * 0.15,
                      boxShadow: `0 ${(i + 1) * 4}px ${(i + 1) * 8}px rgba(0,0,0,0.6)`,
                    }}
                  >
                    <div className="w-full h-full rounded-2xl overflow-hidden border-r-2 border-b-2 border-slate-300/40">
                      <PokemonCardBack />
                    </div>
                  </div>
                ))}

                {/* The Active Top Card */}
                <div
                  className={`w-full h-full relative rounded-2xl transition-transform duration-500 ease-out ${
                    currentCard.is_hit && isCurrentCardRevealed ? 'animate-[hitPulse_2.5s_infinite]' : ''
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isCurrentCardRevealed
                      ? `rotateY(0deg) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg)`
                      : 'rotateY(180deg)',
                    boxShadow:
                      currentCard.is_hit && isCurrentCardRevealed
                        ? `0 0 45px ${currentRarityCfg.glow}, 0 25px 50px rgba(0,0,0,0.9)`
                        : '0 20px 45px rgba(0,0,0,0.75)',
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/10 transition-colors">
                      <span className="px-4 py-2.5 rounded-xl bg-black/85 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-2xl animate-pulse flex items-center gap-2">
                        <Sparkles size={15} className="text-amber-400" />
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
                    {(currentCard.is_holo || currentCard.is_hit || currentCard.is_reverse) && (
                      <div
                        className="absolute inset-0 pointer-events-none opacity-45 mix-blend-color-dodge animate-[rainbowSweep_3.5s_ease_infinite]"
                        style={{
                          background:
                            'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.7) 45%, transparent 70%)',
                          backgroundSize: '250% 250%',
                        }}
                      />
                    )}

                    {/* Dynamic Holographic Glare Layer Tracking Mouse Tilt */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-55 mix-blend-color-dodge transition-opacity"
                      style={{
                        background: `radial-gradient(circle at ${50 + cardTilt.x * 2.5}% ${
                          50 - cardTilt.y * 2.5
                        }%, rgba(255,255,255,0.75) 0%, rgba(255,200,255,0.3) 30%, transparent 60%)`,
                      }}
                    />

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
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-md bg-black/85 border border-white/20 text-emerald-400 font-black text-xs shadow-md">
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

                    {/* Advance Cue on Card hover */}
                    <div className="absolute inset-x-0 bottom-12 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-400/30">
                        Cliquer sur la carte pour la suivante →
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3D 360° Inspect Button right below the card */}
                {isCurrentCardRevealed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectCard(currentCard);
                    }}
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/85 hover:bg-black text-[11px] font-bold text-amber-300 border border-amber-400/50 shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    <Eye size={12} />
                    <span>Inspecter en 3D 360°</span>
                  </button>
                )}
              </div>

              {/* Floating Right Arrow (Next Card / Reveal) */}
              <button
                onClick={handleCardClick}
                className="p-3 rounded-2xl border transition-all z-20 hover:scale-110 active:scale-95 bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-xl"
                title={
                  isCurrentCardRevealed
                    ? 'Carte suivante (Flèche droite ou clic)'
                    : 'Révéler la carte (Flèche droite ou clic)'
                }
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Suspense progress indicator & controls */}
            <div className="flex flex-col items-center gap-3 w-full max-w-md mt-1">
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
                {!isCurrentCardRevealed ? (
                  <button
                    onClick={handleRevealCurrentCard}
                    className="flex-1 py-3 px-6 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-500 to-rose-600 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={16} />
                    <span>Révéler la carte (Clic ou Espace)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextCard}
                    className="flex-1 py-3 px-6 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{currentSlotIndex === 9 ? 'Voir le Bilan du Pack 🏆' : 'Carte Suivante → (ou Clic)'}</span>
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
          <div className="w-full max-w-6xl flex flex-col items-center gap-6 py-2 pb-12">
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
                  Ces cartes ont été automatiquement ajoutées à votre classeur personnel ! (Simulation 100% fun, non vendables).
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
                        className="relative aspect-[63/88] rounded-lg overflow-hidden bg-black/50 mb-2 cursor-pointer"
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
                        title={isSaved ? 'Enregistrée dans mes favoris' : 'Favori'}
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
                onClick={() => setPhase('BINDER_COLLECTION')}
                className="px-5 py-3 rounded-xl font-bold text-sm text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center gap-2"
              >
                <BookOpen size={15} />
                <span>Consulter mon Classeur ({collectionMetrics.totalCount} cartes)</span>
              </button>

              <button
                onClick={() => setPhase('SELECT_SERIES')}
                className="px-5 py-3 rounded-xl font-bold text-sm text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all flex items-center gap-2"
              >
                <Layers size={15} />
                <span>Changer d'extension</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 5: VIRTUAL BINDER COLLECTION (MON CLASSEUR VIRTUEL) ────── */}
        {phase === 'BINDER_COLLECTION' && (
          <div className="w-full max-w-6xl flex flex-col items-center gap-6 py-2 pb-12">
            {/* Binder Header Hero */}
            <div className="w-full rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-white/[0.1] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="relative z-10 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <BookOpen size={12} />
                    <span>Classeur Virtuel Officiel</span>
                  </span>
                  <span className="text-xs text-gray-400">Simulation de Collection</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                  Ma Collection de Cartes Pokémon
                </h2>
                <p className="text-xs md:text-sm text-gray-300 mt-1 max-w-xl">
                  Toutes les cartes tirées lors de vos ouvertures de boosters sont automatiquement archivées dans ce classeur.
                </p>
              </div>

              {/* Binder Metrics Cards */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Cartes</span>
                  <span className="text-lg font-black text-white">{collectionMetrics.totalCount}</span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Uniques</span>
                  <span className="text-lg font-black text-cyan-400">{collectionMetrics.uniqueCount}</span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Hits Rares</span>
                  <span className="text-lg font-black text-amber-400">{collectionMetrics.hitsCount}</span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-center">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Cote Estimée</span>
                  <span className="text-lg font-black text-emerald-400">{collectionMetrics.totalValue.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/[0.08]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={binderSearch}
                  onChange={(e) => setBinderSearch(e.target.value)}
                  placeholder="Rechercher par nom de Pokémon ou numéro..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Extension filter */}
              <select
                value={binderSeriesFilter}
                onChange={(e) => setBinderSeriesFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/[0.08] text-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Toutes les extensions</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              {/* Rarity filter */}
              <select
                value={binderRarityFilter}
                onChange={(e) => setBinderRarityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/[0.08] text-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Toutes les raretés</option>
                <option value="HITS" className="bg-slate-900">Hits uniquement (ex, AR, SAR, Gold)</option>
                <option value="SAR_GOLD" className="bg-slate-900">Illustration Spéciale & Gold</option>
                <option value="HOLO" className="bg-slate-900">Holo & Reverse Holo</option>
              </select>

              {/* Sort filter */}
              <select
                value={binderSort}
                onChange={(e) => setBinderSort(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white/[0.04] border border-white/[0.08] text-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="PRICE_DESC" className="bg-slate-900">Cote (€) décroissante</option>
                <option value="PRICE_ASC" className="bg-slate-900">Cote (€) croissante</option>
                <option value="NAME_ASC" className="bg-slate-900">Nom (A-Z)</option>
              </select>
            </div>

            {/* Binder 9-Pocket Pages Display */}
            {filteredCollection.length === 0 ? (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center rounded-2xl bg-slate-900/30 border border-dashed border-white/[0.1]">
                <BookOpen size={48} className="text-gray-600 mb-3" />
                <h3 className="text-base font-bold text-white">Aucune carte dans cette vue</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {collection.length === 0
                    ? 'Votre classeur est vide pour l\'instant ! Ouvrez votre premier booster pour commencer votre collection.'
                    : 'Aucune carte ne correspond à vos critères de recherche.'}
                </p>
                <button
                  onClick={() => setPhase('SELECT_SERIES')}
                  className="mt-4 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-rose-600 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Zap size={14} />
                  <span>Ouvrir un Booster</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 w-full">
                {filteredCollection.map((card) => {
                  const cfg = getRarityCfg(card.pull_rarity);
                  return (
                    <div
                      key={card.id}
                      onClick={() => setInspectCard(card)}
                      className={`rounded-xl overflow-hidden border p-2 bg-slate-900/70 hover:bg-slate-900/95 transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:scale-[1.03] ${
                        card.is_hit
                          ? 'border-amber-400/60 shadow-[0_4px_16px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30'
                          : 'border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {/* Pocket Card Slot */}
                      <div className="relative aspect-[63/88] rounded-lg overflow-hidden bg-black/60 mb-1.5 shadow-inner">
                        <img
                          src={card.image_small || card.image_large || '/placeholder-card.png'}
                          alt={card.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Reverse Holo shimmer */}
                        {card.is_reverse && (
                          <div
                            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge"
                            style={{
                              background:
                                'linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.6) 50%, transparent 80%)',
                            }}
                          />
                        )}

                        {/* Quantity badge if duplicate */}
                        {(card.count || 1) > 1 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/85 text-amber-300 font-black text-[10px] border border-amber-400/50 shadow">
                            ×{card.count}
                          </div>
                        )}

                        {/* Hit star */}
                        {card.is_hit && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white shadow">
                            <Star size={11} fill="currentColor" />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="px-2.5 py-1 rounded-lg bg-black/85 text-white text-[10px] font-bold border border-white/20 flex items-center gap-1 shadow-lg">
                            <Eye size={12} />
                            <span>Inspecter 3D</span>
                          </span>
                        </div>
                      </div>

                      {/* Card meta */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[95px]"
                            style={{
                              background: `${cfg.color}20`,
                              color: cfg.color,
                              border: `1px solid ${cfg.color}40`,
                            }}
                          >
                            {card.pull_rarity}
                          </span>
                          <span className="text-[11px] font-black text-emerald-400">
                            {card.market_price ? `${card.market_price.toFixed(2)} €` : '—'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{card.name}</p>
                        <p className="text-[9px] text-gray-500">
                          N° {card.number} • {card.set_name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Binder Footer Actions */}
            <div className="flex flex-wrap items-center justify-between w-full pt-4 border-t border-white/[0.08] gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPhase('SELECT_SERIES')}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-rose-600 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Zap size={14} />
                  <span>Ouvrir un nouveau booster</span>
                </button>

                {packData && (
                  <button
                    onClick={() => setPhase('SUMMARY_BINDER')}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-colors"
                  >
                    Retour au bilan du tirage
                  </button>
                )}
              </div>

              {collection.length > 0 && (
                <button
                  onClick={() => {
                    const ok = window.confirm(
                      'Êtes-vous sûr de vouloir vider l\'ensemble de votre classeur virtuel de simulation ? Cette action est irréversible.'
                    );
                    if (ok) {
                      setCollection([]);
                      saveCollectionToStorage([]);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Vider mon classeur</span>
                </button>
              )}
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
