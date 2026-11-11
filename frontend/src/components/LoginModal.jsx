import React, { useState } from 'react';
import { LogIn, AlertCircle, Lock, User, ShieldCheck } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const DEMO_ADMIN_PASSWORD = 'PokeAdmin2026!';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, onOpenRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const performLogin = async (loginUser, loginPass) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUser.trim(),
          password: loginPass,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Identifiants invalides.');
      }
      const userData = await response.json();
      if (userData.token) {
        localStorage.setItem('pokevinted_token', userData.token);
      }
      onLoginSuccess(userData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Veuillez saisir votre pseudo ou identifiant.');
      return;
    }
    performLogin(username, password);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <Modal.Header
        title="Connexion"
        subtitle="Accédez à votre compte PokéVinted"
        icon={<LogIn size={18} className="text-neo-cobalt" />}
      />

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-username" className="block text-xs font-semibold text-neo-ink mb-1.5">
              Pseudo ou email
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
              <input
                id="login-username"
                type="text"
                placeholder="Votre identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="neo-input pl-9"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-neo-ink mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3" aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neo-input pl-9"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>

          <div className="pt-3 border-t border-neo-border space-y-2">
            <p className="text-[11px] font-medium text-neo-ink-3 text-center">
              Comptes de démonstration
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setUsername('sacha');
                  setPassword('');
                  performLogin('sacha', '');
                }}
              >
                <User size={13} aria-hidden="true" />
                <span>Sacha (Dresseur)</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setUsername('chen');
                  setPassword(DEMO_ADMIN_PASSWORD);
                  performLogin('chen', DEMO_ADMIN_PASSWORD);
                }}
              >
                <ShieldCheck size={13} className="text-neo-cobalt" aria-hidden="true" />
                <span>Admin (Prof. Chen)</span>
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-neo-ink-3 pt-1">
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegister?.();
              }}
              className="font-semibold text-neo-cobalt hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Créer un compte
            </button>
          </p>
        </Modal.Body>
      </form>
    </Modal>
  );
}
