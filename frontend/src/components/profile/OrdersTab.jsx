import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ShoppingBag, ExternalLink } from 'lucide-react';
import { formatPrice, formatOrderDate } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import CardWearOverlay from '../CardWearOverlay';
import ConditionBadge from '../ui/ConditionBadge';
import Button from '../ui/Button';

export default function OrdersTab({ orders, loading }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.card_name || '').toLowerCase().includes(q) ||
        (o.seller_name || '').toLowerCase().includes(q) ||
        (o.order_id || '').toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const totalSpent = useMemo(
    () => orders.reduce((acc, o) => acc + Number(o.price || 0), 0),
    [orders]
  );

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-neo-surface border-[1.5px] border-neo-border rounded-[8px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-neo-ink-3">Commandes : </span>
            <span className="font-mono font-bold text-neo-ink">{orders.length}</span>
          </div>
          <div className="h-4 w-px bg-neo-border" />
          <div>
            <span className="text-neo-ink-3">Total acheté : </span>
            <span className="font-mono font-bold text-neo-ink tabular-nums">
              {formatPrice(totalSpent)}
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher carte, vendeur, réf..."
            aria-label="Rechercher dans mes commandes"
            className="neo-input w-full pl-9 pr-8 py-1.5 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neo-ink-3 hover:text-neo-ink cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] py-12 px-4 text-center space-y-3">
          <div className="w-11 h-11 rounded-[8px] bg-neo-muted border border-neo-border flex items-center justify-center mx-auto text-neo-ink-3">
            <ShoppingBag size={20} aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-neo-ink">
            {orders.length === 0 ? 'Aucune commande passée' : 'Aucune commande correspondante'}
          </p>
          <p className="text-xs text-neo-ink-3">
            {orders.length === 0
              ? 'Vos achats apparaîtront ici avec le suivi et le prix garanti.'
              : 'Essayez un autre mot-clé.'}
          </p>
          {orders.length === 0 && (
            <Button variant="primary" size="sm" onClick={() => navigate('/')}>
              Explorer le catalogue
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => (
            <div
              key={order.order_id || `${order.listing_id}-${order.created_at}`}
              className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-tactile-sm"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-12 h-16 rounded-[5px] border border-neo-border bg-neo-muted overflow-hidden shrink-0">
                  <img
                    src={order.image_url || POKEMON_CARD_BACK_FALLBACK}
                    alt={order.card_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                    }}
                  />
                  <CardWearOverlay condition={order.condition || 'NEAR_MINT'} />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-neo-ink truncate">{order.card_name}</h3>
                    <ConditionBadge condition={order.condition || 'NEAR_MINT'} />
                  </div>
                  <p className="text-xs text-neo-ink-2">
                    Vendeur : <span className="font-semibold">@{order.seller_name}</span> ·{' '}
                    {formatOrderDate(order.created_at || order.timestamp)}
                  </p>
                  <p className="font-mono text-[11px] text-neo-ink-3">Réf : {order.order_id}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neo-border">
                <span className="font-mono text-lg font-bold text-neo-ink tabular-nums">
                  {formatPrice(order.price)}
                </span>
                {order.listing_id && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      navigate(`/listing/${order.listing_id}`, {
                        state: {
                          order,
                          listing: {
                            id: order.listing_id,
                            card_id: order.card_id,
                            card_name: order.card_name,
                            set_name: order.set_name,
                            image_url: order.image_url,
                            price: order.price,
                            condition: order.condition,
                            seller_name: order.seller_name,
                            status: 'SOLD',
                          },
                        },
                      })
                    }
                  >
                    <ExternalLink size={13} aria-hidden="true" />
                    <span>Voir</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

