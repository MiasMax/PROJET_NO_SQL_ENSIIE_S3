import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  X, TrendingUp, TrendingDown, BarChart2,
  RefreshCw, Info, CheckCircle2, ShieldCheck, Sparkles,
} from 'lucide-react';

// ─── Custom tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0b0f19] border border-white/10 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md">
      <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold flex items-center justify-between gap-4">
          <span>{p.name}:</span>
          <span>{typeof p.value === 'number' ? `${p.value.toFixed(2)} €` : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Period selector options ───────────────────────────────────────────────
const PERIODS = [
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
  { label: '1an', days: 365 },
];

export default function PriceChartModal({ cardId, cardName, onClose }) {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('price'); // 'price' | 'volume'

  // Client-side cache to enable instant (0ms) period switching
  const cacheRef = useRef({});

  const fetchHistory = useCallback(async (forceRefresh = false) => {
    if (!cardId) return;

    if (!forceRefresh && cacheRef.current[period]) {
      setData(cacheRef.current[period]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/cards/${encodeURIComponent(cardId)}/price-history?days=${period}`);
      if (!res.ok) throw new Error('Impossible de charger les données historiques.');
      const json = await res.json();
      cacheRef.current[period] = json;
      setData(json);
    } catch (e) {
      setError(e.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }, [cardId, period]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Derived stats ─────────────────────────────────────────────────────
  const stats = data
    ? (() => {
        const prices = data.data.map((d) => d.avg_price).filter((p) => typeof p === 'number' && p > 0);
        if (!prices.length) return null;
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = last - first;
        const pct = first > 0 ? ((change / first) * 100).toFixed(1) : '0.0';
        const realSalesCount = data.real_sales_count || data.data.filter((d) => d.source === 'real').reduce((acc, d) => acc + (d.volume || 1), 0);
        return {
          latest: last,
          change,
          pct,
          high: Math.max(...prices),
          low: Math.min(...prices),
          hasRealSales: Boolean(data.has_real_sales || realSalesCount > 0),
          realSalesCount,
          referenceCote: data.market_price || data.current?.reference_market_price,
        };
      })()
    : null;

  const isUp = stats && stats.change >= 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0d111c 0%, #161b2e 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={18} className="text-violet-400" />
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
                Historique de Prix & Cote
              </span>
              {stats?.hasRealSales ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={11} /> {stats.realSalesCount} vente(s) certifiée(s)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <ShieldCheck size={11} /> Cote officielle TCG
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {cardName || 'Carte Pokémon'}
              {stats?.referenceCote && (
                <span className="text-xs font-semibold px-2 py-0.5 bg-white/5 rounded-md text-slate-300 border border-white/10">
                  Cote TCG : {stats.referenceCote.toFixed(2)} €
                </span>
              )}
            </h2>
            {data && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                <span>{data.set_name}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-gray-500">{data.card_id}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {PERIODS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setPeriod(days)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    period === days
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                delete cacheRef.current[period];
                fetchHistory(true);
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Actualiser les données"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Chargement des données historiques…</p>
            </div>
          )}

          {error && !data && (
            <div className="flex items-center justify-center h-48 text-red-400 text-sm">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* KPI strip */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                  {[
                    {
                      label: 'Prix actuel',
                      value: `${stats.latest.toFixed(2)} €`,
                      sub: (
                        <span className={isUp ? 'text-emerald-400' : 'text-red-400'}>
                          {isUp ? '▲' : '▼'} {Math.abs(stats.change).toFixed(2)} € ({stats.pct}%)
                        </span>
                      ),
                    },
                    {
                      label: 'Cote TCGdex',
                      value: stats.referenceCote ? `${stats.referenceCote.toFixed(2)} €` : 'N/A',
                      color: 'text-indigo-400',
                      sub: <span className="text-gray-500">Benchmark officiel</span>,
                    },
                    { label: 'Plus haut', value: `${stats.high.toFixed(2)} €`, color: 'text-emerald-400' },
                    { label: 'Plus bas', value: `${stats.low.toFixed(2)} €`, color: 'text-red-400' },
                    {
                      label: 'En vente',
                      value: data.current?.active_listings ?? 0,
                      sub: data.current?.avg_price
                        ? <span className="text-gray-400">{data.current.avg_price.toFixed(2)} € moy.</span>
                        : <span className="text-gray-600">Aucune offre</span>,
                    },
                  ].map(({ label, value, sub, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-gray-400 text-xs mb-1">{label}</p>
                      <p className={`text-lg font-bold ${color || 'text-white'}`}>{value}</p>
                      {sub && <div className="text-xs mt-0.5">{sub}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab bar */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'price', label: 'Évolution du prix' },
                  { id: 'volume', label: 'Volume de ventes' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      tab === id
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Charts */}
              <div style={{ height: 260 }}>
                {tab === 'price' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id="gradAvg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradMax" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.slice(5)} // "MM-DD"
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}€`}
                        domain={['auto', 'auto']}
                        width={50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      />
                      {stats?.referenceCote && (
                        <ReferenceLine
                          y={stats.referenceCote}
                          stroke="#6366f1"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: 'Cote TCG',
                            fill: '#a5b4fc',
                            fontSize: 10,
                            position: 'insideTopRight',
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="max_price"
                        name="Prix Max"
                        stroke="#10b981"
                        strokeWidth={1}
                        fill="url(#gradMax)"
                        strokeDasharray="4 2"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_price"
                        name="Prix Moyen"
                        stroke="#8b5cf6"
                        strokeWidth={2.2}
                        fill="url(#gradAvg)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#8b5cf6', stroke: 'white', strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="min_price"
                        name="Prix Min"
                        stroke="#ef4444"
                        strokeWidth={1}
                        fill="none"
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {tab === 'volume' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.slice(5)}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="volume"
                        name="Ventes plateforme"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        opacity={0.9}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Informative transparency badge */}
              <div className="flex items-start gap-2.5 mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
                {stats?.hasRealSales ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-300">
                        Historique consolidé avec {stats.realSalesCount} vente(s) réelle(s) enregistrée(s)
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Les points reflètent les transactions certifiées sur PokéVinted combinées à l&apos;index de valorisation officiel TCGdex.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-300">
                        Cote certifiée TCGdex ({stats?.referenceCote ? `${stats.referenceCote.toFixed(2)} €` : 'référence marché'})
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Aucune vente PokéVinted sur cette période. L&apos;historique retrace la trajectoire de valeur de la carte basée sur sa cote officielle Pokémon TCG.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
