import React, { useState, useEffect } from 'react';
import { User, Wallet, ShoppingBag, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { formatPrice } from '../utils/format';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function UserProfileModal({ isOpen, onClose, currentUser, onBalanceUpdated, onLogout }) {
  const [activeTab, setActiveTab] = useState('wallet');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    let active = true;
    const load = async () => {
      setLoadingOrders(true);
      try {
        const token = localStorage.getItem('pokevinted_token');
        const headers = token ? { 'x-session-token': token } : {};
        const res = await fetch(
          `/api/users/me/orders?buyer_name=${encodeURIComponent(currentUser.name || currentUser.username)}`,
          { headers }
        );
        if (res.ok && active) {
          setOrders((await res.json()) || []);
        }
      } catch (err) {
        console.error('Failed to load user orders:', err);
      } finally {
        if (active) setLoadingOrders(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleRecharge = async (amountToAdd) => {
    const amount = parseFloat(amountToAdd || rechargeAmount);
    if (!amount || amount <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0 €.');
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
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Échec du rechargement.');
      }
      const data = await res.json();
      setMessage(`Solde crédité de ${formatPrice(amount)}.`);
      setRechargeAmount('');
      onBalanceUpdated(data.new_balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecharging(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Modal.Header
        title={currentUser.name}
        subtitle={`@${currentUser.username} · ${currentUser.role || 'Dresseur'}`}
        icon={
          <span className="font-bold text-sm text-neo-ink">
            {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
          </span>
        }
      />

      <div className="flex border-b-[1.5px] border-neo-border bg-neo-muted px-4 gap-1">
        {[
          { id: 'wallet', label: 'Portefeuille', icon: <Wallet size={14} /> },
          { id: 'orders', label: `Achats (${orders.length})`, icon: <ShoppingBag size={14} /> },
          { id: 'info', label: 'Profil', icon: <User size={14} /> },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                active
                  ? 'border-neo-cobalt text-neo-cobalt bg-neo-surface'
                  : 'border-transparent text-neo-ink-3 hover:text-neo-ink'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Modal.Body className="space-y-4 min-h-[300px]">
        {message && (
          <div className="p-3 rounded-[6px] bg-[#DCFCE7] border-[1.5px] border-[#86EFAC] text-[#166534] text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <div className="p-4 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border text-center">
              <span className="text-xs font-medium text-neo-ink-3">Solde disponible</span>
              <div className="font-mono text-3xl font-bold text-neo-ink mt-1 tabular-nums">
                {formatPrice(currentUser.balance ?? 0)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[20, 50, 100].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  disabled={recharging}
                  onClick={() => handleRecharge(amt)}
                  className="font-mono"
                >
                  +{amt} €
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="5"
                placeholder="Montant personnalisé (€)"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="neo-input flex-1 font-mono"
              />
              <Button
                variant="secondary"
                size="md"
                disabled={recharging || !rechargeAmount}
                onClick={() => handleRecharge(rechargeAmount)}
              >
                {recharging ? 'Crédit…' : 'Créditer'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          loadingOrders ? (
            <p className="text-xs text-neo-ink-3 py-12 text-center">Chargement…</p>
          ) : orders.length === 0 ? (
            <p className="text-xs text-neo-ink-3 py-12 text-center">Aucun achat enregistré.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-3 rounded-[6px] bg-neo-muted border border-neo-border flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-neo-ink truncate">{order.card_name}</div>
                    <div className="text-xs text-neo-ink-3">Vendeur : {order.seller_name}</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-neo-ink shrink-0 tabular-nums">
                    {formatPrice(order.price)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'info' && (
          <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-neo-ink-3">Identifiant</dt>
              <dd className="font-semibold text-neo-ink">{currentUser.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neo-ink-3">Email</dt>
              <dd className="font-semibold text-neo-ink">{currentUser.email || 'Non renseigné'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neo-ink-3">Statut</dt>
              <dd className="font-semibold text-neo-ink">
                {currentUser.is_admin ? 'Administrateur' : 'Membre vérifié'}
              </dd>
            </div>
          </dl>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-between">
        <Button
          variant="danger-outline"
          size="sm"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <LogOut size={14} aria-hidden="true" />
          <span>Déconnexion</span>
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
