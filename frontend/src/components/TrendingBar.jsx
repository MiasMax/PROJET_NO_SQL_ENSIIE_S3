import React, { useState, useEffect } from 'react';
import { Eye, TrendingUp } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../utils/cardFallback';

export default function TrendingBar({ onSelectCard }) {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/listings/trending/top?limit=5');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setTrending(Array.isArray(data) ? data.slice(0, 5) : []);
          }
        }
      } catch (e) {
        console.error('Erreur chargement trending :', e);
      }
    };
    fetchTrending();
    const interval = setInterval(fetchTrending, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (trending.length === 0) return null;

  return (
    <section aria-label="Cartes les plus consultées" className="mb-5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neo-ink-3 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-neo-vermilion" aria-hidden="true" />
          <span>Les plus consultées en ce moment</span>
        </h2>
        <span className="text-[11px] text-neo-ink-3 hidden sm:inline">
          Classement actualisé en direct
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {trending.map((card, idx) => (
          <button
            key={card.id || card.card_id || idx}
            type="button"
            onClick={() => onSelectCard && onSelectCard(card)}
            className="flex items-center gap-2.5 p-2.5 bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-cobalt rounded-[6px] shadow-tactile-sm hover:shadow-tactile-cobalt text-left cursor-pointer transition-all group"
          >
            <span className="font-mono text-xs font-bold text-neo-cobalt w-5 text-center shrink-0">
              #{idx + 1}
            </span>
            <img
              src={card.image_url || card.image_small || card.image_large || POKEMON_CARD_BACK_FALLBACK}
              alt={card.name || card.card_name}
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
              }}
              className="w-8 h-11 object-contain rounded-[3px] bg-neo-muted border border-neo-border shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div
                className="text-xs font-bold text-neo-ink group-hover:text-neo-cobalt truncate transition-colors"
                title={card.name || card.card_name}
              >
                {card.name || card.card_name}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-neo-ink tabular-nums">
                  {typeof card.price === 'number' ? formatPrice(card.price) : '--'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-neo-ink-3 tabular-nums">
                  <Eye size={11} aria-hidden="true" />
                  <span>{card.views}</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
