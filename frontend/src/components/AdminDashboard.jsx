import React, { useState, useEffect } from 'react';
import { Database, Activity, RefreshCw, Terminal, CheckCircle2, TrendingUp, Layers, Server, Copy, Check, Store, ExternalLink } from 'lucide-react';

export default function AdminDashboard({ onBackToMarketplace }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [aggregations, setAggregations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [resStats, resOrders, resAggs] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/orders?limit=10'),
        fetch('/api/admin/aggregations')
      ]);

      if (resStats.ok) {
        setStats(await resStats.json());
      }
      if (resOrders.ok) {
        setOrders(await resOrders.json());
      }
      if (resAggs.ok) {
        const aggsData = await resAggs.json();
        setAggregations(aggsData.aggregations || null);
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
      {/* Overview header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800 }}>Tableau de Bord d'Administration</h1>
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
              {consistency_check.is_in_sync ? 'Bases synchronisées à 100%' : 'Désynchronisation détectée'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Supervision de la marketplace, suivi des transactions en direct et santé des services de données.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={onBackToMarketplace} className="btn btn-secondary">
            <Store size={16} /> Retour Marketplace
          </button>
          <button onClick={handleSeed} disabled={seedLoading} className="btn btn-secondary">
            <RefreshCw size={16} className={seedLoading ? "animate-spin" : ""} />
            {seedLoading ? 'Peuplement...' : 'Ré-amorcer Catalogue'}
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

      {/* External Observability & Stack Deep-Links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 20px',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <Activity size={16} color="var(--accent-primary)" />
          <strong style={{ color: '#ffffff' }}>Observabilité & Services Externes :</strong>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📊 Grafana Dashboards (:3001) <ExternalLink size={13} />
          </a>
          <a
            href="http://localhost:9200/pokevinted_listings/_search?pretty"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            🔍 Elasticsearch Cluster API (:9200) <ExternalLink size={13} />
          </a>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📖 Swagger API Docs (:8000) <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Financial and business KPI cards */}
      <div className="admin-kpi-grid">
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

      {/* Detailed system health and metrics */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>
        État Détaillé des 3 Systèmes de Persistance
      </h2>
      <div className="admin-datastores-grid">
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

      {/* Terminal inspection commands */}
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

      {/* Grafana integration and Elasticsearch analytics */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tableaux de Bord Grafana (Datasource Elasticsearch)</h2>
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', fontWeight: 700 }}>
                Port 3001
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Grafana interroge directement l'index Elasticsearch <code>pokevinted_listings</code> grâce au format JSON unifié.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="btn btn-secondary"
            >
              {showRawJson ? 'Masquer le JSON' : '{ } Voir JSON Elasticsearch'}
            </button>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold"
              style={{ textDecoration: 'none' }}
            >
              🚀 Ouvrir Grafana (:3001)
            </a>
          </div>
        </div>

        {/* Raw JSON viewer */}
        {showRawJson && aggregations && (
          <div style={{ marginBottom: '24px', background: '#04070d', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>FLUX JSON BRUT ELASTICSEARCH AGGREGATIONS</span>
            </div>
            <pre style={{ margin: 0, maxHeight: '250px', overflowY: 'auto', fontSize: '0.8rem', color: '#a5b4fc', fontFamily: 'monospace' }}>
              {JSON.stringify(aggregations, null, 2)}
            </pre>
          </div>
        )}

        {/* Elasticsearch aggregation charts */}
        {aggregations && (
          <div className="admin-charts-grid">
            {/* By set */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '12px' }}>
                Prix Moyen par Extension (JSON Terms Agg)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aggregations.by_set?.buckets?.map((b) => (
                  <div key={b.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{b.key} ({b.doc_count})</span>
                    <strong style={{ color: 'var(--accent-gold)' }}>
                      {b.avg_price?.value ? `${b.avg_price.value.toFixed(2)} €` : 'N/A'}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* By condition */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '12px' }}>
                Distribution par État (JSON Terms Agg)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aggregations.by_condition?.buckets?.map((b) => (
                  <div key={b.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{b.key}</span>
                    <span style={{ padding: '2px 8px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', borderRadius: '4px', fontWeight: 700 }}>
                      {b.doc_count} carte{b.doc_count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By status */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '12px' }}>
                Statut du Marché (ACTIVE vs SOLD)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aggregations.by_status?.buckets?.map((b) => (
                  <div key={b.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{b.key}</span>
                    <strong style={{ color: b.key === 'ACTIVE' ? 'var(--accent-emerald)' : '#f87171' }}>
                      {b.doc_count}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent orders audit log */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          Historique des 10 Dernières Ventes Réalisées
        </h3>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune commande passée pour le moment.</p>
        ) : (
          <div className="admin-table-container">
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
