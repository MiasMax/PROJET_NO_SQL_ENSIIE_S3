import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  X,
  Trash2,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Wallet,
  Sparkles,
  Layers,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import CardWearOverlay from './CardWearOverlay';

export default function CartDrawer({
  currentUser,
  onBatchPurchaseComplete,
  onOpenLogin,
  showToast = () => {},
}) {
  const navigate = useNavigate();
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

  if (!isCartOpen) return null;

  const currentBalance = Number(currentUser?.balance || 0);
  const hasSufficientFunds = currentBalance >= totalPrice;
  const remainingBalance = Math.max(0, currentBalance - totalPrice);
  const hasSoldItems = cartItems.some((item) => item.status === 'SOLD');

  const handleCheckout = async () => {
    if (!currentUser) {
      closeCart();
      if (onOpenLogin) onOpenLogin();
      return;
    }

    if (cartItems.length === 0) return;

    if (hasSoldItems) {
      setCheckoutError("Veuillez retirer les articles vendus avant de valider votre commande.");
      return;
    }

    if (!hasSufficientFunds) {
      setCheckoutError(
        `Solde insuffisant : il vous manque ${(totalPrice - currentBalance).toFixed(2)} € pour régler cette commande.`
      );
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
        throw new Error(errData.detail || "Échec de la validation de la commande.");
      }

      const checkoutData = await response.json();

      // Clear cart upon successful atomic purchase
      clearCart();
      closeCart();

      // Notify parent app of completed batch purchase
      if (onBatchPurchaseComplete) {
        onBatchPurchaseComplete(checkoutData);
      } else {
        showToast(`🎉 Félicitations ! Vos ${checkoutData.item_count} cartes ont été commandées avec succès !`);
      }
    } catch (err) {
      setCheckoutError(err.message || "Une erreur est survenue lors de la commande.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleGoToMarket = () => {
    closeCart();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToRecharge = () => {
    closeCart();
    navigate('/profile');
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeCart}
      />

      {/* Drawer Container */}
      <aside
        role="dialog"
        aria-label="Mon panier"
        className="relative w-full max-w-lg bg-[#0f1422] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 animate-slide-left overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#121826]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Mon Panier
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {itemCount} article{itemCount > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Commande groupée & expédition multi-dresseurs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {itemCount > 1 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-red-400 font-semibold px-2.5 py-1 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                title="Vider tous les articles du panier"
              >
                Tout vider
              </button>
            )}
            <button
              type="button"
              onClick={closeCart}
              className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer le panier"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {itemCount === 0 ? (
            /* Empty Cart State */
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-600 mb-4 shadow-inner">
                <ShoppingCart size={36} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Votre panier est vide</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                Ajoutez les cartes de vos dresseurs favoris pour les commander toutes ensemble en 1 seul clic !
              </p>
              <button
                type="button"
                onClick={handleGoToMarket}
                className="btn btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Explorer la marketplace</span>
              </button>
            </div>
          ) : (
            /* Multi-item Card List */
            <>
              {/* Error banner */}
              {checkoutError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div>{checkoutError}</div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Articles sélectionnés ({itemCount})</span>
                  <span>Prix unitaire</span>
                </div>

                {cartItems.map((item) => {
                  const isItemSold = item.status === 'SOLD';
                  return (
                    <div
                      key={item.id}
                      className={`bg-[#121826] border rounded-2xl p-3.5 shadow-md transition-all flex items-center gap-3.5 ${
                        isItemSold
                          ? 'border-red-500/40 bg-red-950/15 opacity-75'
                          : 'border-white/10 hover:border-indigo-500/30'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0 flex items-center justify-center shadow-sm">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.card_name}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <Layers size={20} className="text-slate-600" />
                        )}
                        {item.condition && <CardWearOverlay condition={item.condition} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            item.condition === 'MINT' ? 'badge-mint' :
                            item.condition === 'NEAR_MINT' ? 'badge-near-mint' :
                            item.condition === 'EXCELLENT' ? 'badge-excellent' : 'badge-played'
                          }`}>
                            {item.condition || 'NEAR_MINT'}
                          </span>
                          {isItemSold && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded-full">
                              Déjà vendu
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-white truncate" title={item.card_name}>
                          {item.card_name}
                        </h4>

                        <p className="text-[11px] text-slate-400 truncate">
                          Vendu par <strong className="text-slate-300">{item.seller_name}</strong>
                        </p>
                      </div>

                      {/* Price & Remove */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                          title="Retirer cette carte du panier"
                        >
                          <Trash2 size={15} />
                        </button>

                        <span className="text-base font-black text-amber-400 tabular-nums">
                          {Number(item.price || 0).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-seller Escrow Perks */}
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                <ShieldCheck size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-indigo-300 block mb-0.5">Commande groupée sécurisée</strong>
                  Chaque carte est garantie 100% authentique. Les fonds sont mis sous séquestre atomique et reversés à chaque vendeur individuel après livraison.
                </div>
              </div>

              {/* Price Calculation */}
              <div className="bg-[#121826] border border-white/10 rounded-2xl p-4 space-y-2.5">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Récapitulatif de commande
                </h5>

                <div className="flex justify-between text-xs text-slate-400">
                  <span>Sous-total ({itemCount} carte{itemCount > 1 ? 's' : ''})</span>
                  <span className="font-semibold text-slate-200 tabular-nums">{totalPrice.toFixed(2)} €</span>
                </div>

                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    Protection acheteur & Séquestre
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                      OFFERTE
                    </span>
                  </span>
                  <span className="font-semibold text-emerald-400">0,00 €</span>
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-white">Total à régler</span>
                  <span className="text-xl font-black text-white tabular-nums">{totalPrice.toFixed(2)} €</span>
                </div>
              </div>

              {/* Buyer Balance Breakdown */}
              {currentUser && (
                <div className="bg-[#0a0d14]/70 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Wallet size={14} className="text-amber-400" />
                      Votre solde actuel
                    </span>
                    <strong className="text-white font-bold tabular-nums">
                      {currentBalance.toFixed(2)} €
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Solde après règlement</span>
                    <strong className={`font-bold tabular-nums ${hasSufficientFunds ? 'text-emerald-400' : 'text-red-400'}`}>
                      {hasSufficientFunds ? `${remainingBalance.toFixed(2)} €` : 'Solde insuffisant'}
                    </strong>
                  </div>

                  {!hasSufficientFunds && (
                    <div className="pt-2 flex items-center justify-between gap-2 text-xs border-t border-white/5">
                      <span className="text-[11px] text-red-400">
                        Manque {(totalPrice - currentBalance).toFixed(2)} €
                      </span>
                      <button
                        type="button"
                        onClick={handleGoToRecharge}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        Recharger mon solde →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        {itemCount > 0 && (
          <div className="p-5 border-t border-white/10 bg-[#121826]/95 backdrop-blur-md space-y-2.5">
            <button
              type="button"
              disabled={isCheckingOut || hasSoldItems || (currentUser && !hasSufficientFunds)}
              onClick={handleCheckout}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Traitement de la commande...</span>
                </>
              ) : hasSoldItems ? (
                <span>Retirer les cartes vendues</span>
              ) : currentUser && !hasSufficientFunds ? (
                <span>Solde insuffisant ({totalPrice.toFixed(2)} € requis)</span>
              ) : (
                <>
                  <span>
                    Commander {itemCount > 1 ? `les ${itemCount} cartes` : 'cette carte'} ({totalPrice.toFixed(2)} €)
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={closeCart}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors cursor-pointer text-center"
            >
              Continuer mes achats
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
