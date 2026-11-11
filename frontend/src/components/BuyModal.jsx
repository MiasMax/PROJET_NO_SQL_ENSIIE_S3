import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, AlertCircle, LogIn } from 'lucide-react';
import { formatPrice, isSameSeller } from '../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../utils/cardFallback';
import CardWearOverlay from './CardWearOverlay';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ConditionBadge from './ui/ConditionBadge';

export default function BuyModal({ isOpen, onClose, listing, currentUser, onPurchaseComplete, onOpenLogin }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);

  if (!isOpen || !listing) return null;

  const isLoggedIn = Boolean(currentUser && currentUser.id);
  const isSold = listing.status === 'SOLD' || Boolean(successOrder);
  const isOutOfStock = listing.status === 'OUT_OF_STOCK' || Boolean(listing.isCatalogReference) || !listing.id;
  const buyerName = currentUser?.name || currentUser?.username || 'Acheteur';
  const buyerId = currentUser?.id || 'sacha';
  const currentBalance = Number(currentUser?.balance ?? 0);
  const price = Number(listing.price);
  const hasSufficientFunds = currentBalance >= price;
  const remainingBalance = Math.max(0, currentBalance - price);
  const isOwnListing = isSameSeller(currentUser, listing.seller_name);

  const handleClose = () => {
    setSuccessOrder(null);
    setError(null);
    onClose();
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (isSold) {
      setError('Cette annonce a déjà été vendue.');
      return;
    }
    if (isOutOfStock) {
      setError('Aucune offre active disponible pour cette carte.');
      return;
    }
    if (!isLoggedIn) {
      handleClose();
      onOpenLogin?.();
      return;
    }
    if (loading) return;

    if (isOwnListing) {
      setError('Vous ne pouvez pas acheter votre propre annonce.');
      return;
    }
    if (!hasSufficientFunds) {
      setError(`Solde insuffisant : il manque ${formatPrice(price - currentBalance)}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const response = await fetch(`/api/listings/${listing.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({
          buyer_name: buyerName,
          buyer_id: buyerId,
          agreed_price: price,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          typeof errData.detail === 'string'
            ? errData.detail
            : Array.isArray(errData.detail) && errData.detail.length > 0
            ? errData.detail[0]?.msg || 'Erreur de validation de la commande.'
            : "Échec de l'achat.";
        throw new Error(errMsg);
      }

      const order = await response.json();
      setSuccessOrder(order);
      onPurchaseComplete?.(order, listing.id);
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'achat.");
    } finally {
      setLoading(false);
    }
  };

  if (successOrder) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="sm">
        <Modal.Header
          title="Achat confirmé"
          icon={<CheckCircle2 size={18} className="text-[#15803D]" />}
        />
        <Modal.Body className="space-y-4">
          <p className="text-sm text-neo-ink-2 leading-relaxed">
            La carte est réservée à votre nom. Le vendeur a été notifié pour l’expédition sous protection.
          </p>

          <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neo-ink-3">Référence</dt>
              <dd className="font-mono font-semibold text-neo-ink">{successOrder.id?.slice(0, 12)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neo-ink-3">Carte</dt>
              <dd className="font-bold text-neo-ink text-right">{successOrder.card_name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neo-ink-3">Montant débité</dt>
              <dd className="font-mono font-bold text-neo-ink">{formatPrice(successOrder.price)}</dd>
            </div>
            {successOrder.buyer_balance != null && (
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-neo-border">
                <dt className="text-neo-ink-3 font-medium">Nouveau solde</dt>
                <dd className="font-mono font-bold text-[#15803D]">{formatPrice(successOrder.buyer_balance)}</dd>
              </div>
            )}
          </dl>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleClose();
              navigate('/orders');
            }}
          >
            Voir mes achats
          </Button>
          <Button variant="primary" size="sm" onClick={handleClose}>
            Retour au catalogue
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <Modal.Header
        title="Confirmer l'achat"
        subtitle={listing.set_name}
      />

      <form onSubmit={handlePurchase} className="flex flex-col flex-1 overflow-hidden">
        <Modal.Body className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoggedIn && (
            <div className="p-3.5 rounded-[6px] bg-[#EFF6FF] border-[1.5px] border-[#BFDBFE] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#1E40AF]">
                <LogIn size={16} className="shrink-0" />
                <span>Connectez-vous pour régler avec votre portefeuille.</span>
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  handleClose();
                  onOpenLogin?.();
                }}
              >
                Connexion
              </Button>
            </div>
          )}

          {/* Clean Item Recap */}
          <div className="flex gap-4 items-start">
            <div className="relative w-24 aspect-[63/88] rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border overflow-hidden shrink-0 flex items-center justify-center p-1">
              <img
                src={listing.image_url || POKEMON_CARD_BACK_FALLBACK}
                alt={listing.card_name}
                className="w-full h-full object-contain rounded-[4px]"
                style={{
                  filter:
                    listing.condition === 'PLAYED'
                      ? 'saturate(0.90) contrast(0.95)'
                      : listing.condition === 'GOOD'
                      ? 'saturate(0.95)'
                      : 'none',
                }}
              />
              <CardWearOverlay condition={listing.condition} />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h3 className="text-lg font-bold text-neo-ink leading-snug">{listing.card_name}</h3>
                <p className="text-xs text-neo-ink-3 mt-0.5">
                  {listing.set_name}{listing.rarity ? ` — ${listing.rarity}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <ConditionBadge condition={listing.condition} />
                <span className="text-xs text-neo-ink-3">
                  Vendeur : <strong className="text-neo-ink">{listing.seller_name}</strong>
                </span>
              </div>

              {listing.description && (
                <p className="text-xs text-neo-ink-2 bg-neo-muted border border-neo-border rounded-[6px] px-2.5 py-2 line-clamp-2">
                  « {listing.description} »
                </p>
              )}

              <div className="pt-1 font-mono text-2xl font-bold text-neo-ink tabular-nums">
                {formatPrice(price)}
              </div>
            </div>
          </div>

          {/* Wallet Recap */}
          {isLoggedIn && (
            <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-neo-ink-3">Solde disponible</dt>
                <dd className="font-mono font-semibold text-neo-ink tabular-nums">
                  {formatPrice(currentBalance)}
                </dd>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neo-border">
                <dt className="text-neo-ink-2 font-medium">Solde après achat</dt>
                <dd className={`font-mono font-bold tabular-nums ${hasSufficientFunds ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                  {hasSufficientFunds ? formatPrice(remainingBalance) : 'Solde insuffisant'}
                </dd>
              </div>
              {!hasSufficientFunds && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate('/profile');
                    }}
                    className="text-xs font-semibold text-neo-cobalt hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Recharger mon portefeuille
                  </button>
                </div>
              )}
            </dl>
          )}

          <p className="text-xs text-neo-ink-3 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-neo-cobalt shrink-0" aria-hidden="true" />
            <span>Protection acheteur incluse · Débit immédiat du portefeuille</span>
          </p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || listing.status === 'SOLD' || isOutOfStock || isOwnListing || (isLoggedIn && !hasSufficientFunds)}
          >
            {loading
              ? 'Validation…'
              : listing.status === 'SOLD'
              ? 'Déjà vendue'
              : isOutOfStock
              ? 'Indisponible'
              : !isLoggedIn
              ? 'Se connecter pour acheter'
              : hasSufficientFunds
              ? `Confirmer · ${formatPrice(price)}`
              : 'Solde insuffisant'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
