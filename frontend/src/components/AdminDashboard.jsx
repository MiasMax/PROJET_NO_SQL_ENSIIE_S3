import React, { useState, useEffect } from 'react';
import { Database, Activity, RefreshCw, Terminal, CheckCircle2, TrendingUp, Layers, Server, Copy, Check } from 'lucide-react';

export default function AdminDashboard({ onBackToMarketplace }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [resStats, resOrders] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/orders?limit=10')
      ]);

      if (resStats.ok) {
        setStats(await resStats.json());
      }
      if (resOrders.ok) {
        setOrders(await resOrders.json());
      }
    } catch (e) {
      console.error("Erreur de récupération des stats :", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMessage(null);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      setSeedMessage("Données et annonces ré-amorcées avec succès !");
      fetchStats();
    } catch (err) {
      setSeedMessage("Erreur lors du ré-amorçage : " + err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <RefreshCw className="animate-spin" size={36} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement des métriques NoSQL en direct...</p>
      </div>
    );
  }

  const { summary = {}, systems = {}, consistency_check = {}, terminal_commands = [] } = stats || {};

  return (
    <div className="container">
      {/* En-tête Bilan */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Bilan & Supervision NoSQL</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: consistency_check.is_in_sync ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: consistency_check.is_in_sync ? '#34d399' : '#f87171',
              border: '1px solid currentColor',
              fontSize: '0.85rem',
              fontWeight: 700
            }}>
              <CheckCircle2 size={16} />
              {consistency_check.is_in_sync ? 'Synchronisation Multi-Stores : 100%' : 'Désynchronisation détectée'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tableau de bord de monitoring et d'audit des flux de données persistés dans MongoDB, Elasticsearch et Redis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleSeed} disabled={seedLoading} className="btn btn-secondary">
            <RefreshCw size={16} className={seedLoading ? "animate-spin" : ""} />
            {seedLoading ? 'Peuplement...' : 'Ré-amorcer Seed'}
          </button>
          <button onClick={fetchStats} className="btn btn-primary">
            <Activity size={16} /> Rafraîchir
          </button>
        </div>
      </div>

      {seedMessage && (
        <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#6ee7b7' }}>
          {seedMessage}
        </div>
      )}

      {/* Cartes KPI Financières & Métier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Volume d'Affaires</span>
            <TrendingUp size={20} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-gold)' }}>
            {summary.total_sales_volume_eur?.toFixed(2) || '0.00'} €
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculé via Redis atomique & audité sur Mongo</span>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Commandes Finalisées</span>
            <CheckCircle2 size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>
            {summary.total_orders_completed || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transactions enregistrées en base</span>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Annonces Actives</span>
            <Layers size={20} color="var(--accent-secondary)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
            {summary.active_listings_count || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Disponibles immédiatement à la vente</span>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Catalogue de Référence</span>
            <Database size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
            {summary.total_catalog_cards || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cartes Pokémon TCG officielles avec images HD</span>
        </div>
      </div>

      {/* Cartes d'État des 3 Moteurs NoSQL */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>
        État Détaillé des 3 Systèmes de Persistance
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {/* MongoDB */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={22} color="#10b981" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>MongoDB</h3>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700 }}>
              {systems.mongodb?.status || 'ONLINE'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Source de vérité principale (Document Store). Stocke les schémas complets.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Annonces totales :</span>
              <strong>{systems.mongodb?.listings_total}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Annonces actives :</span>
              <strong style={{ color: 'var(--accent-secondary)' }}>{systems.mongodb?.listings_active}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Annonces vendues :</span>
              <strong style={{ color: '#f87171' }}>{systems.mongodb?.listings_sold}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Commandes / Orders :</span>
              <strong>{systems.mongodb?.orders_count}</strong>
            </div>
          </div>
        </div>

        {/* Elasticsearch */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={22} color="#06b6d4" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Elasticsearch</h3>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(6,182,212,0.15)', color: '#22d3ee', fontWeight: 700 }}>
              {systems.elasticsearch?.status || 'ONLINE'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Moteur de recherche textuelle, suggestions & recherche tolérante aux fautes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Documents indexés :</span>
              <strong>{systems.elasticsearch?.indexed_listings}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nom de l'index :</span>
              <code style={{ color: '#38bdf8' }}>{systems.elasticsearch?.index_name}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Synchronisation avec Mongo :</span>
              <strong style={{ color: consistency_check.is_in_sync ? '#34d399' : '#f87171' }}>
                {consistency_check.is_in_sync ? 'Parfaite (100%)' : 'Écart en cours'}
              </strong>
            </div>
          </div>
        </div>

        {/* Redis */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={22} color="#ef4444" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Redis</h3>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700 }}>
              {systems.redis?.status || 'ONLINE'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Cache ultra-rapide en mémoire vive, compteurs atomiques et listes récentes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Compteur annonces actives :</span>
              <strong>{systems.redis?.active_listings_counter}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Compteur total ventes :</span>
              <strong>{systems.redis?.sales_count_counter}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mémoire consommée :</span>
              <strong style={{ color: 'var(--accent-gold)' }}>{systems.redis?.used_memory_human}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION VÉRIFICATION TERMINAL PROFESSEUR */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '40px', boxShadow: 'var(--shadow-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Terminal size={26} color="var(--accent-primary)" />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Guide d'Inspection Terminal (Pour la Soutenance)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Le professeur peut exécuter directement ces commandes dans son terminal pour constater la persistance dans chacun des 3 systèmes :
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {terminal_commands.map((cmd, idx) => (
            <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                  {cmd.system} — {cmd.description}
                </span>
                <button
                  onClick={() => handleCopy(cmd.command, idx)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {copiedIndex === idx ? <><Check size={14} color="#34d399" /> Copié !</> : <><Copy size={14} /> Copier</>}
                </button>
              </div>
              <pre style={{
                margin: 0,
                padding: '10px 14px',
                background: '#04070d',
                borderRadius: '6px',
                fontFamily: 'Consolas, monospace',
                fontSize: '0.85rem',
                color: '#38bdf8',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {cmd.command}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Historique des Commandes Récentes */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          Historique des 10 Dernières Ventes Réalisées
        </h3>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune commande passée pour le moment.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID Commande</th>
                  <th>Carte</th>
                  <th>Prix</th>
                  <th>Vendeur</th>
                  <th>Acheteur</th>
                  <th>Horodatage</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{o.id.slice(0, 8)}...</td>
                    <td><strong>{o.card_name}</strong></td>
                    <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{o.price.toFixed(2)} €</td>
                    <td>{o.seller_name}</td>
                    <td style={{ color: '#38bdf8' }}>{o.buyer_name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(o.timestamp).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
