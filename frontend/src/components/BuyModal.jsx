import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, ShoppingBag, AlertCircle } from 'lucide-react';

export default function BuyModal({ isOpen, onClose, listing, onPurchaseComplete }) {
  const [buyerName, setBuyerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);

  if (!isOpen || !listing) return null;

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!buyerName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_name: buyerName.trim() }),
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Acheter cette carte Pokémon</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {successOrder ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <CheckCircle size={64} color="var(--accent-emerald)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Félicitations pour votre achat !</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              La transaction a été validée et enregistrée dans <strong>MongoDB</strong>, le statut mis à jour dans <strong>Elasticsearch</strong> et les ventes comptabilisées dans <strong>Redis</strong>.
            </p>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Identifiant Commande :</span>
                <span style={{ fontFamily: 'monospace' }}>{successOrder.id.slice(0, 13)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Carte :</span>
                <strong>{successOrder.card_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Montant :</span>
                <strong style={{ color: 'var(--accent-gold)' }}>{successOrder.price.toFixed(2)} €</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Acheteur :</span>
                <span>{successOrder.buyer_name}</span>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-primary" style={{ padding: '12px 32px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', marginBottom: '24px' }}>
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

            <form onSubmit={handlePurchase}>
              <div className="form-group">
                <label className="form-label">Votre Nom / Pseudo d'Acheteur :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Ondine_Bleue"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                <ShieldCheck size={18} color="var(--accent-emerald)" />
                Protection Acheteur PokéVinted incluse & simulation de transaction sécurisée.
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="btn btn-gold" style={{ padding: '12px 28px' }}>
                  <ShoppingBag size={18} />
                  {loading ? 'Paiement...' : `Payer ${listing.price.toFixed(2)} €`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
