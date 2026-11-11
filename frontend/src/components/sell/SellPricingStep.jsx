import React from 'react';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { CONDITION_OPTIONS, formatPrice } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import CardWearOverlay from '../CardWearOverlay';
import ConditionBadge from '../ui/ConditionBadge';
import Button from '../ui/Button';

const QUICK_TAGS = [
  'Double sleeve + Toploader',
  'Envoi blindé sous bulles',
  'Sortie de booster',
  'Centrage parfait',
  'Envoi suivi 24h',
];

export default function SellPricingStep({
  selectedCard,
  condition,
  onConditionChange,
  price,
  setPrice,
  description,
  setDescription,
  sellerName,
  loading,
  onBack,
  onSubmit,
}) {
  const currentConditionObj = CONDITION_OPTIONS.find((c) => c.value === condition) || CONDITION_OPTIONS[1];
  const baseMarketPrice = selectedCard?.market_price || 20;
  const conditionAdjustedPrice = Math.max(0.5, Math.round(baseMarketPrice * currentConditionObj.multiplier * 2) / 2);

  const applyPricePreset = (multiplier) => {
    const computed = Math.max(0.5, Math.round(conditionAdjustedPrice * multiplier * 2) / 2);
    setPrice(computed.toFixed(2));
  };

  const appendQuickTag = (tagText) => {
    setDescription((prev) => {
      if (!prev) return tagText;
      if (prev.includes(tagText)) return prev;
      return `${prev.trim()} · ${tagText}`;
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Selected card header bar */}
        <div className="p-3 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={selectedCard.image_small || selectedCard.image_large || POKEMON_CARD_BACK_FALLBACK}
              alt={selectedCard.name}
              className="w-9 h-12 object-contain rounded-[4px] bg-neo-surface border border-neo-border shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-neo-ink truncate">
                {selectedCard.name}{' '}
                <span className="font-mono text-xs text-neo-ink-3">{selectedCard.number}</span>
              </div>
              <div className="text-xs text-neo-ink-3 truncate">
                {selectedCard.set_name} · Cote {currentConditionObj.label} :{' '}
                <strong className="font-mono text-neo-ink">{formatPrice(conditionAdjustedPrice)}</strong>
              </div>
            </div>
          </div>

          <Button variant="outline" size="xs" onClick={onBack}>
            <RefreshCw size={12} aria-hidden="true" />
            <span>Changer de carte</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-5">
          {/* Left Form */}
          <div className="space-y-5">
            {/* 1. Condition */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-neo-ink-3 mb-2">
                1. État réel de la carte
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONDITION_OPTIONS.map((c) => {
                  const isChosen = condition === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => onConditionChange(c.value)}
                      className={`p-2.5 rounded-[6px] border-[1.5px] text-left cursor-pointer transition-colors ${
                        isChosen
                          ? 'bg-[#EFF6FF] border-neo-cobalt'
                          : 'bg-neo-surface border-neo-border hover:border-neo-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neo-ink">{c.label}</span>
                        <span className="font-mono text-[10px] font-semibold text-neo-ink-3 bg-neo-muted px-1.5 py-0.5 rounded-[4px] border border-neo-border">
                          {c.pctLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-neo-ink-3 mt-1 line-clamp-1">{c.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Price */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="sell-price-input" className="text-xs font-bold uppercase tracking-wider text-neo-ink-3">
                  2. Prix de vente (€)
                </label>
                <span className="text-[11px] font-semibold text-[#15803D]">0 % frais vendeur</span>
              </div>

              <div className="relative">
                <input
                  id="sell-price-input"
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="neo-input pr-10 font-mono font-bold text-lg tabular-nums"
                  placeholder="45.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neo-ink-3 font-bold text-sm pointer-events-none">
                  €
                </span>
              </div>

              {selectedCard?.market_price && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-neo-ink-3">Repères :</span>
                  <Button variant="subtle" size="xs" onClick={() => applyPricePreset(0.9)}>
                    -10 % ({(conditionAdjustedPrice * 0.9).toFixed(1)} €)
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => applyPricePreset(1.0)} className="border-neo-cobalt text-neo-cobalt">
                    Cote ({conditionAdjustedPrice.toFixed(1)} €)
                  </Button>
                  <Button variant="subtle" size="xs" onClick={() => applyPricePreset(1.15)}>
                    +15 % ({(conditionAdjustedPrice * 1.15).toFixed(1)} €)
                  </Button>
                </div>
              )}
            </div>

            {/* 3. Description */}
            <div>
              <label htmlFor="sell-description" className="block text-xs font-bold uppercase tracking-wider text-neo-ink-3 mb-1.5">
                3. Précisions (optionnel)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => appendQuickTag(tag)}
                    className="text-[11px] px-2 py-0.5 rounded-[4px] bg-neo-muted hover:bg-neo-alt border border-neo-border text-neo-ink-2 cursor-pointer transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <textarea
                id="sell-description"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="neo-input text-xs resize-none"
                placeholder="Protection toploader, centrage, état du verso…"
              />
            </div>
          </div>

          {/* Right Live Buyer Preview */}
          <div className="p-4 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border flex flex-col items-center justify-between text-center">
            <div className="w-full flex items-center justify-between text-[11px] font-semibold text-neo-ink-3 mb-3">
              <span>Aperçu acheteur</span>
              <ConditionBadge condition={condition} />
            </div>

            <div className="w-44 relative rounded-[6px] overflow-hidden bg-neo-surface border border-neo-border p-1.5">
              <img
                src={selectedCard.image_large || selectedCard.image_small || POKEMON_CARD_BACK_FALLBACK}
                alt={selectedCard.name}
                className="w-full h-auto rounded-[4px]"
                style={{
                  filter:
                    condition === 'PLAYED'
                      ? 'saturate(0.90) contrast(0.96)'
                      : condition === 'GOOD'
                      ? 'saturate(0.95)'
                      : 'none',
                }}
              />
              <CardWearOverlay condition={condition} />
            </div>

            <div className="w-full mt-3 pt-3 border-t border-neo-border space-y-1">
              <div className="text-sm font-bold text-neo-ink truncate">{selectedCard.name}</div>
              <div className="text-xs text-neo-ink-3 truncate">
                {selectedCard.set_name} · {selectedCard.number}
              </div>
              <div className="font-mono text-2xl font-bold text-neo-ink pt-1 tabular-nums">
                {price && !Number.isNaN(parseFloat(price)) ? formatPrice(price) : '-- €'}
              </div>
              <div className="text-[11px] text-neo-ink-3">
                Vendeur : <strong className="text-neo-ink">{sellerName || 'Vous'}</strong>
              </div>
              <div className="pt-2 text-[11px] text-neo-ink-3 flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-neo-cobalt" aria-hidden="true" />
                <span>Paiement protégé</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t-[1.5px] border-neo-border bg-neo-muted flex items-center justify-between gap-3 shrink-0">
        <Button variant="outline" size="sm" onClick={onBack} disabled={loading}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Retour au catalogue</span>
        </Button>

        <Button type="submit" variant="primary" size="md" disabled={loading}>
          {loading
            ? 'Publication…'
            : `Publier · ${price && !Number.isNaN(parseFloat(price)) ? formatPrice(price) : '-- €'}`}
        </Button>
      </div>
    </form>
  );
}

