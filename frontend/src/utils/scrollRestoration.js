/**
 * Scroll Restoration & Return-Anchor Manager
 * 
 * Preserves exact scroll position, pagination page, and targeted card focus
 * across marketplace explorations and card inspection studios.
 */

const STORAGE_KEY = 'pokevinted_marketplace_scroll_state';

/**
 * Saves current marketplace state prior to navigating into a card detail view.
 */
export function saveMarketplaceScroll({ listing = null, page = 1 } = {}) {
  try {
    const scrollState = {
      scrollY: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0,
      listingId: listing?.id || null,
      cardId: listing?.card_id || null,
      page: page || 1,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(scrollState));
  } catch (err) {
    console.warn('[ScrollRestoration] Failed to save scroll state:', err);
  }
}

/**
 * Retrieves the currently saved marketplace scroll state.
 */
export function getSavedMarketplaceScroll() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

/**
 * Clears the saved marketplace scroll state (e.g., when resetting filters or logo click).
 */
export function clearSavedMarketplaceScroll() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Ignore storage errors
  }
}

/**
 * Progressively restores the scroll position and highlights the previously viewed card.
 */
export function restoreMarketplaceScroll() {
  const saved = getSavedMarketplaceScroll();
  if (!saved || typeof saved.scrollY !== 'number') return null;

  // Avoid restoring if the saved state is older than 30 minutes
  if (saved.timestamp && Date.now() - saved.timestamp > 30 * 60 * 1000) {
    clearSavedMarketplaceScroll();
    return null;
  }

  const applyRestoration = () => {
    let targetedEl = null;

    if (saved.listingId) {
      targetedEl = document.getElementById(`card-listing-${saved.listingId}`);
    }
    if (!targetedEl && saved.cardId) {
      targetedEl = document.querySelector(`[data-card-id="${saved.cardId}"]`);
    }

    if (targetedEl) {
      targetedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
      // Apply subtle return spotlight
      targetedEl.classList.remove('return-spotlight');
      // Trigger reflow to restart animation if needed
      void targetedEl.offsetWidth;
      targetedEl.classList.add('return-spotlight');
      setTimeout(() => {
        targetedEl.classList.remove('return-spotlight');
      }, 2000);
      return true;
    }

    // Fallback: direct numeric scroll
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ) - window.innerHeight;

    if (saved.scrollY > 0 && maxScroll >= saved.scrollY - 100) {
      window.scrollTo({ top: saved.scrollY, left: 0, behavior: 'instant' });
      return true;
    }

    return false;
  };

  // Immediate attempt
  if (!applyRestoration()) {
    // Staggered retries as React grid modules and card images mount
    requestAnimationFrame(() => {
      if (!applyRestoration()) {
        setTimeout(applyRestoration, 60);
        setTimeout(applyRestoration, 180);
      }
    });
  }

  return saved;
}
