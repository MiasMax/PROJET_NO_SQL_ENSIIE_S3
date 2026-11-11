import React, { useState } from 'react';
import { UserPlus, ShieldCheck, Wallet, AlertCircle, Lock, Mail, User } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function RegisterModal({ isOpen, onClose, onUserRegistered, onOpenLogin }) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Dresseur');
  const [balance, setBalance] = useState('150');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setError('Veuillez renseigner un pseudo et un nom affiché.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
          role: isAdmin ? 'Administrateur' : role.trim() || 'Dresseur',
          balance: parseFloat(balance) || 100.0,
          is_admin: isAdmin,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Échec de la création du compte.');
      }

      const newUser = await response.json();
      if (newUser.token) {
        localStorage.setItem('pokevinted_token', newUser.token);
      }
      setUsername('');
      setName('');
      setEmail('');
      setPassword('');
      setRole('Dresseur');
      setBalance('150');
      setIsAdmin(false);
      onUserRegistered(newUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Modal.Header
        title="Créer un compte"
        subtitle="Achetez et vendez vos cartes sur PokéVinted"
        icon={<UserPlus size={18} className="text-neo-vermilion" />}
      />

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="reg-username" className="block text-xs font-semibold text-neo-ink mb-1.5">
                Identifiant
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
                <input
                  id="reg-username"
                  type="text"
                  placeholder="ex: Red_Pallet"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="neo-input pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-neo-ink mb-1.5">
                Nom affiché
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="ex: Red"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="neo-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-neo-ink mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="vous@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neo-input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-neo-ink mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
                <input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="reg-role" className="block text-xs font-semibold text-neo-ink mb-1.5">
                Statut collectionneur
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isAdmin}
                className="neo-input"
              >
                <option value="Dresseur">Dresseur</option>
                <option value="Collectionneur">Collectionneur</option>
                <option value="Champion d'Arène">Champion d&apos;Arène</option>
                <option value="Maître Pokémon">Maître Pokémon</option>
              </select>
            </div>

            <div>
              <label htmlFor="reg-balance" className="block text-xs font-semibold text-neo-ink mb-1.5">
                Solde initial (€)
              </label>
              <div className="relative">
                <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
                <input
                  id="reg-balance"
                  type="number"
                  min="0"
                  step="10"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="neo-input pl-9 font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 p-3.5 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border cursor-pointer">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-neo-ink">
                <ShieldCheck size={15} className="text-neo-cobalt" aria-hidden="true" />
                <span>Accès administrateur</span>
              </div>
              <p className="text-[11px] text-neo-ink-3 mt-0.5">
                Active les outils de modération et de supervision NoSQL.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-4 h-4 accent-neo-cobalt cursor-pointer"
            />
          </label>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Création en cours…' : 'Créer mon compte'}
          </Button>

          {onOpenLogin && (
            <p className="text-center text-xs text-neo-ink-3">
              Déjà inscrit ?{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="font-semibold text-neo-cobalt hover:underline bg-transparent border-0 p-0 cursor-pointer"
              >
                Se connecter
              </button>
            </p>
          )}
        </Modal.Body>
      </form>
    </Modal>
  );
}
