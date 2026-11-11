import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, PlusCircle, Edit3, Trash2, Tag, Eye } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import CardWearOverlay from '../CardWearOverlay';
import ConditionBadge from '../ui/ConditionBadge';
import Button from '../ui/Button';

export default function ListingsTab({
  listings,
  loading,
  deletingId,
  onOpenSell,
  onEditPrice,
  onDeleteListing,
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const stats = useMemo(() => {
    const active = listings.filter((l) => l.status !== 'SOLD');
    const sold = listings.filter((l) => l.status === 'SOLD');
    return {
      totalCount: listings.length,
      activeCount: active.length,
      soldCount: sold.length,
      activeValue: active.reduce((acc, l) => acc + Number(l.price || 0), 0),
      soldRevenue: sold.reduce((acc, l) => acc + Number(l.price || 0), 0),
    };
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter((l) => {
      if (statusFilter === 'ACTIVE' && l.status === 'SOLD') return false;
      if (statusFilter === 'SOLD' && l.status !== 'SOLD') return false;
      if (q) {
        return (
          (l.card_name || '').toLowerCase().includes(q) ||
          (l.set_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [listings, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-neo-surface border-[1.5px] border-neo-border rounded-[8px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">En vente</p>
          <p className="font-mono text-xl font-bold text-neo-ink mt-1">{stats.activeCount}</p>
        </div>
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Valeur active</p>
          <p className="font-mono text-xl font-bold text-neo-cobalt mt-1 tabular-nums">
            {formatPrice(stats.activeValue)}
          </p>
        </div>
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Cartes vendues</p>
          <p className="font-mono text-xl font-bold text-[#15803D] mt-1">{stats.soldCount}</p>
        </div>
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">Revenus encaissés</p>
          <p className="font-mono text-xl font-bold text-neo-ink mt-1 tabular-nums">
            {formatPrice(stats.soldRevenue)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-neo-muted border border-neo-border rounded-[6px] p-0.5 w-fit">
          {[
            { id: 'ALL', label: `Toutes (${stats.totalCount})` },
            { id: 'ACTIVE', label: `En vente (${stats.activeCount})` },
            { id: 'SOLD', label: `Vendues (${stats.soldCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === tab.id
                  ? 'bg-neo-surface text-neo-ink border border-neo-border shadow-tactile-sm'
                  : 'text-neo-ink-3 hover:text-neo-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer mes annonces..."
              aria-label="Filtrer mes annonces"
              className="neo-input w-full pl-9 pr-8 py-1.5 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer le filtre"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neo-ink-3 hover:text-neo-ink cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <Button variant="primary" size="sm" onClick={() => onOpenSell?.()}>
            <PlusCircle size={15} aria-hidden="true" />
            <span>Vendre</span>
          </Button>
        </div>
      </div>

      {/* Listings list */}
      {filteredListings.length === 0 ? (
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] py-12 px-4 text-center space-y-3">
          <div className="w-11 h-11 rounded-[8px] bg-neo-muted border border-neo-border flex items-center justify-center mx-auto text-neo-ink-3">
            <Tag size={20} aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-neo-ink">
            {listings.length === 0 ? 'Aucune annonce publiée' : 'Aucune annonce correspondante'}
          </p>
          <p className="text-xs text-neo-ink-3">
            {listings.length === 0
              ? 'Mettez en vente une première carte depuis le catalogue officiel.'
              : 'Modifiez vos critères de filtre pour afficher vos annonces.'}
          </p>
          {listings.length === 0 && (
            <Button variant="primary" size="sm" onClick={() => onOpenSell?.()}>
              <PlusCircle size={15} aria-hidden="true" />
              <span>Publier une carte</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredListings.map((listing) => {
            const isSold = listing.status === 'SOLD';
            const isDeleting = deletingId === listing.id;
            return (
              <div
                key={listing.id}
                className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-tactile-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/listing/${listing.id}`, { state: { listing } })}
                    className="relative w-12 h-16 rounded-[5px] border border-neo-border bg-neo-muted overflow-hidden shrink-0 cursor-pointer"
                    aria-label={`Voir ${listing.card_name}`}
                  >
                    <img
                      src={listing.image_url || POKEMON_CARD_BACK_FALLBACK}
                      alt={listing.card_name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
                      }}
                    />
                    <CardWearOverlay condition={listing.condition || 'NEAR_MINT'} />
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/listing/${listing.id}`, { state: { listing } })}
                        className="text-sm font-bold text-neo-ink hover:text-neo-cobalt truncate cursor-pointer text-left"
                      >
                        {listing.card_name}
                      </button>
                      <ConditionBadge condition={listing.condition} status={listing.status} />
                    </div>
                    <p className="text-xs text-neo-ink-3 truncate">{listing.set_name}</p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-neo-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <Eye size={11} aria-hidden="true" />
                        <span>{listing.views_count || 0} vues</span>
                      </span>
                      {isSold && listing.buyer_name && (
                        <span className="text-[#15803D] font-sans font-semibold">
                          Vendue à @{listing.buyer_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neo-border">
                  <span className="font-mono text-lg font-bold text-neo-ink tabular-nums mr-1">
                    {formatPrice(listing.price)}
                  </span>

                  {!isSold && (
                    <>
                      <Button variant="outline" size="xs" onClick={() => onEditPrice(listing)}>
                        <Edit3 size={13} aria-hidden="true" />
                        <span>Prix</span>
                      </Button>
                      <Button
                        variant="danger-outline"
                        size="xs"
                        disabled={isDeleting}
                        onClick={() => onDeleteListing(listing)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span>{isDeleting ? '...' : 'Retirer'}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

