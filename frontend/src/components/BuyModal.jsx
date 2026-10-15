import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, ShoppingBag, AlertCircle, Wallet, UserCheck } from 'lucide-react';

export default function BuyModal({ isOpen, onClose, listing, currentUser, onPurchaseComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);

  if (!isOpen || !listing) return null;

  const buyerName = currentUser?.name || currentUser?.username || 'Acheteur';
  const buyerId = currentUser?.id || 'sacha';
  const currentBalance = Number(currentUser?.balance ?? 0);
  const price = Number(listing.price);
  const hasSufficientFunds = currentBalance >= price;
  const remainingBalance = Math.max(0, currentBalance - price);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!hasSufficientFunds) {
      setError(`Solde insuffisant : vous disposez de ${currentBalance.toFixed(2)} € pour un montant requis de ${price.toFixed(2)} €.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName,
          buyer_id: buyerId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Échec de l'achat.");
      }

      const order = await response.json();
      setSuccessOrder(order);
      onPurchaseComplete(order, listing.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessOrder(null);
    setError(null);
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
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <CheckCircle size={64} color="var(--accent-emerald)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Félicitations pour votre achat !</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Votre commande est confirmée. Le vendeur a été notifié pour expédier votre carte protégée sous sleeve et toploader.
            </p>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Identifiant Commande :</span>
                <span style={{ fontFamily: 'monospace' }}>{successOrder.id.slice(0, 13)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Carte :</span>
                <strong>{successOrder.card_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Montant débité :</span>
                <strong style={{ color: 'var(--accent-gold)' }}>{successOrder.price.toFixed(2)} €</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Acheteur :</span>
                <strong style={{ color: 'var(--text-primary)' }}>{successOrder.buyer_name || buyerName}</strong>
              </div>
              {successOrder.buyer_balance !== undefined && successOrder.buyer_balance !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Nouveau solde disponible :</span>
                  <strong style={{ color: 'var(--accent-emerald)', fontSize: '1.05rem' }}>{successOrder.buyer_balance.toFixed(2)} €</strong>
                </div>
              )}
            </div>

            <button onClick={handleClose} className="btn btn-primary" style={{ padding: '12px 32px' }}>
              Retour au Marketplace
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="buy-modal-grid">
              <img
                src={listing.image_url}
                alt={listing.card_name}
                style={{ width: '100%', height: 'auto', borderRadius: '8px', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{listing.card_name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {listing.set_name} • Rareté : {listing.rarity}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="condition-badge badge-mint">{listing.condition}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Vendu par <strong>{listing.seller_name}</strong>
                  </span>
                </div>

                {listing.description && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '6px' }}>
                    « {listing.description} »
                  </p>
                )}

                <div style={{ marginTop: 'auto', fontSize: '2rem', fontWeight: 900, color: 'var(--accent-gold)' }}>
                  {listing.price.toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Payment & Account balance summary */}
            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <UserCheck size={16} color="var(--accent-primary)" /> Compte débité :
                </span>
                <strong>{buyerName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Wallet size={16} color="var(--accent-gold)" /> Solde actuel disponible :
                </span>
                <span style={{ fontWeight: 700, color: hasSufficientFunds ? 'var(--text-primary)' : 'var(--accent-crimson)' }}>
                  {currentBalance.toFixed(2)} €
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nouveau solde après achat :</span>
                <strong style={{ color: hasSufficientFunds ? 'var(--accent-emerald)' : 'var(--accent-crimson)', fontSize: '1.05rem' }}>
                  {hasSufficientFunds ? `${remainingBalance.toFixed(2)} €` : 'Fonds insuffisants'}
                </strong>
              </div>
            </div>

            <form onSubmit={handlePurchase} style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                <ShieldCheck size={18} color="var(--accent-emerald)" />
                Protection Acheteur PokéVinted incluse • Débit immédiat et sécurisé de votre solde.
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleClose} className="btn btn-secondary">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !hasSufficientFunds}
                  className="btn btn-gold"
                  style={{ padding: '12px 28px', opacity: hasSufficientFunds ? 1 : 0.6, cursor: hasSufficientFunds ? 'pointer' : 'not-allowed' }}
                >
                  <ShoppingBag size={18} />
                  {loading
                    ? 'Traitement...'
                    : hasSufficientFunds
                    ? `Confirmer l'achat (${price.toFixed(2)} €)`
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
