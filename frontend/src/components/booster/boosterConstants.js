export const BINDER_STORAGE_KEY = 'pokevinted_booster_collection_guest';

export function clearLegacySharedBinderKey() {
  try {
    localStorage.removeItem('pokevinted_booster_collection');
  } catch {
    // ignore storage errors
  }
}

export const FALLBACK_SERIES = [
  { id: 'sv3pt5', name: 'Écarlate et Violet : 151', set_code: 'SV3.5', card_count: 165, accent: '#D93829' },
  { id: 'sv04', name: 'Faille Paradoxe', set_code: 'SV04', card_count: 182, accent: '#1D4ED8' },
  { id: 'sv03', name: 'Flammes Obsidiennes', set_code: 'SV03', card_count: 197, accent: '#B45309' },
  { id: 'sv01', name: 'Écarlate et Violet', set_code: 'SV01', card_count: 198, accent: '#047857' },
  { id: 'swsh12pt5', name: 'Zénith Suprême', set_code: 'SWSH12.5', card_count: 159, accent: '#6D28D9' },
  { id: 'base1', name: 'Set de Base (1999)', set_code: 'BASE', card_count: 102, accent: '#D93829' },
];

export const RARITY_CONFIG = {
  SECRET: {
    key: 'SECRET',
    label: 'Illustration Spéciale / Secrète',
    shortLabel: 'SECRET',
    isHit: true,
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] dark:bg-[#422006] dark:text-[#FCD34D] dark:border-[#D97706]',
    accentHex: '#D97706',
    prob: '3%',
    slotInfo: 'Slot 10 (Hit majeur)',
  },
  ULTRA: {
    key: 'ULTRA',
    label: 'Ultra Rare / Full Art',
    shortLabel: 'ULTRA',
    isHit: true,
    badgeClass: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] dark:bg-[#450A0A] dark:text-[#FCA5A5] dark:border-[#DC2626]',
    accentHex: '#D93829',
    prob: '12%',
    slotInfo: 'Slot 10 (Hit)',
  },
  HOLO: {
    key: 'HOLO',
    label: 'Holo Rare',
    shortLabel: 'HOLO',
    isHit: true,
    badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD] dark:bg-[#0B2545] dark:text-[#93C5FD] dark:border-[#2563EB]',
    accentHex: '#1D4ED8',
    prob: '25%',
    slotInfo: 'Slot 10',
  },
  RARE: {
    key: 'RARE',
    label: 'Rare',
    shortLabel: 'RARE',
    isHit: false,
    badgeClass: 'bg-[#EDE9FE] text-[#5B21B6] border-[#C4B5FD] dark:bg-[#2E1065] dark:text-[#DDD6FE] dark:border-[#7C3AED]',
    accentHex: '#6D28D9',
    prob: '60%',
    slotInfo: 'Slot 10 / 9',
  },
  UNCOMMON: {
    key: 'UNCOMMON',
    label: 'Peu Commune',
    shortLabel: 'PEU COMMUNE',
    isHit: false,
    badgeClass: 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] dark:bg-[#052E16] dark:text-[#86EFAC] dark:border-[#16A34A]',
    accentHex: '#15803D',
    prob: 'Garanti',
    slotInfo: 'Slots 6 à 8',
  },
  COMMON: {
    key: 'COMMON',
    label: 'Commune',
    shortLabel: 'COMMUNE',
    isHit: false,
    badgeClass: 'bg-neo-muted text-neo-ink-2 border-neo-border',
    accentHex: '#4B5563',
    prob: 'Garanti',
    slotInfo: 'Slots 1 à 5',
  },
};

export function getRarityCfg(rarityOrCard) {
  const isHitFlag = typeof rarityOrCard === 'object' && Boolean(rarityOrCard?.is_hit);
  const raw =
    typeof rarityOrCard === 'object'
      ? rarityOrCard?.pull_rarity || rarityOrCard?.rarity
      : rarityOrCard;
  const str = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (
    str.includes('SECRET') ||
    str.includes('HYPER') ||
    str.includes('GOLD') ||
    str.includes('SPECIAL') ||
    str.includes('ALTERNATIVE') ||
    str.includes('SIR') ||
    str.includes('SAR') ||
    str.includes('RAINBOW') ||
    str.includes('CHROMATIQUE ULTRA')
  ) {
    return RARITY_CONFIG.SECRET;
  }
  if (
    str.includes('ULTRA') ||
    str.includes('ILLUSTRATION') ||
    str.includes('FULL ART') ||
    str.includes('DOUBLE RARE') ||
    str.includes('HIGH-TECH') ||
    str.includes('ACE SPEC') ||
    str.includes('VMAX') ||
    str.includes('VSTAR') ||
    str.includes('EX') ||
    str.includes('GX') ||
    str.includes('RADIANT') ||
    str.includes('SHINY')
  ) {
    return RARITY_CONFIG.ULTRA;
  }
  if (str.includes('HOLO')) return RARITY_CONFIG.HOLO;
  if (str.includes('RARE')) return isHitFlag ? RARITY_CONFIG.HOLO : RARITY_CONFIG.RARE;
  if (str.includes('PEU COMMUNE') || str.includes('UNCOMMON')) return RARITY_CONFIG.UNCOMMON;
  return isHitFlag ? RARITY_CONFIG.ULTRA : RARITY_CONFIG.COMMON;
}

export function loadCollectionFromStorage() {
  try {
    const raw = localStorage.getItem(BINDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCollectionToStorage(items) {
  try {
    localStorage.setItem(BINDER_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export function playBoosterAudio(type, muted = false) {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tone = (freq, startOffset, duration, wave = 'sine', gainVal = 0.08) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(gainVal, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    if (type === 'tear') {
      tone(220, 0, 0.08, 'triangle', 0.08);
      tone(340, 0.06, 0.1, 'triangle', 0.07);
    } else if (type === 'warp') {
      tone(280, 0, 0.18, 'sine', 0.06);
      tone(420, 0.12, 0.2, 'sine', 0.06);
      tone(560, 0.24, 0.25, 'sine', 0.05);
    } else if (type === 'supernova') {
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(140, now);
      boom.frequency.exponentialRampToValueAtTime(34, now + 0.6);
      boomGain.gain.setValueAtTime(0.16, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      boom.connect(boomGain);
      boomGain.connect(ctx.destination);
      boom.start(now);
      boom.stop(now + 0.68);
      tone(660, 0.08, 0.22, 'triangle', 0.07);
    } else if (type === 'tease_tick') {
      const tick = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tick.type = 'sine';
      tick.frequency.setValueAtTime(150, now);
      tick.frequency.exponentialRampToValueAtTime(48, now + 0.11);
      tickGain.gain.setValueAtTime(0.09, now);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      tick.connect(tickGain);
      tickGain.connect(ctx.destination);
      tick.start(now);
      tick.stop(now + 0.14);
    } else if (type === 'flip') {
      tone(520, 0, 0.07, 'sine', 0.05);
    } else if (type === 'hit') {
      tone(523.25, 0, 0.14, 'triangle', 0.09);
      tone(659.25, 0.1, 0.16, 'triangle', 0.09);
      tone(783.99, 0.2, 0.28, 'triangle', 0.1);
    } else if (type === 'summary') {
      tone(440, 0, 0.12, 'sine', 0.06);
      tone(554.37, 0.09, 0.18, 'sine', 0.06);
    }
  } catch {
    // ignore WebAudio autoplay blocks
  }
}

