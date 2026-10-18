import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Eye, Tag, Heart, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { generateCardSlug } from '../utils/slug';
import CardWearOverlay from './CardWearOverlay';

export const POKEMON_CARD_BACK_FALLBACK = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <radialGradient id="ballGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="60%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </radialGradient>
  </defs>
  <rect width="300" height="420" rx="16" fill="url(#bg)"/>
  <rect x="10" y="10" width="280" height="400" rx="12" fill="none" stroke="url(#borderGrad)" stroke-width="2" opacity="0.6"/>
  <circle cx="150" cy="200" r="56" fill="#0f172a" stroke="#6366f1" stroke-width="4"/>
  <path d="M 94 200 A 56 56 0 0 1 206 200 Z" fill="url(#ballGrad)"/>
  <path d="M 94 200 A 56 56 0 0 0 206 200 Z" fill="#f8fafc"/>
  <line x1="94" y1="200" x2="206" y2="200" stroke="#0f172a" stroke-width="8"/>
  <circle cx="150" cy="200" r="18" fill="#0f172a"/>
  <circle cx="150" cy="200" r="12" fill="#f8fafc" stroke="#6366f1" stroke-width="2"/>
  <text x="150" y="315" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#a5b4fc" text-anchor="middle" letter-spacing="3">POKÉVINTED</text>
  <text x="150" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">OFFICIAL TRADING CARD</text>
</svg>
`);

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
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  const checkImgStatus = (imgEl) => {
    if (!imgEl) return;
    imgRef.current = imgEl;
    if (imgEl.complete) {
      if (imgEl.naturalWidth > 0) {
        setImgLoaded(true);
      } else if (imgSrc !== POKEMON_CARD_BACK_FALLBACK) {
        setImgSrc(POKEMON_CARD_BACK_FALLBACK);
        setImgLoaded(true);
      } else {
        setImgLoaded(true);
      }
    }
  };

  useEffect(() => {
    const nextUrl = listing.image_url || POKEMON_CARD_BACK_FALLBACK;
    setImgSrc(nextUrl);

    // Fast-path: check if element is already loaded in browser cache
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setImgLoaded(true);
        return;
      }
    }

    // Safety timeout: prevents infinite pulse skeleton on refresh or network lag
    const timer = setTimeout(() => {
      setImgLoaded(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [listing.image_url]);

  const handleImgError = () => {
    setImgSrc(POKEMON_CARD_BACK_FALLBACK);
    setImgLoaded(true);
  };

  const isSold = listing.status === 'SOLD';
  const isOwnListing = Boolean(
    currentUser &&
    listing.seller_name &&
    (
      (currentUser.name && currentUser.name.toLowerCase().trim() === listing.seller_name.toLowerCase().trim()) ||
      (currentUser.username && currentUser.username.toLowerCase().trim() === listing.seller_name.toLowerCase().trim())
    )
  );

  const handleOpenDetail = (e) => {
    if (e) e.stopPropagation();
    if (onSelect) {
      onSelect(listing);
    } else {
      const slug = generateCardSlug(listing);
      navigate(`/card/${slug}`, { state: { listing } });
    }
  };

  const handleMouseMove = (e) => {
    if (isSold || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.65,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const getConditionBadgeClass = (cond) => {
    switch (cond) {
      case 'MINT': return 'badge-mint';
      case 'NEAR_MINT': return 'badge-near-mint';
      case 'EXCELLENT': return 'badge-excellent';
      default: return 'badge-played';
    }
  };

  return (
    <div
      id={`card-listing-${listing.id}`}
      data-card-id={listing.card_id}
      className={`card-item ${isSold ? 'opacity-70' : ''}`}
    >
      {/* Sold ribbon banner */}
      {isSold && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '-35px',
          background: '#ef4444',
          color: 'white',
          fontWeight: 800,
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          padding: '4px 40px',
          transform: 'rotate(45deg)',
          zIndex: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}>
          SOLD
        </div>
      )}

      {/* Card image container - 3D interaction zone */}
      <div
        ref={cardRef}
        className="card-image-wrap cursor-pointer relative select-none"
        onClick={handleOpenDetail}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Action icons (Heart, Cart, Admin Trash) - Fixed, stable, never rotate */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(listing.id);
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              setRotateX(0);
              setRotateY(0);
              setGlarePos((prev) => ({ ...prev, opacity: 0 }));
            }}
            onMouseMove={(e) => e.stopPropagation()}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 35,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isFavorite ? '#ef4444' : '#94a3b8',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s ease, color 0.15s ease, background 0.15s ease',
            }}
            className="hover:scale-115 active:scale-95"
          >
            <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} />
          </button>
        )}
        {!isSold && !isOwnListing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isInCart(listing.id)) {
                openCart();
              } else {
                addToCart(listing);
              }
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              setRotateX(0);
              setRotateY(0);
              setGlarePos((prev) => ({ ...prev, opacity: 0 }));
            }}
            onMouseMove={(e) => e.stopPropagation()}
            title={isInCart(listing.id) ? "Carte déjà dans votre panier • Ouvrir le panier" : "Ajouter cette carte à votre panier"}
            style={{
              position: 'absolute',
              top: '12px',
              left: onToggleFavorite ? '48px' : '12px',
              zIndex: 35,
              background: isInCart(listing.id) ? 'rgba(79, 70, 229, 0.95)' : 'rgba(15, 23, 42, 0.85)',
              border: isInCart(listing.id) ? '1px solid rgba(129, 140, 248, 0.8)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isInCart(listing.id) ? '#ffffff' : '#94a3b8',
              backdropFilter: 'blur(8px)',
              boxShadow: isInCart(listing.id) ? '0 2px 10px rgba(99, 102, 241, 0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
            }}
            className="hover:scale-115 active:scale-95"
          >
            <ShoppingCart size={15} />
          </button>
        )}
        {currentUser?.is_admin && onDeleteListing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteListing(listing);
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              setRotateX(0);
              setRotateY(0);
              setGlarePos((prev) => ({ ...prev, opacity: 0 }));
            }}
            onMouseMove={(e) => e.stopPropagation()}
            title="Supprimer cette offre (Modération Admin)"
            style={{
              position: 'absolute',
              top: '12px',
              right: isSold ? '52px' : '12px',
              zIndex: 35,
              background: 'rgba(239, 68, 68, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
            className="hover:scale-115 active:scale-95 hover:bg-red-600"
          >
            <Trash2 size={15} />
          </button>
        )}

        {/* 3D Tilted Card Visual - Only the card image rotates */}
        <div
          className="relative flex items-center justify-center w-full h-full pointer-events-none"
          style={{
            transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Specular sheen confined to card visual */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.22) 0%, transparent 60%)`,
              opacity: glarePos.opacity,
              pointerEvents: 'none',
              zIndex: 20,
              transition: 'opacity 0.2s ease',
              borderRadius: '10px',
              mixBlendMode: 'overlay',
            }}
          />

          {!imgLoaded && (
            <div className="absolute inset-0 bg-slate-800/80 rounded-lg flex items-center justify-center animate-pulse">
              <Sparkles size={22} className="text-indigo-400/40 animate-spin-slow" />
            </div>
          )}
          <img
            ref={checkImgStatus}
            src={imgSrc}
            alt={listing.card_name}
            className={`card-img transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
              filter: listing.condition === 'PLAYED'
                ? 'saturate(0.90) contrast(0.96)'
                : listing.condition === 'GOOD'
                ? 'saturate(0.95)'
                : 'none',
            }}
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
          />
          {/* Physical condition wear overlay (creases, edge whitening, scratches) */}
          <CardWearOverlay condition={listing.condition} glarePos={glarePos} />
        </div>
      </div>

      {/* Listing details */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`condition-badge ${getConditionBadgeClass(listing.condition)}`}>
            {listing.condition}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/?set=${encodeURIComponent(listing.set_name)}`);
            }}
            title={`Filtrer par l'extension : ${listing.set_name}`}
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'right',
            }}
            className="hover:text-indigo-400 hover:underline transition-colors max-w-[150px] truncate"
          >
            {listing.set_name}
          </button>
        </div>

        <h3
          onClick={handleOpenDetail}
          className="cursor-pointer hover:text-indigo-300 transition-colors"
          style={{ fontSize: '1.1rem', fontWeight: 700, margin: '4px 0', color: '#ffffff' }}
        >
          {listing.card_name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {listing.price.toFixed(2).replace('.', ',')} €
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            par <strong>{listing.seller_name}</strong>
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: isSold ? '1fr' : '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={handleOpenDetail}
            className="btn btn-secondary"
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            <Eye size={15} /> Détail
          </button>
          {!isSold && (
            isOwnListing ? (
              <span
                className="text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-xl px-2 py-1.5 inline-flex items-center justify-center gap-1.5"
                title="Vous êtes le vendeur de cette carte"
              >
                <Tag size={13} className="text-indigo-400" /> Votre offre
              </span>
            ) : (
              <button
                onClick={() => onQuickBuy(listing)}
                className="rounded-lg bg-[#007782] hover:bg-[#00656f] active:bg-[#00555e] text-white font-semibold transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                style={{ padding: '8px', fontSize: '0.85rem' }}
              >
                Acheter
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
