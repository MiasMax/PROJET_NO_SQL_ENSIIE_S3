import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  X,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';
import CardWearOverlay from './CardWearOverlay';
import Drawer from './ui/Drawer';
import Button from './ui/Button';
import ConditionBadge from './ui/ConditionBadge';

export default function CartDrawer() {
  const navigate = useNavigate();
  const { currentUser, openLogin } = useAuth();
  const { handleBatchPurchaseComplete } = useMarketplace();
  const { showToast } = useToast();
  const {
    cartItems,
    itemCount,
    totalPrice,
    isCartOpen,
    closeCart,
    removeFromCart,
    clearCart,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [confirmedReceipt, setConfirmedReceipt] = useState(null);

  const currentBalance = Number(currentUser?.balance || 0);
  const hasSufficientFunds = currentBalance >= totalPrice;
  const remainingBalance = Math.max(0, currentBalance - totalPrice);
  const hasSoldItems = cartItems.some((item) => item.status === 'SOLD');

  const handleClose = () => {
    setConfirmedReceipt(null);
    setCheckoutError(null);
    closeCart();
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      handleClose();
      openLogin();
      return;
    }
    if (cartItems.length === 0) return;
    if (hasSoldItems) {
      setCheckoutError('Retirez les articles déjà vendus avant de valider.');
      return;
    }
    if (!hasSufficientFunds) {
      setCheckoutError(`Solde insuffisant : il manque ${formatPrice(totalPrice - currentBalance)}.`);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const buyerName = currentUser.name || currentUser.username || 'Acheteur';
      const buyerId = currentUser.id || 'sacha';

      const response = await fetch('/api/listings/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({
          listing_ids: cartItems.map((item) => item.id),
          buyer_name: buyerName,
          buyer_id: buyerId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Échec de la validation de la commande.');
      }

      const checkoutData = await response.json();
      clearCart();
      handleBatchPurchaseComplete(checkoutData);
      setConfirmedReceipt(checkoutData);
    } catch (err) {
      setCheckoutError(err.message || 'Une erreur est survenue lors de la commande.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <Drawer isOpen={isCartOpen} onClose={handleClose} ariaLabel="Mon panier" widthClass="max-w-md">
      {/* Header */}
      <div className="px-5 py-4 border-b-[1.5px] border-neo-border bg-neo-surface flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <ShoppingCart size={18} className="text-neo-ink" aria-hidden="true" />
          <h2 className="text-base font-bold text-neo-ink">
            Panier {itemCount > 0 && <span className="font-mono text-neo-cobalt">({itemCount})</span>}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {itemCount > 1 && !confirmedReceipt && (
            <Button variant="ghost" size="xs" onClick={clearCart} className="text-[#B91C1C]">
              Tout vider
            </Button>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer le panier"
            className="w-9 h-9 rounded-[6px] hover:bg-neo-muted text-neo-ink-3 hover:text-neo-ink flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {confirmedReceipt ? (
          <div className="py-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#DCFCE7] border-[1.5px] border-[#86EFAC] flex items-center justify-center text-[#15803D] shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neo-ink">Commande validée</h3>
                <p className="text-xs text-neo-ink-3 mt-0.5 leading-relaxed">
                  Vos cartes sont réservées et les vendeurs ont été prévenus pour l’expédition.
                </p>
              </div>
            </div>

            <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-neo-ink-3">Cartes achetées</dt>
                <dd className="font-mono font-bold text-neo-ink">{confirmedReceipt.item_count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neo-ink-3">Total réglé</dt>
                <dd className="font-mono font-bold text-neo-ink">{formatPrice(confirmedReceipt.total_amount)}</dd>
              </div>
              {confirmedReceipt.buyer_balance != null && (
                <div className="flex justify-between pt-2 border-t border-neo-border">
                  <dt className="text-neo-ink-3 font-medium">Nouveau solde</dt>
                  <dd className="font-mono font-bold text-[#15803D]">
                    {formatPrice(confirmedReceipt.buyer_balance)}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  handleClose();
                  navigate('/orders');
                }}
              >
                Voir mes commandes
              </Button>
              <Button variant="outline" size="md" onClick={handleClose}>
                Retour au catalogue
              </Button>
            </div>
          </div>
        ) : itemCount === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-[8px] bg-neo-muted border-[1.5px] border-neo-border flex items-center justify-center mx-auto text-neo-ink-3">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neo-ink">Votre panier est vide</h3>
              <p className="text-xs text-neo-ink-3 mt-1 max-w-xs mx-auto">
                Ajoutez plusieurs cartes pour les commander en une seule fois.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleClose();
                navigate('/');
              }}
            >
              Parcourir le catalogue
            </Button>
          </div>
        ) : (
          <>
            {checkoutError && (
              <div role="alert" className="p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {cartItems.map((item) => {
                const isItemSold = item.status === 'SOLD';
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-[6px] border-[1.5px] flex items-center gap-3 ${
                      isItemSold
                        ? 'bg-[#FEF2F2] border-[#FCA5A5] opacity-80'
                        : 'bg-neo-surface border-neo-border'
                    }`}
                  >
                    <div className="relative w-12 h-16 rounded-[4px] overflow-hidden bg-neo-muted border border-neo-border shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.card_name}
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <Layers size={18} className="text-neo-ink-3" />
                      )}
                      {item.condition && <CardWearOverlay condition={item.condition} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <ConditionBadge condition={item.condition} />
                        {isItemSold && (
                          <span className="text-[10px] font-bold text-[#B91C1C]">Déjà vendue</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-neo-ink truncate">{item.card_name}</h4>
                      <p className="text-xs text-neo-ink-3 truncate">Vendeur : {item.seller_name}</p>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Retirer ${item.card_name} du panier`}
                        className="w-8 h-8 rounded-[4px] hover:bg-[#FEE2E2] text-neo-ink-3 hover:text-[#B91C1C] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <span className="font-mono text-sm font-bold text-neo-ink tabular-nums">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-neo-ink-3">
                <dt>Sous-total ({itemCount})</dt>
                <dd className="font-mono font-semibold text-neo-ink tabular-nums">{formatPrice(totalPrice)}</dd>
              </div>
              <div className="flex justify-between text-neo-ink-3">
                <dt>Protection acheteur</dt>
                <dd className="font-semibold text-[#15803D]">Incluse</dd>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-neo-border">
                <dt className="text-sm font-bold text-neo-ink">Total</dt>
                <dd className="font-mono text-lg font-bold text-neo-ink tabular-nums">{formatPrice(totalPrice)}</dd>
              </div>
            </dl>

            {currentUser && (
              <dl className="bg-neo-surface border-[1.5px] border-neo-border rounded-[6px] p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-neo-ink-3 flex items-center gap-1.5">
                    <Wallet size={13} aria-hidden="true" />
                    <span>Solde actuel</span>
                  </dt>
                  <dd className="font-mono font-semibold text-neo-ink tabular-nums">
                    {formatPrice(currentBalance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neo-ink-3">Après règlement</dt>
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
          </>
        )}
      </div>

      {/* Footer */}
      {itemCount > 0 && !confirmedReceipt && (
        <div className="p-4 border-t-[1.5px] border-neo-border bg-neo-surface space-y-2 shrink-0">
          <p className="text-[11px] text-neo-ink-3 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-neo-cobalt shrink-0" aria-hidden="true" />
            <span>Paiement atomique : chaque vendeur est réglé à la validation.</span>
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isCheckingOut || hasSoldItems || (currentUser && !hasSufficientFunds)}
            onClick={handleCheckout}
          >
            {isCheckingOut
              ? 'Validation en cours…'
              : hasSoldItems
              ? 'Retirez les cartes vendues'
              : currentUser && !hasSufficientFunds
              ? `Solde insuffisant (${formatPrice(totalPrice)})`
              : `Confirmer la commande · ${formatPrice(totalPrice)}`}
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={handleClose}>
            Continuer mes achats
          </Button>
        </div>
      )}
    </Drawer>
  );
}
