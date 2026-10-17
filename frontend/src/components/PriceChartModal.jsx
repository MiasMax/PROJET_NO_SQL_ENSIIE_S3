import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { X, TrendingUp, TrendingDown, BarChart2, Package, RefreshCw, Info } from 'lucide-react';

// ─── Custom tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg p-3 shadow-2xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? `${p.value.toFixed(2)} €` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Period selector ───────────────────────────────────────────────────────
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

  const fetchHistory = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/cards/${encodeURIComponent(cardId)}/price-history?days=${period}`);
      if (!res.ok) throw new Error('Erreur lors du chargement des données.');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cardId, period]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Derived stats ─────────────────────────────────────────────────────
  const stats = data
    ? (() => {
        const prices = data.data.map((d) => d.avg_price).filter(Boolean);
        if (!prices.length) return null;
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = last - first;
        const pct = first > 0 ? ((change / first) * 100).toFixed(1) : '0.0';
        return {
          latest: last,
          change,
          pct,
          high: Math.max(...prices),
          low: Math.min(...prices),
          simulated: data.data.some((d) => d.source === 'simulated'),
        };
      })()
    : null;

  const isUp = stats && stats.change >= 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={18} className="text-violet-400" />
              <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
                Historique de Prix
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{cardName || 'Carte'}</h2>
            {data && (
              <p className="text-xs text-gray-500 mt-0.5">{data.set_name}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {PERIODS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setPeriod(days)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    period === days
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              title="Actualiser"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Chargement des données…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-48 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* KPI strip */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
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
                    { label: 'Plus haut', value: `${stats.high.toFixed(2)} €`, color: 'text-emerald-400' },
                    { label: 'Plus bas', value: `${stats.low.toFixed(2)} €`, color: 'text-red-400' },
                    {
                      label: 'En vente',
                      value: data.current?.active_listings ?? 0,
                      sub: data.current?.avg_price
                        ? <span className="text-gray-500">{data.current.avg_price.toFixed(2)} € moy.</span>
                        : null,
                    },
                  ].map(({ label, value, sub, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-gray-500 text-xs mb-1">{label}</p>
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
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      tab === id
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                        : 'text-gray-500 hover:text-gray-300'
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
                    <AreaChart data={data.data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id="gradAvg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradMax" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.slice(5)} // "MM-DD"
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}€`}
                        width={45}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="max_price"
                        name="Max"
                        stroke="#10b981"
                        strokeWidth={1}
                        fill="url(#gradMax)"
                        strokeDasharray="4 2"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_price"
                        name="Moyenne"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        fill="url(#gradAvg)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#7c3aed', stroke: 'white', strokeWidth: 1.5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="min_price"
                        name="Min"
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
                    <BarChart data={data.data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.slice(5)}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="volume"
                        name="Ventes"
                        fill="#7c3aed"
                        radius={[3, 3, 0, 0]}
                        opacity={0.85}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Simulated data disclaimer */}
              {stats?.simulated && (
                <div className="flex items-start gap-2 mt-3 text-xs text-gray-600">
                  <Info size={13} className="mt-0.5 flex-shrink-0" />
                  <p>Données simulées : aucune vente enregistrée sur cette période. Les prix sont estimés à partir de la rareté de la carte.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
