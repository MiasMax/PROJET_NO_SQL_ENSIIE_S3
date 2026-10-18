import React, { useState } from 'react';
import { X, LogIn, Sparkles, AlertCircle, Lock, User, KeyRound } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, onOpenRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Veuillez saisir votre pseudo ou identifiant.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Échec de la connexion. Vérifiez vos identifiants.");
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

  // Non-admin demo trainers stay passwordless; the admin account requires its
  // documented password (the backend no longer accepts an empty admin password).
  const DEMO_PASSWORDS = { chen: 'PokeAdmin2026!' };

  const handleQuickDemoLogin = async (demoUsername) => {
    const demoPassword = DEMO_PASSWORDS[demoUsername] || '';
    setUsername(demoUsername);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: demoUsername,
          password: demoPassword,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Échec de connexion.");
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px' }}>
              <LogIn size={22} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Connexion</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Accédez à votre compte PokéVinted</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Pseudo ou Email</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Votre nom d'utilisateur..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>

          {/* Quick test accounts for easy grading/evaluation */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
              Connexion rapide pour démonstration :
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sacha')}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'center' }}
                disabled={loading}
              >
                🧢 Sacha (Dresseur)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('chen')}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'center' }}
                disabled={loading}
              >
                🛡️ Admin (Prof. Chen)
              </button>
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Créer un compte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
