import React, { useState, useEffect } from 'react';
import { X, User, Wallet, PlusCircle, ShoppingBag, ShieldCheck, Calendar, Mail, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, currentUser, onBalanceUpdated, onLogout }) {
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'orders' | 'info'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchMyOrders();
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const fetchMyOrders = async () => {
    setLoadingOrders(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const headers = token ? { 'x-session-token': token } : {};
      const res = await fetch(`/api/users/me/orders?buyer_name=${encodeURIComponent(currentUser.name || currentUser.username)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch (err) {
      console.error("Failed to load user orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleRecharge = async (amountToAdd) => {
    const amount = parseFloat(amountToAdd || rechargeAmount);
    if (!amount || amount <= 0) {
      setError("Veuillez saisir un montant valide (supérieur à 0 €).");
      return;
    }

    setRecharging(true);
    setError(null);
    setMessage(null);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch('/api/users/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Échec du rechargement.");
      }

      const data = await res.json();
      setMessage(`🎉 Votre solde a été crédité de ${amount.toFixed(2)} € !`);
      setRechargeAmount('');
      onBalanceUpdated(data.new_balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecharging(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px', width: '100%', minHeight: '560px', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}>
              {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{currentUser.name}</h2>
                {currentUser.is_admin && (
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    ADMIN
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                @{currentUser.username} • {currentUser.role || 'Dresseur'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)' }}>
          <button
            onClick={() => setActiveTab('wallet')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'wallet' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'wallet' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Wallet size={16} color="var(--accent-gold)" /> Portefeuille & Solde
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'orders' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'orders' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ShoppingBag size={16} /> Mes Achats ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'info' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <User size={16} /> Informations
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {message && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          {error && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* TAB 1: Wallet & Recharge */}
            {activeTab === 'wallet' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Solde disponible sur PokéVinted
                  </span>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: '8px 0' }}>
                    {Number(currentUser.balance ?? 0).toFixed(2).replace('.', ',')} €
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Débité immédiatement lors de vos achats de cartes en vente directe.
                  </p>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: '#ffffff' }}>
                  Recharger votre solde :
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleRecharge(20)}
                    className="btn btn-secondary"
                    style={{ padding: '10px', justifyContent: 'center', fontWeight: 700 }}
                    disabled={recharging}
                  >
                    +20 €
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecharge(50)}
                    className="btn btn-secondary"
                    style={{ padding: '10px', justifyContent: 'center', fontWeight: 700 }}
                    disabled={recharging}
                  >
                    +50 €
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecharge(100)}
                    className="btn btn-secondary"
                    style={{ padding: '10px', justifyContent: 'center', fontWeight: 700 }}
                    disabled={recharging}
                  >
                    +100 €
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    placeholder="Montant personnalisé (€)"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => handleRecharge(rechargeAmount)}
                    className="btn btn-gold"
                    style={{ padding: '0 20px' }}
                    disabled={recharging || !rechargeAmount}
                  >
                    {recharging ? 'Crédit...' : 'Créditer'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Orders history */}
            {activeTab === 'orders' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {loadingOrders ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Chargement de vos commandes...
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
                    <ShoppingBag size={48} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Aucun achat pour le moment.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      Parcourez les cartes disponibles sur le marketplace et complétez votre deck !
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        style={{
                          padding: '14px 16px',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                            {order.card_name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Vendu par {order.seller_name} • Réf: {order.id.slice(0, 8)}...
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem' }}>
                            {order.price.toFixed(2).replace('.', ',')} €
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                            Confirmée
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Account info */}
            {activeTab === 'info' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nom d'utilisateur / Identifiant</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{currentUser.username}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Email</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{currentUser.email || 'Non renseigné'}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rôle sur la plateforme</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{currentUser.role || 'Dresseur'}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Statut de modération</div>
                  <div style={{ fontWeight: 600, marginTop: '2px', color: currentUser.is_admin ? '#38bdf8' : 'var(--accent-emerald)' }}>
                    {currentUser.is_admin ? '🛡️ Administrateur Certifié' : '✅ Membre Certifié'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logout button at bottom */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="btn btn-secondary"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <LogOut size={16} /> Se déconnecter
            </button>
            <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 24px' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
