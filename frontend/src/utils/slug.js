/**
 * Utility functions for generating and resolving SEO-friendly card route slugs.
 * Format: [extension]-[nom-pokemon]-[numero-carte]
 * Example: ecarlate-et-violet-151-dracaufeu-ex-006
 */

export function cleanSlugString(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (é -> e, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

export function generateCardSlug(item) {
  if (!item) return 'carte';

  const setName = cleanSlugString(item.set_name || 'pokemon');
  const cardName = cleanSlugString(item.card_name || item.name || 'carte');

  // Extract card number (either explicit number or from ID like sv3pt5-006)
  let numberStr = item.number;
  if (!numberStr && item.card_id) {
    const parts = item.card_id.split('-');
    numberStr = parts[parts.length - 1];
  } else if (!numberStr && item.id && item.id.includes('-') && !item.id.includes('listing')) {
    const parts = item.id.split('-');
    numberStr = parts[parts.length - 1];
  }

  const cleanNum = cleanSlugString(numberStr || '');

  if (setName && cardName) {
    return cleanNum ? `${setName}-${cardName}-${cleanNum}` : `${setName}-${cardName}`;
  }
  return cardName || item.id || 'carte';
}

export function matchSlugWithCard(slug, item) {
  if (!slug || !item) return false;
  const targetSlug = generateCardSlug(item);
  if (targetSlug === slug) return true;

  // Direct ID check in case raw UUID or card_id was requested
  if (item.id === slug || item.card_id === slug) return true;

  // Permissive substring check
  const cardNameClean = cleanSlugString(item.card_name || item.name);
  const setClean = cleanSlugString(item.set_name);
  if (cardNameClean && setClean) {
    if (slug.includes(cardNameClean) && slug.includes(setClean)) {
      return true;
    }
  }

  return false;
}
