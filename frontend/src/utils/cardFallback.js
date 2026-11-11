export const POKEMON_CARD_BACK_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <rect width="300" height="420" rx="16" fill="#1E293B"/>
  <rect x="10" y="10" width="280" height="400" rx="12" fill="none" stroke="#94A3B8" stroke-width="2" opacity="0.5"/>
  <circle cx="150" cy="200" r="56" fill="#111827" stroke="#E5E8EE" stroke-width="4"/>
  <path d="M 94 200 A 56 56 0 0 1 206 200 Z" fill="#D93829"/>
  <path d="M 94 200 A 56 56 0 0 0 206 200 Z" fill="#FFFFFF"/>
  <line x1="94" y1="200" x2="206" y2="200" stroke="#111827" stroke-width="8"/>
  <circle cx="150" cy="200" r="18" fill="#111827"/>
  <circle cx="150" cy="200" r="11" fill="#FFFFFF"/>
  <text x="150" y="315" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#F8FAFC" text-anchor="middle" letter-spacing="3">POKÉVINTED</text>
  <text x="150" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#94A3B8" text-anchor="middle">CARTE DE COLLECTION</text>
</svg>
`);

