import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Tag, TrendingDown } from 'lucide-react';
import { formatPrice } from '../utils/format';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ConditionBadge from './ui/ConditionBadge';

export default function EditListingPriceModal({
  isOpen,
  onClose,
  listing,
  currentUser,
  onSuccess,
  showToast,
}) {
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (listing?.price) {
      setNewPrice(Number(listing.price).toFixed(2));
      setError(null);
    }
  }, [listing]);

  if (!isOpen || !listing) return null;

  const currentPrice = Number(listing.price || 0);
  const parsedNewPrice = parseFloat(newPrice);
  const isValidPrice = !Number.isNaN(parsedNewPrice) && parsedNewPrice > 0 && parsedNewPrice <= 100000;
  const priceDiff = isValidPrice ? parsedNewPrice - currentPrice : 0;

  const handleApplyDiscount = (pct) => {
    const discounted = Math.max(0.5, currentPrice * (1 - pct / 100));
    setNewPrice(discounted.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPrice) {
      setError('Veuillez saisir un prix valide supérieur à 0 €.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const sellerHandle = currentUser?.name || currentUser?.username || listing.seller_name;
      const res = await fetch(`/api/listings/${listing.id}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({
          price: parsedNewPrice,
          seller_name: sellerHandle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Erreur lors de la mise à jour du prix.');
      }

      const updated = await res.json();
      showToast?.(`Prix mis à jour : ${formatPrice(parsedNewPrice)}`, 'success');
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} size="sm" closeOnBackdrop={!loading}>
      <Modal.Header
        title="Modifier le prix"
        subtitle={`${listing.card_name} (${listing.set_name})`}
        icon={<Tag size={17} />}
        hideClose={loading}
      />

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border">
            {listing.image_url && (
              <img
                src={listing.image_url}
                alt={listing.card_name}
                className="w-10 h-14 object-contain rounded-[4px] bg-neo-surface border border-neo-border shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neo-ink-3">Prix actuel</span>
                <span className="font-mono font-bold text-neo-ink tabular-nums">
                  {formatPrice(currentPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neo-ink-3">État</span>
                <ConditionBadge condition={listing.condition} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-listing-price-input" className="block text-xs font-semibold text-neo-ink mb-1.5">
              Nouveau prix (€)
            </label>
            <div className="relative">
              <input
                id="edit-listing-price-input"
                type="number"
                step="0.01"
                min="0.50"
                max="100000"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="24.50"
                autoFocus
                className="neo-input pr-9 font-mono font-bold text-base tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neo-ink-3 font-bold text-sm">
                €
              </span>
            </div>

            {isValidPrice && priceDiff !== 0 && (
              <p className="mt-1.5 text-xs font-medium flex items-center gap-1">
                {priceDiff < 0 ? (
                  <span className="text-[#15803D] flex items-center gap-1">
                    <TrendingDown size={13} aria-hidden="true" />
                    Baisse de {formatPrice(Math.abs(priceDiff))} (-{Math.round((Math.abs(priceDiff) / currentPrice) * 100)} %)
                  </span>
                ) : (
                  <span className="text-neo-cobalt">
                    Hausse de +{formatPrice(priceDiff)}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neo-ink-3">Ajustement :</span>
            {[5, 10, 15].map((pct) => (
              <Button key={pct} variant="subtle" size="xs" onClick={() => handleApplyDiscount(pct)}>
                -{pct} %
              </Button>
            ))}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading || !isValidPrice || parsedNewPrice === currentPrice}
          >
            <Check size={14} aria-hidden="true" />
            <span>{loading ? 'Enregistrement…' : 'Enregistrer'}</span>
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
