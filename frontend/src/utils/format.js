export function formatPrice(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return '-- €';
  return `${num.toFixed(2).replace('.', ',')} €`;
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function formatOrderDate(raw) {
  if (!raw) return 'Récemment';
  try {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const clean = String(raw).replace(/\.\d+/, '');
    const d2 = new Date(clean);
    if (!Number.isNaN(d2.getTime())) {
      return d2.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    // Fallback below
  }
  return 'Récemment';
}

export const CONDITION_OPTIONS = [
  {
    value: 'MINT',
    label: 'Mint',
    shortLabel: 'Mint',
    grade: '10',
    pctLabel: '+5%',
    multiplier: 1.05,
    tagline: 'Parfait état',
    desc: 'Sortie de booster sous toploader, aucun défaut visible.',
    centering: 98,
    corners: 99,
    edges: 99,
    surface: 98,
    badgeClass: 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] dark:bg-[#052E16] dark:text-[#86EFAC] dark:border-[#166534]',
  },
  {
    value: 'NEAR_MINT',
    label: 'Near Mint',
    shortLabel: 'NM',
    grade: '9',
    pctLabel: 'Réf.',
    multiplier: 1.0,
    tagline: 'Quasi neuf',
    desc: 'Infimes micro-défauts de bordure, non jouée.',
    centering: 92,
    corners: 94,
    edges: 91,
    surface: 95,
    badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD] dark:bg-[#0B2545] dark:text-[#93C5FD] dark:border-[#1D4ED8]',
  },
  {
    value: 'EXCELLENT',
    label: 'Excellent',
    shortLabel: 'EX',
    grade: '7.5',
    pctLabel: '-20%',
    multiplier: 0.8,
    tagline: 'Très bon état',
    desc: 'Légers points blancs de bord ou micro-frottements.',
    centering: 85,
    corners: 88,
    edges: 82,
    surface: 89,
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] dark:bg-[#422006] dark:text-[#FDE68A] dark:border-[#B45309]',
  },
  {
    value: 'GOOD',
    label: 'Good',
    shortLabel: 'GD',
    grade: '6',
    pctLabel: '-40%',
    multiplier: 0.6,
    tagline: 'Bon état',
    desc: 'Traces superficielles de manipulation, sans pliure majeure.',
    centering: 78,
    corners: 80,
    edges: 75,
    surface: 80,
    badgeClass: 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74] dark:bg-[#431407] dark:text-[#FED7AA] dark:border-[#C2410C]',
  },
  {
    value: 'PLAYED',
    label: 'Played',
    shortLabel: 'PL',
    grade: '4.5',
    pctLabel: '-55%',
    multiplier: 0.45,
    tagline: 'Jouée',
    desc: 'Usure prononcée visible, idéale pour jouer ou compléter un classeur.',
    centering: 70,
    corners: 72,
    edges: 68,
    surface: 70,
    badgeClass: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] dark:bg-[#450A0A] dark:text-[#FCA5A5] dark:border-[#B91C1C]',
  },
];

export function getConditionMeta(condition) {
  const key = String(condition || 'NEAR_MINT').toUpperCase();
  return CONDITION_OPTIONS.find((c) => c.value === key) || CONDITION_OPTIONS[1];
}

export function isSameSeller(currentUser, sellerName) {
  if (!currentUser || !sellerName) return false;
  const userName = (currentUser.name || '').toLowerCase().trim();
  const userHandle = (currentUser.username || '').toLowerCase().trim();
  const seller = sellerName.toLowerCase().trim();
  if (!seller) return false;
  return (userName && userName === seller) || (userHandle && userHandle === seller);
}

