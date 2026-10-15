import React, { useState, useRef } from 'react';
import { Sparkles, ShoppingBag, Eye, Tag, Heart } from 'lucide-react';

export default function PokemonCard3D({ listing, onSelect, onQuickBuy, isFavorite = false, onToggleFavorite }) {
  const cardRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const isSold = listing.status === 'SOLD';

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
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`card-item ${isSold ? 'opacity-70' : ''}`}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Holographic specular glare */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 0, 150, 0.15) 35%, transparent 70%)`,
          opacity: glarePos.opacity,
          pointerEvents: 'none',
          zIndex: 10,
          transition: 'opacity 0.2s ease',
          borderRadius: 'inherit',
          mixBlendMode: 'overlay',
        }}
      />

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

      {/* Card image container */}
      <div className="card-image-wrap">
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(listing.card_id);
            }}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 25,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isFavorite ? '#ef4444' : '#94a3b8',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
          >
            <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} />
          </button>
        )}
        <img
          src={listing.image_url}
          alt={listing.card_name}
          className="card-img"
          loading="lazy"
        />
      </div>

      {/* Listing details */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={`condition-badge ${getConditionBadgeClass(listing.condition)}`}>
            {listing.condition}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {listing.set_name}
          </span>
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '4px 0', color: '#ffffff' }}>
          {listing.card_name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
              {listing.price.toFixed(2)} €
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            par <strong>{listing.seller_name}</strong>
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: isSold ? '1fr' : '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => onSelect(listing)}
            className="btn btn-secondary"
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            <Eye size={15} /> Détail
          </button>
          {!isSold && (
            <button
              onClick={() => onQuickBuy(listing)}
              className="btn btn-gold"
              style={{ padding: '8px', fontSize: '0.85rem' }}
            >
              <ShoppingBag size={15} /> Acheter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
