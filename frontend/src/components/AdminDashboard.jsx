import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Database,
  Server,
  Zap,
  RefreshCw,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Code2,
  ShoppingBag,
  Search,
  BarChart3,
  Layers,
  ShieldAlert,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, formatOrderDate } from '../utils/format';
import Button from './ui/Button';
import ConditionBadge from './ui/ConditionBadge';

export default function AdminDashboard({ onBackToMarketplace }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const marketplace = useMarketplace();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [stats, setStats] = useState(null);
  const [aggregations, setAggregations] = useState(null);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [modSearch, setModSearch] = useState('');

  const handleBack = () => {
    if (onBackToMarketplace) {
      onBackToMarketplace();
    } else {
      navigate('/');
    }
  };

  const fetchAllAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const headers = token ? { 'x-session-token': token } : {};

      const [statsRes, ordersRes, aggRes, listingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/orders?limit=10', { headers }),
        fetch('/api/admin/aggregations', { headers }),
        fetch('/api/listings?limit=100&sort_by=created_at&sort_order=desc', { headers }),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (ordersRes.ok) {
        const ordData = await ordersRes.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      }
      if (aggRes.ok) {
        const aggData = await aggRes.json();
        setAggregations(aggData?.aggregations || null);
      }
      if (listingsRes.ok) {
        const listData = await listingsRes.json();
        setListings(Array.isArray(listData) ? listData : listData?.items || []);
      }
    } catch {
      showToast('Erreur lors du chargement des métriques NoSQL.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllAdminData();
  }, [fetchAllAdminData]);

  const handleSeed = async () => {
    const ok = await confirm({
      title: 'Ré-amorcer le catalogue & les annonces',
      description:
        'Cette action exécute le script de seed backend sur MongoDB, réindexe Elasticsearch et invalide le cache Redis.',
      confirmLabel: 'Lancer le ré-amorçage',
      cancelLabel: 'Annuler',
      tone: 'cobalt',
    });
    if (!ok) return;

    setSeeding(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: token ? { 'x-session-token': token } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Échec du ré-amorçage.');
      }
      showToast(data.message || 'Catalogue ré-amorcé et réindexé.', 'success');
      await Promise.all([fetchAllAdminData(), marketplace.fetchData()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteListing = async (listing) => {
    if (!listing?.id) return;
    const ok = await confirm({
      title: 'Supprimer cette annonce (Modération)',
      description:
        'Suppression définitive dans MongoDB, désindexation Elasticsearch et purge du cache Redis.',
      details: [
        { label: 'Carte', value: listing.card_name },
        { label: 'Vendeur', value: `@${listing.seller_name}` },
        { label: 'Prix', value: formatPrice(listing.price) },
      ],
      confirmLabel: 'Supprimer définitivement',
      cancelLabel: 'Conserver',
      tone: 'danger',
    });
    if (!ok) return;

    setDeletingId(listing.id);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch(`/api/admin/listings/${listing.id}`, {
        method: 'DELETE',
        headers: token ? { 'x-session-token': token } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur lors de la suppression de l'annonce.");
      }
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      marketplace.fetchData();
      showToast(`Annonce « ${listing.card_name} » supprimée.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredListings = useMemo(() => {
    const q = modSearch.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        (l.card_name || '').toLowerCase().includes(q) ||
        (l.seller_name || '').toLowerCase().includes(q) ||
        (l.set_name || '').toLowerCase().includes(q) ||
        (l.id || '').toLowerCase().includes(q)
    );
  }, [listings, modSearch]);

  if (!currentUser?.is_admin) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-8 text-center shadow-tactile space-y-4">
          <div className="w-12 h-12 rounded-[8px] bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] flex items-center justify-center mx-auto">
            <ShieldAlert size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-neo-ink">Accès administrateur requis</h1>
          <p className="text-sm text-neo-ink-2">
            Connectez-vous avec un compte administrateur pour consulter les métriques NoSQL et outils de modération.
          </p>
          <Button variant="primary" onClick={handleBack}>
            Retour au marché
          </Button>
        </div>
      </main>
    );
  }

  const { summary = {}, systems = {}, consistency_check = {}, terminal_commands = [] } = stats || {};
  const mongoStats = systems.mongodb || {};
  const esStats = systems.elasticsearch || {};
  const redisStats = systems.redis || {};
  const setBuckets = aggregations?.by_set?.buckets || [];
  const condBuckets = aggregations?.by_condition?.buckets || [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Bar */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-neo-vermilion text-white flex items-center justify-center shrink-0">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-neo-ink tracking-tight">
                Console Administration &amp; Stack NoSQL
              </h1>
              {stats && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold ${
                    consistency_check.is_in_sync
                      ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#B91C1C]'
                  }`}
                >
                  <CheckCircle2 size={12} aria-hidden="true" />
                  <span>
                    {consistency_check.is_in_sync
                      ? 'Bases synchronisées (100 %)'
                      : `Écart détecté (${consistency_check.mongo_total_listings}/${consistency_check.elastic_indexed_docs})`}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-neo-ink-3 mt-0.5">
              Observabilité temps réel MongoDB, Elasticsearch, Redis et modération du marché.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Marché</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowJson((prev) => !prev)}>
            <Code2 size={14} aria-hidden="true" />
            <span>{showJson ? 'Masquer JSON' : 'JSON Brut'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAllAdminData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            <span>Actualiser</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSeed} disabled={seeding}>
            <Database size={14} aria-hidden="true" />
            <span>{seeding ? 'Ré-amorçage...' : 'Ré-amorcer Catalogue'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Volume des ventes</p>
            <p className="font-mono text-2xl font-bold text-neo-ink tabular-nums mt-1">
              {formatPrice(summary.total_sales_volume_eur ?? 0)}
            </p>
          </div>
          <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Commandes validées</p>
            <p className="font-mono text-2xl font-bold text-[#15803D] tabular-nums mt-1">
              {summary.total_orders_completed ?? 0}
            </p>
          </div>
          <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Annonces actives</p>
            <p className="font-mono text-2xl font-bold text-neo-cobalt tabular-nums mt-1">
              {summary.active_listings_count ?? 0}
            </p>
          </div>
          <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Cartes au catalogue</p>
            <p className="font-mono text-2xl font-bold text-neo-ink tabular-nums mt-1">
              {summary.total_catalog_cards ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* Infrastructure Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Grafana Telemetry',
            desc: 'Dashboards métriques & latences Redis/API',
            href: 'http://localhost:3001',
            port: ':3001',
          },
          {
            label: 'Elasticsearch Node',
            desc: 'Index recherche & agrégations plein texte',
            href: 'http://localhost:9200',
            port: ':9200',
          },
          {
            label: 'FastAPI Swagger UI',
            desc: 'Documentation OpenAPI & endpoints REST',
            href: 'http://localhost:8000/docs',
            port: ':8000',
          },
        ].map((ext) => (
          <a
            key={ext.href}
            href={ext.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-neo-surface hover:bg-neo-muted border-[1.5px] border-neo-border hover:border-neo-cobalt rounded-[8px] p-4 flex items-center justify-between gap-3 transition-colors group"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neo-ink group-hover:text-neo-cobalt">
                  {ext.label}
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-neo-alt border border-neo-border text-neo-ink-3">
                  {ext.port}
                </span>
              </div>
              <p className="text-xs text-neo-ink-3 truncate mt-0.5">{ext.desc}</p>
            </div>
            <ExternalLink size={15} className="text-neo-ink-3 group-hover:text-neo-cobalt shrink-0" aria-hidden="true" />
          </a>
        ))}
      </div>

      {/* Engine Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MongoDB */}
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={17} className="text-[#15803D]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-neo-ink">MongoDB Primary</h2>
            </div>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] font-mono text-[10px] font-bold">
              {mongoStats.status || (stats ? 'HEALTHY' : '--')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neo-border text-xs">
            <div>
              <p className="text-neo-ink-3">Cartes catalogue</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {mongoStats.cards_count ?? '--'}
              </p>
            </div>
            <div>
              <p className="text-neo-ink-3">Annonces actives</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {mongoStats.listings_active ?? '--'}
              </p>
            </div>
            <div>
              <p className="text-neo-ink-3">Annonces vendues</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {mongoStats.listings_sold ?? '--'}
              </p>
            </div>
            <div>
              <p className="text-neo-ink-3">Commandes</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {mongoStats.orders_count ?? '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Elasticsearch */}
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={17} className="text-neo-cobalt" aria-hidden="true" />
              <h2 className="text-sm font-bold text-neo-ink">Elasticsearch Index</h2>
            </div>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#DBEAFE] border border-[#93C5FD] text-[#1E40AF] font-mono text-[10px] font-bold">
              {esStats.status || (stats ? 'HEALTHY' : '--')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neo-border text-xs">
            <div>
              <p className="text-neo-ink-3">Documents indexés</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {esStats.indexed_listings ?? '--'}
              </p>
            </div>
            <div>
              <p className="text-neo-ink-3">Index actif</p>
              <p className="font-mono text-sm font-bold text-neo-ink truncate mt-1">
                {esStats.index_name || 'pokevinted_listings'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-neo-ink-3">Synchronisation MongoDB / ES</p>
              <p className="text-xs font-semibold text-neo-ink mt-0.5">
                {consistency_check.is_in_sync
                  ? `${consistency_check.mongo_total_listings} annonces synchronisées`
                  : 'Mise à jour index en cours'}
              </p>
            </div>
          </div>
        </div>

        {/* Redis */}
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={17} className="text-neo-vermilion" aria-hidden="true" />
              <h2 className="text-sm font-bold text-neo-ink">Redis Cache &amp; Counters</h2>
            </div>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] font-mono text-[10px] font-bold">
              {redisStats.status || (stats ? 'HEALTHY' : '--')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neo-border text-xs">
            <div>
              <p className="text-neo-ink-3">Compteur actives</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {redisStats.active_listings_counter ?? '--'}
              </p>
            </div>
            <div>
              <p className="text-neo-ink-3">Compteur ventes</p>
              <p className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                {redisStats.sales_count_counter ?? '--'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-neo-ink-3">Mémoire utilisée</p>
              <p className="font-mono text-xs font-bold text-neo-ink mt-0.5">
                {redisStats.used_memory_human || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Optional JSON Inspector */}
      {showJson && (
        <div className="bg-[#0D1117] text-[#E5E7EB] border-[1.5px] border-neo-border rounded-[8px] p-4 overflow-x-auto">
          <p className="font-mono text-xs text-[#93C5FD] mb-2">Payload /api/admin/stats &amp; /aggregations</p>
          <pre className="font-mono text-xs leading-relaxed">
            {JSON.stringify({ stats, aggregations }, null, 2)}
          </pre>
        </div>
      )}

      {/* Aggregations */}
      {(setBuckets.length > 0 || condBuckets.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {setBuckets.length > 0 && (
            <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-neo-cobalt" aria-hidden="true" />
                <h2 className="text-sm font-bold text-neo-ink">Top extensions (Elasticsearch)</h2>
              </div>
              <div className="divide-y divide-neo-border text-xs max-h-64 overflow-y-auto pr-1">
                {setBuckets.map((b) => (
                  <div key={b.key} className="py-2 flex items-center justify-between gap-2">
                    <span className="font-medium text-neo-ink truncate">{b.key}</span>
                    <div className="flex items-center gap-3 shrink-0 font-mono">
                      <span className="text-neo-ink-3">{b.doc_count} offres</span>
                      {b.avg_price?.value !== undefined && (
                        <span className="font-bold text-neo-ink tabular-nums">
                          moy. {formatPrice(b.avg_price.value)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {condBuckets.length > 0 && (
            <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-neo-vermilion" aria-hidden="true" />
                <h2 className="text-sm font-bold text-neo-ink">Répartition par état</h2>
              </div>
              <div className="divide-y divide-neo-border text-xs">
                {condBuckets.map((b) => (
                  <div key={b.key} className="py-2.5 flex items-center justify-between gap-2">
                    <ConditionBadge condition={b.key} />
                    <span className="font-mono font-bold text-neo-ink tabular-nums">
                      {b.doc_count} annonces
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Moderation Table */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] shadow-tactile-sm overflow-hidden">
        <div className="p-4 border-b-[1.5px] border-neo-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-neo-ink">
              Modération des annonces ({filteredListings.length})
            </h2>
            <p className="text-xs text-neo-ink-3">
              Suppression instantanée multi-index (MongoDB + Elasticsearch + Redis).
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={modSearch}
              onChange={(e) => setModSearch(e.target.value)}
              placeholder="Filtrer carte, vendeur ou ID..."
              aria-label="Filtrer les annonces à modérer"
              className="neo-input w-full pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neo-muted border-b-[1.5px] border-neo-border text-neo-ink-3 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Carte</th>
                <th className="py-2.5 px-4">Vendeur</th>
                <th className="py-2.5 px-4">État</th>
                <th className="py-2.5 px-4 text-right">Prix</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neo-border">
              {filteredListings.slice(0, 30).map((listing) => (
                <tr key={listing.id} className="hover:bg-neo-muted/60">
                  <td className="py-2.5 px-4">
                    <p className="font-bold text-neo-ink">{listing.card_name}</p>
                    <p className="text-[11px] text-neo-ink-3 font-mono">{listing.set_name}</p>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-neo-ink-2">@{listing.seller_name}</td>
                  <td className="py-2.5 px-4">
                    <ConditionBadge condition={listing.condition} status={listing.status} />
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-neo-ink tabular-nums">
                    {formatPrice(listing.price)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Button
                      variant="danger-outline"
                      size="xs"
                      disabled={deletingId === listing.id}
                      onClick={() => handleDeleteListing(listing)}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      <span>{deletingId === listing.id ? '...' : 'Supprimer'}</span>
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredListings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neo-ink-3">
                    Aucune annonce à afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLI Audit Commands */}
      {terminal_commands.length > 0 && (
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-neo-ink" aria-hidden="true" />
            <h2 className="text-sm font-bold text-neo-ink">Commandes d&apos;inspection directe</h2>
          </div>
          <div className="space-y-2.5">
            {terminal_commands.map((cmd, idx) => (
              <div key={idx} className="p-3 rounded-[6px] bg-neo-muted border border-neo-border space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-neo-ink">{cmd.system}</span>
                  <span className="text-neo-ink-3">{cmd.description}</span>
                </div>
                <pre className="font-mono text-[11px] text-neo-ink bg-neo-surface border border-neo-border rounded-[4px] p-2 overflow-x-auto">
                  {cmd.command}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Audit */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] shadow-tactile-sm overflow-hidden">
        <div className="p-4 border-b-[1.5px] border-neo-border flex items-center gap-2">
          <ShoppingBag size={16} className="text-neo-cobalt" aria-hidden="true" />
          <h2 className="text-sm font-bold text-neo-ink">Journal des dernières transactions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neo-muted border-b-[1.5px] border-neo-border text-neo-ink-3 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Référence</th>
                <th className="py-2.5 px-4">Carte</th>
                <th className="py-2.5 px-4">Acheteur</th>
                <th className="py-2.5 px-4">Vendeur</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neo-border">
              {orders.map((ord) => (
                <tr key={ord.order_id} className="hover:bg-neo-muted/60">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-neo-ink-3">{ord.order_id}</td>
                  <td className="py-2.5 px-4 font-semibold text-neo-ink">{ord.card_name}</td>
                  <td className="py-2.5 px-4 text-neo-ink-2">@{ord.buyer_name}</td>
                  <td className="py-2.5 px-4 text-neo-ink-2">@{ord.seller_name}</td>
                  <td className="py-2.5 px-4 text-neo-ink-3">
                    {formatOrderDate(ord.created_at || ord.timestamp)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-neo-ink tabular-nums">
                    {formatPrice(ord.price)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neo-ink-3">
                    Aucune transaction enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
