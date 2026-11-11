import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Tag, Heart, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { generateCardSlug } from '../utils/slug';
import { formatPrice, isSameSeller } from '../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../utils/cardFallback';
import CardWearOverlay from './CardWearOverlay';
import ConditionBadge from './ui/ConditionBadge';
import Button from './ui/Button';

export { POKEMON_CARD_BACK_FALLBACK };

export default function PokemonCard3D({
  listing,
  onSelect,
  onQuickBuy,
  isFavorite = false,
  onToggleFavorite,
  currentUser = null,
  onDeleteListing = null,
}) {
  const navigate = useNavigate();
  const { addToCart, isInCart, openCart } = useCart();
  const cardRef = useRef(null);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [imgSrc, setImgSrc] = useState(listing.image_url || POKEMON_CARD_BACK_FALLBACK);

  useEffect(() => {
    setImgSrc(listing.image_url || POKEMON_CARD_BACK_FALLBACK);
  }, [listing.image_url]);

  const isSold = listing.status === 'SOLD';
  const isOwnListing = isSameSeller(currentUser, listing.seller_name);
  const inCart = isInCart(listing.id);

  const handleOpenDetail = (e) => {
    if (e) e.stopPropagation();
    if (onSelect) {
      onSelect(listing);
    } else {
      navigate(`/card/${generateCardSlug(listing)}`, { state: { listing } });
    }
  };

  const handleMouseMove = (e) => {
    if (isSold || !cardRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX(((y - centerY) / centerY) * -10);
    setRotateY(((x - centerX) / centerX) * 10);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.45,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <article
      id={`card-listing-${listing.id}`}
      data-card-id={listing.card_id}
      className={`relative bg-neo-surface border-[1.5px] border-neo-border hover:border-neo-cobalt rounded-[6px] shadow-tactile hover:shadow-tactile-cobalt overflow-hidden flex flex-col h-full transition-all duration-150 ${
        isSold ? 'opacity-75' : ''
      }`}
    >
      {isSold && (
        <div className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-[4px] bg-neo-ink text-neo-surface font-mono text-[10px] font-bold tracking-wider uppercase">
          Vendue
        </div>
      )}

      {/* Visual stage */}
      <div
        ref={cardRef}
        className="relative bg-neo-muted border-b-[1.5px] border-neo-border p-4 flex justify-center items-center min-h-[250px] select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Overlay icon actions — >= 40px accessible targets */}
        <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(listing.id);
              }}
              aria-label={isFavorite ? `Retirer ${listing.card_name} des favoris` : `Ajouter ${listing.card_name} aux favoris`}
              aria-pressed={isFavorite}
              className={`w-10 h-10 rounded-[6px] border-[1.5px] flex items-center justify-center cursor-pointer transition-colors ${
                isFavorite
                  ? 'bg-[#FEF2F2] dark:bg-[#450A0A] border-neo-vermilion text-neo-vermilion'
                  : 'bg-neo-surface border-neo-border text-neo-ink-3 hover:text-neo-vermilion hover:border-neo-vermilion'
              }`}
            >
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          )}

          {!isSold && !isOwnListing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (inCart) openCart();
                else addToCart(listing);
              }}
              aria-label={inCart ? `Ouvrir le panier (${listing.card_name})` : `Ajouter ${listing.card_name} au panier`}
              className={`w-10 h-10 rounded-[6px] border-[1.5px] flex items-center justify-center cursor-pointer transition-colors ${
                inCart
                  ? 'bg-neo-cobalt border-neo-cobalt text-white'
                  : 'bg-neo-surface border-neo-border text-neo-ink-3 hover:text-neo-cobalt hover:border-neo-cobalt'
              }`}
            >
              <ShoppingCart size={15} aria-hidden="true" />
            </button>
          )}
        </div>

        {currentUser?.is_admin && onDeleteListing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteListing(listing);
            }}
            aria-label={`Supprimer l'annonce ${listing.card_name}`}
            className={`absolute top-2.5 ${isSold ? 'right-20' : 'right-2.5'} z-30 w-10 h-10 rounded-[6px] bg-[#FEE2E2] hover:bg-[#DC2626] text-[#B91C1C] hover:text-white border-[1.5px] border-[#FCA5A5] hover:border-[#991B1B] flex items-center justify-center cursor-pointer transition-colors`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={handleOpenDetail}
          aria-label={`Inspecter ${listing.card_name}`}
          className="relative flex items-center justify-center w-full h-full bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-offset-4"
        >
          <div
            className="relative flex items-center justify-center transition-transform duration-150 ease-out"
            style={{
              transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none z-20 rounded-[8px] transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.35) 0%, transparent 60%)`,
                opacity: glarePos.opacity,
              }}
              aria-hidden="true"
            />

            <img
              src={imgSrc}
              alt={listing.card_name}
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                setImgSrc(POKEMON_CARD_BACK_FALLBACK);
              }}
              className="max-h-[218px] w-auto object-contain rounded-[6px] drop-shadow-[0_6px_12px_rgba(17,24,39,0.22)]"
              style={{
                filter:
                  listing.condition === 'PLAYED'
                    ? 'saturate(0.90) contrast(0.96)'
                    : listing.condition === 'GOOD'
                    ? 'saturate(0.95)'
                    : 'none',
              }}
            />
            <CardWearOverlay condition={listing.condition} glarePos={glarePos} />
          </div>
        </button>
      </div>

      {/* Card body */}
      <div className="p-3.5 flex flex-col flex-1 gap-2">
        <div className="flex items-center justify-between gap-2">
          <ConditionBadge condition={listing.condition} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/?set=${encodeURIComponent(listing.set_name)}`);
            }}
            className="text-[11px] font-medium text-neo-ink-3 hover:text-neo-cobalt hover:underline bg-transparent border-0 p-0 cursor-pointer truncate max-w-[130px] text-right"
            title={`Filtrer par extension : ${listing.set_name}`}
          >
            {listing.set_name}
          </button>
        </div>

        <h3 className="text-sm font-bold text-neo-ink leading-snug">
          <button
            type="button"
            onClick={handleOpenDetail}
            className="text-left bg-transparent border-0 p-0 cursor-pointer hover:text-neo-cobalt transition-colors line-clamp-2 w-full"
          >
            {listing.card_name}
          </button>
        </h3>

        <div className="flex items-baseline justify-between gap-2 mt-auto pt-2 border-t border-neo-border">
          <span className="font-mono text-base font-bold text-neo-ink tabular-nums">
            {formatPrice(listing.price)}
          </span>
          <span className="text-xs text-neo-ink-3 truncate max-w-[115px]">
            {listing.seller_name}
          </span>
        </div>

        <div className={`grid gap-2 mt-1 ${isSold ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <Button variant="outline" size="sm" onClick={handleOpenDetail}>
            <Eye size={14} aria-hidden="true" />
            <span>Détail</span>
          </Button>
          {!isSold && (
            isOwnListing ? (
              <span className="h-9 px-2 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border text-[11px] font-semibold text-neo-cobalt inline-flex items-center justify-center gap-1">
                <Tag size={12} aria-hidden="true" /> Votre offre
              </span>
            ) : (
              <Button variant="primary" size="sm" onClick={() => onQuickBuy(listing)}>
                Acheter
              </Button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
