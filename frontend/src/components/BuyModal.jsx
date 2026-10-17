import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, ShoppingBag, AlertCircle, Wallet, UserCheck, LogIn } from 'lucide-react';
import CardWearOverlay from './CardWearOverlay';

const getConditionBadgeClass = (cond) => {
  switch (cond) {
    case 'MINT':
      return 'badge-mint';
    case 'NEAR_MINT':
      return 'badge-near-mint';
    case 'EXCELLENT':
      return 'badge-excellent';
    default:
      return 'badge-played';
  }
};

export default function BuyModal({ isOpen, onClose, listing, currentUser, onPurchaseComplete, onOpenLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [isPurchased, setIsPurchased] = useState(false);

  if (!isOpen || !listing) return null;

  const isLoggedIn = Boolean(currentUser && currentUser.id);
  const isSold = listing.status === 'SOLD' || isPurchased;
  const isOutOfStock = listing.status === 'OUT_OF_STOCK' || Boolean(listing.isCatalogReference) || !listing.id;
  const buyerName = currentUser?.name || currentUser?.username || 'Acheteur';
  const buyerId = currentUser?.id || 'sacha';
  const currentBalance = Number(currentUser?.balance ?? 0);
  const price = Number(listing.price);
  const hasSufficientFunds = currentBalance >= price;
  const remainingBalance = Math.max(0, currentBalance - price);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (isSold) {
      setError("Cette annonce a déjà été vendue.");
      return;
    }

    if (isOutOfStock) {
      setError("Cette carte fait partie du catalogue de référence et ne possède aucune offre en vente active.");
      return;
    }

    if (!isLoggedIn) {
      if (onOpenLogin) {
        onClose();
        onOpenLogin();
      }
      return;
    }

    if (isPurchased || loading) return; // Anti-duplicate double click protection

    const currentUserName = (currentUser.name || currentUser.username || '').toLowerCase().trim();
    const itemSeller = (listing?.seller_name || '').toLowerCase().trim();
    if (currentUserName && itemSeller && (currentUserName === itemSeller || itemSeller.includes(currentUserName) || currentUserName.includes(itemSeller))) {
      setError("Vous ne pouvez pas acheter votre propre annonce !");
      return;
    }

    if (!hasSufficientFunds) {
      setError(`Solde insuffisant : vous disposez de ${currentBalance.toFixed(2)} € pour un montant requis de ${price.toFixed(2)} €.`);
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
        let errMsg = "Échec de l'achat.";
        if (typeof errData.detail === 'string') {
          errMsg = errData.detail;
        } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
          errMsg = errData.detail[0]?.msg || "Erreur de validation de la commande.";
        }
        throw new Error(errMsg);
      }

      const order = await response.json();
      setIsPurchased(true);
      setSuccessOrder(order);
      onPurchaseComplete(order, listing.id);
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'achat.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessOrder(null);
    setError(null);
    setIsPurchased(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Acheter cette carte Pokémon</h2>
          <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {successOrder ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <CheckCircle size={64} color="var(--accent-emerald)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Félicitations pour votre achat !</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
              Votre commande est confirmée. Le vendeur a été notifié pour expédier votre carte protégée sous sleeve et toploader.
            </p>

            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', background: 'var(--bg-surface-elevated)', padding: '16px 20px', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
              <div
                className="relative rounded-xl overflow-hidden bg-[#121826] border border-white/20 shrink-0 shadow-lg"
                style={{ width: '74px', height: '103px' }}
              >
                <img
                  src={listing.image_url}
                  alt={successOrder.card_name}
                  className="w-full h-full object-contain p-0.5"
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

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Identifiant Commande :</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{successOrder.id.slice(0, 13)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carte :</span>
                  <div className="flex items-center gap-1.5">
                    <strong>{successOrder.card_name}</strong>
                    <span className={`condition-badge text-[10px] px-1.5 py-0.5 ${getConditionBadgeClass(listing.condition)}`}>
                      {listing.condition}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Montant débité :</span>
                  <strong style={{ color: '#ffffff', fontWeight: 700 }}>{successOrder.price.toFixed(2).replace('.', ',')} €</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Acheteur :</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{successOrder.buyer_name || buyerName}</strong>
                </div>
                {successOrder.buyer_balance !== undefined && successOrder.buyer_balance !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nouveau solde disponible :</span>
                    <strong style={{ color: 'var(--accent-emerald)', fontSize: '1rem' }}>{successOrder.buyer_balance.toFixed(2).replace('.', ',')} €</strong>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleClose} className="btn btn-primary" style={{ padding: '12px 32px' }}>
              Retour au Marketplace
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            {listing.status === 'SOLD' && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <AlertCircle size={18} /> Cette annonce a déjà été vendue.
              </div>
            )}

            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {!isLoggedIn && (
              <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LogIn size={20} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.9rem', color: '#c7d2fe' }}>
                    Connectez-vous pour finaliser cet achat avec votre solde.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLogin) onOpenLogin();
                  }}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  Se connecter
                </button>
              </div>
            )}

            <div className="buy-modal-grid">
              {/* Photorealistic card visual with authentic physical wear matching listing condition */}
              <div
                className="relative rounded-2xl overflow-hidden bg-[#121826] border border-white/20 shadow-2xl flex items-center justify-center"
                style={{
                  width: '100%',
                  aspectRatio: '63/88',
                  filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.6))',
                }}
              >
                <img
                  src={listing.image_url}
                  alt={listing.card_name}
                  className="w-full h-full object-contain p-1"
                  style={{
                    filter:
                      listing.condition === 'PLAYED'
                        ? 'saturate(0.90) contrast(0.95)'
                        : listing.condition === 'GOOD'
                        ? 'saturate(0.95)'
                        : 'none',
                  }}
                />

                {/* Physical condition wear overlay (creases, scratches, edge whitening, folds) */}
                <CardWearOverlay condition={listing.condition} />

                {/* Condition pill tag overlaid on the card preview */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none z-20">
                  <span
                    className={`condition-badge text-[10px] px-2.5 py-0.5 font-bold shadow-lg backdrop-blur-md ${getConditionBadgeClass(listing.condition)}`}
                  >
                    Aperçu état réel : {listing.condition}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{listing.card_name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {listing.set_name} • Rareté : {listing.rarity}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`condition-badge ${getConditionBadgeClass(listing.condition)}`}>
                    {listing.condition}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Vendu par <strong>{listing.seller_name}</strong>
                  </span>
                </div>

                {listing.condition !== 'MINT' && (
                  <div className="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-start gap-2 mt-1">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      <strong>Conformité visuelle certifiée :</strong> L'aperçu ci-contre applique fidèlement l'usure réelle ({listing.condition}) avec ses plis, micro-rayures et tranches blanchies.
                    </span>
                  </div>
                )}

                {listing.description && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '6px' }}>
                    « {listing.description} »
                  </p>
                )}

                <div style={{ marginTop: 'auto', fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {price.toFixed(2).replace('.', ',')} €
                </div>
              </div>
            </div>

            {/* Payment & Account balance summary */}
            {isLoggedIn && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <UserCheck size={16} color="var(--accent-primary)" /> Compte acheteur :
                  </span>
                  <strong>{buyerName}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <Wallet size={16} color="#007782" /> Solde actuel disponible :
                  </span>
                  <span style={{ fontWeight: 700, color: hasSufficientFunds ? 'var(--text-primary)' : 'var(--accent-crimson)' }}>
                    {currentBalance.toFixed(2).replace('.', ',')} €
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nouveau solde après achat :</span>
                  <strong style={{ color: hasSufficientFunds ? 'var(--accent-emerald)' : 'var(--accent-crimson)', fontSize: '1.05rem' }}>
                    {hasSufficientFunds ? `${remainingBalance.toFixed(2).replace('.', ',')} €` : 'Fonds insuffisants'}
                  </strong>
                </div>
              </div>
            )}

            <form onSubmit={handlePurchase} style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                <ShieldCheck size={18} color="#007782" />
                Protection Acheteur PokéVinted incluse • Débit immédiat et sécurisé de votre solde.
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleClose} className="btn btn-secondary">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || isPurchased || listing.status === 'SOLD' || isOutOfStock || (isLoggedIn && !hasSufficientFunds)}
                  className="h-11 px-7 rounded-lg text-sm font-semibold bg-[#007782] hover:bg-[#00656f] active:bg-[#00555e] text-white transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  style={{
                    opacity: (listing.status === 'SOLD' || isOutOfStock) ? 0.45 : ((!isLoggedIn || hasSufficientFunds) && !loading && !isPurchased ? 1 : 0.6),
                    cursor: (listing.status === 'SOLD' || isOutOfStock) ? 'not-allowed' : ((!isLoggedIn || hasSufficientFunds) && !loading && !isPurchased ? 'pointer' : 'not-allowed'),
                  }}
                >
                  {loading
                    ? 'Traitement...'
                    : listing.status === 'SOLD'
                    ? 'Carte déjà vendue'
                    : isOutOfStock
                    ? 'Aucune offre en vente'
                    : isPurchased
                    ? 'Acheté !'
                    : !isLoggedIn
                    ? 'Se connecter pour acheter'
                    : hasSufficientFunds
                    ? `Confirmer l'achat (${price.toFixed(2).replace('.', ',')} €)`
                    : 'Solde insuffisant'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
