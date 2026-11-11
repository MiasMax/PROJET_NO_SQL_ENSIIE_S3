import React from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  MessageCircle,
  TrendingUp,
  ShieldCheck,
  Edit3,
  Trash2,
  PlusCircle,
  Check,
  Eye,
  User,
  Award,
} from 'lucide-react';
import {
  formatPrice,
  formatOrderDate,
  getConditionMeta,
  isSameSeller,
} from '../../utils/format';
import Button from '../ui/Button';
import ConditionBadge from '../ui/ConditionBadge';

function GradeBar({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-neo-ink-2 font-medium">{label}</span>
        <span className="font-mono font-bold text-neo-ink tabular-nums">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-neo-muted border border-neo-border overflow-hidden">
        <div
          className="h-full bg-neo-cobalt rounded-full transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function CardSpecsPanel({
  item,
  cardDetails,
  orderData,
  simulatedCondition,
  otherOffers,
  currentUser,
  isFav,
  isInCart,
  onToggleFavorite,
  onInitiateBuy,
  onToggleCart,
  onOpenChat,
  onOpenPriceChart,
  onOpenSell,
  onOpenEditPrice,
  onAdminDelete,
  onSelectOffer,
}) {
  const isOrderView = Boolean(orderData);
  const isSold = item.status === 'SOLD' || isOrderView;
  const isOutOfStock = item.status === 'OUT_OF_STOCK' || Boolean(item.isCatalogReference) || !item.id;
  const isOwnListing = isSameSeller(currentUser, item.seller_name);
  const conditionMeta = getConditionMeta(simulatedCondition || item.condition);
  const refPrice = cardDetails?.market_price ?? cardDetails?.reference_market_price ?? null;
  const activePrice = item.price !== undefined && item.price !== null ? Number(item.price) : null;
  const priceDiffPct =
    refPrice && activePrice && Number(refPrice) > 0
      ? Math.round(((activePrice - Number(refPrice)) / Number(refPrice)) * 100)
      : null;

  return (
    <div className="space-y-5">
      {/* Main Header & Price Card */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 sm:p-6 shadow-tactile space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-[4px] bg-neo-muted border border-neo-border text-xs font-semibold text-neo-ink-2">
                {item.set_name || cardDetails?.set_name || 'Extension Pokémon'}
              </span>
              {(item.rarity || cardDetails?.rarity) && (
                <span className="px-2 py-0.5 rounded-[4px] bg-[#FEF3C7] dark:bg-[#422006] border border-[#FCD34D] dark:border-[#B45309] text-[#92400E] dark:text-[#FDE68A] text-xs font-semibold">
                  {item.rarity || cardDetails?.rarity}
                </span>
              )}
              {(item.number || cardDetails?.number) && (
                <span className="font-mono text-xs text-neo-ink-3">
                  #{item.number || cardDetails?.number}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-neo-ink tracking-tight leading-tight">
              {item.card_name || cardDetails?.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={isFav}
            className={`w-10 h-10 rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              isFav
                ? 'bg-[#FEE2E2] dark:bg-[#450A0A] border-[#FCA5A5] dark:border-[#991B1B] text-neo-vermilion'
                : 'bg-neo-surface border-neo-border text-neo-ink-3 hover:border-neo-ink hover:text-neo-ink'
            }`}
          >
            <Heart size={18} className={isFav ? 'fill-neo-vermilion' : ''} aria-hidden="true" />
          </button>
        </div>

        {/* Metadata strip */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-neo-ink-2 pt-1 border-t border-neo-border">
          <ConditionBadge
            condition={item.condition || 'NEAR_MINT'}
            status={isSold ? 'SOLD' : item.status}
            showGrade
          />
          {!isOutOfStock && item.seller_name && (
            <span className="inline-flex items-center gap-1.5 font-medium text-neo-ink">
              <User size={13} className="text-neo-ink-3" aria-hidden="true" />
              <span>Vendeur : @{item.seller_name}</span>
            </span>
          )}
          {typeof item.views_count === 'number' && (
            <span className="inline-flex items-center gap-1 text-neo-ink-3 font-mono">
              <Eye size={13} aria-hidden="true" />
              <span>{item.views_count} vues</span>
            </span>
          )}
        </div>

        {/* Price block */}
        <div className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neo-ink-3">
              {isOrderView ? 'Prix payé' : isOutOfStock ? 'Cote de référence' : 'Prix de cette offre'}
            </p>
            <p className="font-mono text-3xl font-bold text-neo-ink tabular-nums mt-0.5">
              {isOutOfStock
                ? refPrice
                  ? formatPrice(refPrice)
                  : '-- €'
                : formatPrice(activePrice)}
            </p>
          </div>

          <div className="text-right space-y-1">
            {refPrice !== null && !isOutOfStock && (
              <p className="text-xs text-neo-ink-3">
                Cote marché : <span className="font-mono font-semibold text-neo-ink">{formatPrice(refPrice)}</span>
              </p>
            )}
            {priceDiffPct !== null && !isOutOfStock && (
              <span
                className={`inline-block px-2 py-0.5 rounded-[4px] font-mono text-[11px] font-bold border ${
                  priceDiffPct <= 0
                    ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] dark:bg-[#052E16] dark:text-[#86EFAC] dark:border-[#166534]'
                    : 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] dark:bg-[#422006] dark:text-[#FDE68A] dark:border-[#B45309]'
                }`}
              >
                {priceDiffPct > 0 ? `+${priceDiffPct}%` : `${priceDiffPct}%`} vs cote
              </span>
            )}
          </div>
        </div>

        {/* Order archive banner */}
        {isOrderView && orderData && (
          <div className="p-3.5 rounded-[6px] bg-[#EFF6FF] dark:bg-[#0B2545] border-[1.5px] border-[#93C5FD] dark:border-[#1D4ED8] text-xs text-[#1E3A8A] dark:text-[#DBEAFE] space-y-1">
            <p className="font-bold">Commande enregistrée</p>
            <p className="text-neo-ink-2">
              Achetée le {formatOrderDate(orderData.created_at || orderData.timestamp)} à @{orderData.seller_name}
            </p>
            <p className="font-mono text-[11px] text-neo-ink-3">Réf : {orderData.order_id}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {isOwnListing && !isSold && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button variant="secondary" size="lg" onClick={onOpenEditPrice} className="w-full">
                <Edit3 size={16} aria-hidden="true" />
                <span>Modifier le prix</span>
              </Button>
              <Button variant="outline" size="lg" onClick={onOpenPriceChart} className="w-full">
                <TrendingUp size={16} aria-hidden="true" />
                <span>Historique des prix</span>
              </Button>
            </div>
          )}

          {!isOwnListing && !isSold && !isOutOfStock && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onInitiateBuy(item)}
                  className="w-full"
                >
                  <ShoppingBag size={16} aria-hidden="true" />
                  <span>Acheter maintenant</span>
                </Button>
                <Button
                  variant={isInCart ? 'secondary' : 'outline'}
                  size="lg"
                  onClick={onToggleCart}
                  className="w-full"
                >
                  {isInCart ? <Check size={16} aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}
                  <span>{isInCart ? 'Dans le panier' : 'Ajouter au panier'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="outline" size="md" onClick={onOpenChat} className="w-full">
                  <MessageCircle size={15} aria-hidden="true" />
                  <span>Faire une offre</span>
                </Button>
                <Button variant="outline" size="md" onClick={onOpenPriceChart} className="w-full">
                  <TrendingUp size={15} aria-hidden="true" />
                  <span>Historique prix</span>
                </Button>
              </div>
            </>
          )}

          {(isSold || isOutOfStock) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onOpenSell(item.card_id || cardDetails?.id)}
                className="w-full"
              >
                <PlusCircle size={16} aria-hidden="true" />
                <span>Vendre cette carte</span>
              </Button>
              <Button variant="outline" size="lg" onClick={onOpenPriceChart} className="w-full">
                <TrendingUp size={16} aria-hidden="true" />
                <span>Historique prix</span>
              </Button>
            </div>
          )}

          {currentUser?.is_admin && item.id && !isOutOfStock && (
            <Button variant="danger-outline" size="sm" onClick={onAdminDelete} className="w-full">
              <Trash2 size={14} aria-hidden="true" />
              <span>Supprimer cette annonce (Admin)</span>
            </Button>
          )}
        </div>

        {/* Protection note */}
        <div className="flex items-start gap-2.5 pt-2 border-t border-neo-border text-xs text-neo-ink-3">
          <ShieldCheck size={16} className="text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Paiement séquestre protégé et vérification de conformité à réception.
          </span>
        </div>
      </div>

      {/* Seller comment */}
      {item.description && (
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-4 shadow-tactile-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neo-ink-3 mb-1.5">
            Note du vendeur
          </h2>
          <p className="text-sm text-neo-ink leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* Condition Grade Scorecard */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-neo-cobalt" aria-hidden="true" />
            <h2 className="text-sm font-bold text-neo-ink">
              Grille d&apos;état : {conditionMeta.label} ({conditionMeta.grade}/10)
            </h2>
          </div>
          <span className="text-xs font-mono text-neo-ink-3">{conditionMeta.tagline}</span>
        </div>

        <p className="text-xs text-neo-ink-2">{conditionMeta.desc}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <GradeBar label="Centrage" value={conditionMeta.centering} />
          <GradeBar label="Coins" value={conditionMeta.corners} />
          <GradeBar label="Bords" value={conditionMeta.edges} />
          <GradeBar label="Surface" value={conditionMeta.surface} />
        </div>
      </div>

      {/* Other offers for same card */}
      {otherOffers && otherOffers.length > 0 && (
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm space-y-3">
          <h2 className="text-sm font-bold text-neo-ink">
            Autres offres disponibles ({otherOffers.length})
          </h2>
          <div className="space-y-2">
            {otherOffers.map((offer) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => onSelectOffer(offer)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-[6px] bg-neo-muted hover:bg-neo-alt border-[1.5px] border-neo-border hover:border-neo-cobalt text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ConditionBadge condition={offer.condition} />
                  <span className="text-xs font-semibold text-neo-ink truncate">
                    @{offer.seller_name}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-neo-ink tabular-nums shrink-0">
                  {formatPrice(offer.price)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Technical reference */}
      <div className="text-[11px] font-mono text-neo-ink-3 px-1 flex items-center justify-between gap-2 flex-wrap">
        <span>ID Carte : {item.card_id || cardDetails?.id || '--'}</span>
        {item.id && <span>Annonce : {item.id}</span>}
      </div>
    </div>
  );
}

