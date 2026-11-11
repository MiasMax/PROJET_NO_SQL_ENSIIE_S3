import React, { useState } from 'react';
import { Wallet, Plus, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import Button from '../ui/Button';

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

export default function WalletTab({ currentUser, onBalanceUpdated, showToast }) {
  const [amount, setAmount] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const balance = Number(currentUser?.balance ?? 0);
  const parsedAmount = parseFloat(amount);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10000;

  const handleRecharge = async (e) => {
    e.preventDefault();
    if (!isValidAmount) {
      setError('Veuillez saisir un montant compris entre 1 € et 10 000 €.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch('/api/users/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Impossible de recharger le portefeuille.');
      }

      const nextBalance = data.new_balance ?? data.balance ?? balance + parsedAmount;
      onBalanceUpdated?.(nextBalance);
      const msg = `${formatPrice(parsedAmount)} ajoutés à votre solde.`;
      setSuccessMsg(msg);
      showToast?.(msg, 'success');
    } catch (err) {
      setError(err.message);
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 sm:p-6 shadow-tactile space-y-5">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-neo-border">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neo-ink-3">Solde disponible</p>
            <p className="font-mono text-3xl sm:text-4xl font-bold text-neo-ink tabular-nums mt-1">
              {formatPrice(balance)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-[#DBEAFE] border-[1.5px] border-[#93C5FD] text-neo-cobalt flex items-center justify-center shrink-0">
            <Wallet size={22} aria-hidden="true" />
          </div>
        </div>

        <form onSubmit={handleRecharge} className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neo-ink-3 mb-2">
              Montant à créditer
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => {
                const active = Number(amount) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(String(preset));
                      setError(null);
                    }}
                    className={`h-9 px-3.5 rounded-[6px] border-[1.5px] font-mono text-xs font-bold cursor-pointer transition-colors ${
                      active
                        ? 'bg-neo-cobalt text-white border-[#1E3A8A]'
                        : 'bg-neo-muted border-neo-border text-neo-ink hover:border-neo-ink-3'
                    }`}
                  >
                    +{preset} €
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="wallet-recharge-amount" className="block text-xs font-bold text-neo-ink mb-1.5">
              Montant personnalisé (€)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  id="wallet-recharge-amount"
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  className="neo-input w-full pl-3.5 pr-9 py-2.5 font-mono font-bold"
                  placeholder="50.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-neo-ink-3">
                  €
                </span>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading || !isValidAmount}
              >
                <Plus size={16} aria-hidden="true" />
                <span>{loading ? 'Crédit...' : 'Créditer le solde'}</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-[6px] bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#B91C1C]">
              <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 rounded-[6px] bg-[#DCFCE7] border border-[#86EFAC] text-xs text-[#166534]">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}
        </form>
      </div>

      <div className="lg:col-span-5 bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-4">
        <div className="flex items-center gap-2 text-neo-ink">
          <ShieldCheck size={18} className="text-[#15803D]" aria-hidden="true" />
          <h2 className="text-sm font-bold">Informations du compte</h2>
        </div>

        <dl className="divide-y divide-neo-border text-xs">
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-neo-ink-3">Identifiant</dt>
            <dd className="font-mono font-semibold text-neo-ink">@{currentUser?.username || currentUser?.id}</dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-neo-ink-3">Nom affiché</dt>
            <dd className="font-semibold text-neo-ink">{currentUser?.name || '--'}</dd>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-2">
            <dt className="text-neo-ink-3">Statut</dt>
            <dd className="font-semibold text-neo-ink">
              {currentUser?.is_admin ? 'Administrateur' : currentUser?.role || 'Collectionneur'}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-neo-ink-3 leading-relaxed">
          Vos achats sont instantanément débités de ce solde et vos ventes y sont créditées dès validation de la commande.
        </p>
      </div>
    </div>
  );
}

