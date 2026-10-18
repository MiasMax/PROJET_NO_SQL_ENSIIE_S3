import React, { useState, useEffect } from 'react';
import { Database, Activity, RefreshCw, CheckCircle2, TrendingUp, Layers, Server, Store, ExternalLink, Trash2, Search, ShieldAlert } from 'lucide-react';

export default function AdminDashboard({ onBackToMarketplace }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [aggregations, setAggregations] = useState(null);
  const [listings, setListings] = useState([]);
  const [listingSearch, setListingSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [moderationMessage, setModerationMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('pokevinted_token');
    return token ? { 'x-session-token': token } : {};
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [resStats, resOrders, resAggs, resListings] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders() }),
        fetch('/api/orders?limit=10', { headers: authHeaders() }),
        fetch('/api/admin/aggregations'),
        fetch('/api/listings?limit=100&sort_by=created_at&sort_order=desc'),
      ]);

      if (resStats.status === 401 || resStats.status === 403) {
        setModerationMessage("Accès refusé : connectez-vous avec le compte administrateur (Prof. Chen) pour consulter la supervision.");
      }
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
      if (resListings && resListings.ok) {
        const listData = await resListings.json();
        setListings(listData.items || []);
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

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMessage(null);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      setSeedMessage("Données et annonces ré-amorcées avec succès !");
      fetchStats();
    } catch (err) {
      setSeedMessage("Erreur lors du ré-amorçage : " + err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleDeleteListing = async (listing) => {
    const confirmed = window.confirm(
      `[MODÉRATION ADMIN]\n\nConfirmer la suppression définitive de l'offre :\n"${listing.card_name}" (${listing.set_name})\nVendeur : ${listing.seller_name}\nPrix : ${listing.price.toFixed(2)} €\n\nCette action supprimera l'annonce de MongoDB, la dé-indexera d'Elasticsearch et purgera le cache Redis.`
    );
    if (!confirmed) return;

    setDeletingId(listing.id);
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        setListings((prev) => prev.filter((item) => item.id !== listing.id));
        setModerationMessage(`L'offre "${listing.card_name}" a été définitivement supprimée.`);
        setTimeout(() => setModerationMessage(null), 4000);
        fetchStats();
      } else {
        const errData = await res.json();
        alert(`Erreur : ${errData.detail || 'Impossible de supprimer cette annonce'}`);
      }
    } catch (err) {
      alert(`Erreur réseau : ${err.message}`);
    } finally {
      setDeletingId(null);
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

      {/* Moderation Section: Delete & Manage Marketplace Listings */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={24} color="#ef4444" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Modération du Marché — Suppression des Offres</h2>
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 700 }}>
                {listings.length} annonce{listings.length > 1 ? 's' : ''} au total
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Suppression administrative permanente. L'offre est retirée de MongoDB, dé-indexée d'Elasticsearch en temps réel et le cache Redis est purgé.
            </p>
          </div>

          {/* Quick Search in Moderation List */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              placeholder="Filtrer par carte, set ou vendeur..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                background: '#04070d',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Feedback alert after successful deletion */}
        {moderationMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '0.9rem',
            marginBottom: '16px',
            fontWeight: 600,
          }}>
            <CheckCircle2 size={18} />
            <span>{moderationMessage}</span>
          </div>
        )}

        {/* Moderation Listings Table */}
        {listings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>
            Aucune offre en vente pour le moment.
          </p>
        ) : (
          <div className="admin-table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Visuel</th>
                  <th>Carte & Extension</th>
                  <th>État</th>
                  <th>Prix</th>
                  <th>Vendeur</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Action Modération</th>
                </tr>
              </thead>
              <tbody>
                {listings
                  .filter((l) => {
                    if (!listingSearch) return true;
                    const q = listingSearch.toLowerCase().trim();
                    return (
                      l.card_name?.toLowerCase().includes(q) ||
                      l.set_name?.toLowerCase().includes(q) ||
                      l.seller_name?.toLowerCase().includes(q) ||
                      l.condition?.toLowerCase().includes(q)
                    );
                  })
                  .map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{
                          width: '38px',
                          height: '52px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          background: '#000000',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <img
                            src={item.image_url}
                            alt={item.card_name}
                            style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>{item.card_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.set_name}</div>
                      </td>
                      <td>
                        <span className={`condition-badge badge-${item.condition?.toLowerCase().replace('_', '-')}`} style={{ fontSize: '0.75rem' }}>
                          {item.condition}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '0.95rem' }}>
                        {item.price?.toFixed(2)} €
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {item.seller_name}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontWeight: 700,
                          background: item.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: item.status === 'ACTIVE' ? '#34d399' : '#f87171',
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteListing(item)}
                          disabled={deletingId === item.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (deletingId !== item.id) {
                              e.currentTarget.style.background = '#dc2626';
                              e.currentTarget.style.color = '#ffffff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (deletingId !== item.id) {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                              e.currentTarget.style.color = '#f87171';
                            }
                          }}
                        >
                          <Trash2 size={13} />
                          <span>{deletingId === item.id ? 'Suppression...' : 'Supprimer'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
