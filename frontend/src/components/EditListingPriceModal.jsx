import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Tag, TrendingDown, Sparkles } from 'lucide-react';

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
  const isValidPrice = !isNaN(parsedNewPrice) && parsedNewPrice > 0 && parsedNewPrice <= 100000;
  const priceDiff = isValidPrice ? parsedNewPrice - currentPrice : 0;

  const handleApplyDiscount = (pct) => {
    const discounted = Math.max(0.5, currentPrice * (1 - pct / 100));
    setNewPrice(discounted.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPrice) {
      setError("Veuillez saisir un prix valide supérieur à 0 €.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sellerHandle = currentUser?.name || currentUser?.username || listing.seller_name;
      const res = await fetch(`/api/listings/${listing.id}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: parsedNewPrice,
          seller_name: sellerHandle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Erreur lors de la mise à jour du prix.");
      }

      const updated = await res.json();
      if (showToast) {
        showToast(`🏷️ Prix mis à jour : ${parsedNewPrice.toFixed(2).replace('.', ',')} € !`);
      }
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#007782]/20 border border-[#007782]/30 flex items-center justify-center text-[#00a8b5]">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Modifier le prix</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">
                {listing.card_name} ({listing.set_name})
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Card Recap preview */}
        <div className="bg-[#1a2236]/70 border border-white/[0.08] rounded-xl p-3 mb-4 flex items-center gap-3">
          {listing.image_url && (
            <img
              src={listing.image_url}
              alt={listing.card_name}
              className="w-10 h-14 object-contain rounded bg-slate-900 border border-white/10 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Prix actuel :</span>
              <span className="font-semibold text-slate-300 tabular-nums">
                {currentPrice.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">État :</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                {listing.condition || 'NEAR_MINT'}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Nouveau prix de vente (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.50"
                max="100000"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Ex: 24.50"
                className="w-full h-11 px-3.5 pr-10 rounded-xl bg-slate-900 border border-white/10 text-white font-bold text-base focus:outline-none focus:border-[#007782] focus:ring-1 focus:ring-[#007782] transition-colors tabular-nums"
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                €
              </span>
            </div>

            {/* Price change badge */}
            {isValidPrice && priceDiff !== 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {priceDiff < 0 ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingDown size={13} />
                    Baisse de {Math.abs(priceDiff).toFixed(2).replace('.', ',')} € (-{Math.round((Math.abs(priceDiff) / currentPrice) * 100)} %)
                  </span>
                ) : (
                  <span className="text-indigo-300 font-medium">
                    Hausse de +{priceDiff.toFixed(2).replace('.', ',')} €
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick adjustment pills */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
              Ajustements rapides recommandés :
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyDiscount(5)}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-white/5 cursor-pointer"
              >
                -5 %
              </button>
              <button
                type="button"
                onClick={() => handleApplyDiscount(10)}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-white/5 cursor-pointer"
              >
                -10 %
              </button>
              <button
                type="button"
                onClick={() => handleApplyDiscount(15)}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-white/5 cursor-pointer"
              >
                -15 %
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !isValidPrice || parsedNewPrice === currentPrice}
              className="h-10 px-5 rounded-lg text-xs font-semibold bg-[#007782] hover:bg-[#00656f] active:bg-[#00555e] text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              <span>{loading ? "Enregistrement..." : "Enregistrer le prix"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
