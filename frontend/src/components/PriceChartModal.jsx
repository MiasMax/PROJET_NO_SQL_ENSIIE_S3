import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BarChart2, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { formatPrice } from '../utils/format';
import Modal from './ui/Modal';
import Button from './ui/Button';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neo-surface border-[1.5px] border-neo-ink rounded-[6px] p-2.5 shadow-tactile text-xs">
      <p className="font-mono text-neo-ink-3 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-mono tabular-nums">
            {typeof p.value === 'number' ? formatPrice(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

const PERIODS = [
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
  { label: '1 an', days: 365 },
];

export default function PriceChartModal({ cardId, cardName, onClose }) {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('price');
  const cacheRef = useRef({});

  const fetchHistory = useCallback(
    async (forceRefresh = false) => {
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
    },
    [cardId, period]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stats = data
    ? (() => {
        const prices = data.data.map((d) => d.avg_price).filter((p) => typeof p === 'number' && p > 0);
        if (!prices.length) return null;
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = last - first;
        const pct = first > 0 ? ((change / first) * 100).toFixed(1) : '0.0';
        const realSalesCount =
          data.real_sales_count ||
          data.data.filter((d) => d.source === 'real').reduce((acc, d) => acc + (d.volume || 1), 0);
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
    <Modal isOpen={Boolean(cardId)} onClose={onClose} size="xl">
      <Modal.Header
        title={cardName || 'Historique des prix'}
        subtitle={data ? `${data.set_name} · ${data.card_id}` : 'Évolution et cote de marché'}
        icon={<BarChart2 size={18} className="text-neo-cobalt" />}
        rightSlot={
          <div className="flex items-center gap-1.5">
            <div className="flex bg-neo-muted border border-neo-border rounded-[6px] p-0.5">
              {PERIODS.map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPeriod(days)}
                  className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                    period === days
                      ? 'bg-neo-cobalt text-white'
                      : 'text-neo-ink-3 hover:text-neo-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                delete cacheRef.current[period];
                fetchHistory(true);
              }}
              aria-label="Actualiser l'historique"
            >
              <RefreshCw size={13} />
            </Button>
          </div>
        }
      />

      <Modal.Body className="space-y-4">
        {loading && !data && (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-neo-ink-3">
            <RefreshCw className="animate-spin text-neo-cobalt" size={24} />
            <span>Chargement de l’historique…</span>
          </div>
        )}

        {error && !data && (
          <div className="h-44 flex items-center justify-center text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        {data && (
          <>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-[6px] bg-neo-muted border border-neo-border">
                  <div className="text-[11px] text-neo-ink-3">Prix actuel</div>
                  <div className="font-mono text-base font-bold text-neo-ink mt-0.5 tabular-nums">
                    {formatPrice(stats.latest)}
                  </div>
                  <div className={`text-[11px] font-mono font-semibold ${isUp ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                    {isUp ? '+' : '-'}{formatPrice(Math.abs(stats.change))} ({stats.pct}%)
                  </div>
                </div>
                <div className="p-3 rounded-[6px] bg-neo-muted border border-neo-border">
                  <div className="text-[11px] text-neo-ink-3">Cote TCG</div>
                  <div className="font-mono text-base font-bold text-neo-cobalt mt-0.5 tabular-nums">
                    {stats.referenceCote ? formatPrice(stats.referenceCote) : 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-[6px] bg-neo-muted border border-neo-border">
                  <div className="text-[11px] text-neo-ink-3">Plus haut</div>
                  <div className="font-mono text-base font-bold text-[#15803D] mt-0.5 tabular-nums">
                    {formatPrice(stats.high)}
                  </div>
                </div>
                <div className="p-3 rounded-[6px] bg-neo-muted border border-neo-border">
                  <div className="text-[11px] text-neo-ink-3">Plus bas</div>
                  <div className="font-mono text-base font-bold text-[#B91C1C] mt-0.5 tabular-nums">
                    {formatPrice(stats.low)}
                  </div>
                </div>
                <div className="p-3 rounded-[6px] bg-neo-muted border border-neo-border">
                  <div className="text-[11px] text-neo-ink-3">En vente</div>
                  <div className="font-mono text-base font-bold text-neo-ink mt-0.5 tabular-nums">
                    {data.current?.active_listings ?? 0}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5">
                {[
                  { id: 'price', label: 'Évolution du prix' },
                  { id: 'volume', label: 'Volume de ventes' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold border-[1.5px] cursor-pointer transition-colors ${
                      tab === item.id
                        ? 'bg-neo-cobalt text-white border-neo-cobalt'
                        : 'bg-neo-surface text-neo-ink-2 border-neo-border hover:border-neo-border-strong'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {stats?.hasRealSales ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] dark:text-[#4ADE80]">
                  <CheckCircle2 size={14} /> {stats.realSalesCount} vente(s) réelle(s)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-neo-cobalt dark:text-[#60A5FA]">
                  <ShieldCheck size={14} /> Cote officielle TCGdex
                </span>
              )}
            </div>

            <div className="h-64 w-full">
              {tab === 'price' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#30363D' : '#E2E8F0'} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: isDark ? '#8B949E' : '#4B5563', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#30363D' : '#C5CBD6' }}
                      tickFormatter={(v) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#8B949E' : '#4B5563', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#30363D' : '#C5CBD6' }}
                      tickFormatter={(v) => `${v}€`}
                      domain={['auto', 'auto']}
                      width={52}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {stats?.referenceCote && (
                      <ReferenceLine
                        y={stats.referenceCote}
                        stroke={isDark ? '#8B949E' : '#4B5563'}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{ value: 'Cote TCG', fill: isDark ? '#8B949E' : '#4B5563', fontSize: 10, position: 'insideTopRight' }}
                      />
                    )}
                    <Area type="monotone" dataKey="max_price" name="Max" stroke="#16A34A" strokeWidth={1.2} fill="none" strokeDasharray="4 2" dot={false} />
                    <Area type="monotone" dataKey="avg_price" name="Moyen" stroke="#2563EB" strokeWidth={2.2} fill="#2563EB" fillOpacity={0.12} dot={false} />
                    <Area type="monotone" dataKey="min_price" name="Min" stroke="#DC2626" strokeWidth={1.2} fill="none" strokeDasharray="4 2" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#30363D' : '#E2E8F0'} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: isDark ? '#8B949E' : '#4B5563', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#30363D' : '#C5CBD6' }}
                      tickFormatter={(v) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#8B949E' : '#4B5563', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: isDark ? '#30363D' : '#C5CBD6' }}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="volume" name="Ventes" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
