import React, { useState } from 'react';
import { X, UserPlus, Sparkles, ShieldCheck, Wallet, AlertCircle } from 'lucide-react';

export default function RegisterModal({ isOpen, onClose, onUserRegistered }) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Dresseur');
  const [balance, setBalance] = useState('150');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setError("Veuillez renseigner un pseudo et un nom complet.");
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
          role: isAdmin ? "Administrateur" : (role.trim() || "Dresseur"),
          balance: parseFloat(balance) || 100.0,
          is_admin: isAdmin,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Échec de la création du compte.");
      }

      const newUser = await response.json();
      setUsername('');
      setName('');
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px' }}>
              <UserPlus size={22} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Créer un Compte Dresseur</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rejoignez la communauté PokéVinted</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Pseudo / Identifiant de connexion</label>
            <input
              type="text"
              placeholder="ex: Red_Pallet, Cynthia, Pierre..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nom complet affiché</label>
            <input
              type="text"
              placeholder="ex: Red du Mont Argenté"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Titre / Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-select"
                disabled={isAdmin}
              >
                <option value="Dresseur">🧢 Dresseur</option>
                <option value="Collectionneur">💎 Collectionneur</option>
                <option value="Champion d'Arène">⚡ Champion d'Arène</option>
                <option value="Maître Pokémon">🏆 Maître Pokémon</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Solde de départ (€)</label>
              <div style={{ position: 'relative' }}>
                <Wallet size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color={isAdmin ? "var(--accent-secondary)" : "var(--text-muted)"} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Droits d'administration</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accès au portail de supervision et d'audit</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
          >
            {loading ? "Création en cours..." : (
              <><Sparkles size={18} /> Créer mon profil Dresseur</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
