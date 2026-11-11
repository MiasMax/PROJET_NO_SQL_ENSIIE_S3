import React, { useState, useRef } from 'react';
import { Sparkles, Layers } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { POKEMON_CARD_BACK_FALLBACK } from '../../utils/cardFallback';
import { getRarityCfg } from './boosterConstants';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function Card3DInspectModal({ card, onClose }) {
  const stageRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });

  if (!card) return null;
  const cfg = getRarityCfg(card);
  const cardPrice = Number(card.market_price ?? card.price ?? card.reference_market_price ?? 0);
  const cardImageUrl = card.image_large || card.image_small || card.image_url || POKEMON_CARD_BACK_FALLBACK;

  const handleMouseMove = (e) => {
    if (!stageRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = stageRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setTilt({
      rx: -((yPct / 100) * 2 - 1) * 10,
      ry: ((xPct / 100) * 2 - 1) * 12,
      glareX: xPct,
      glareY: yPct,
      active: true,
    });
  };

  const resetTilt = () =>
    setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50, active: false });

  return (
    <Modal isOpen={Boolean(card)} onClose={onClose} size="md">
      <Modal.Header
        title={card.name || card.card_name}
        subtitle={`${card.set_name || 'Extension Pokémon'}${card.number ? ` · #${card.number}` : ''}`}
        icon={<Sparkles size={18} className="text-neo-cobalt" />}
      />

      <Modal.Body className="space-y-4">
        <div
          ref={stageRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={resetTilt}
          className="bg-neo-muted border-[1.5px] border-neo-border rounded-[8px] p-6 flex items-center justify-center"
          style={{ perspective: '1000px' }}
        >
          <div
            className="w-[240px] aspect-[5/7] rounded-[10px] border-[1.5px] border-neo-ink bg-white shadow-[0_12px_28px_rgba(17,24,39,0.18)] overflow-hidden relative transition-transform duration-150"
            style={{
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            }}
          >
            <img
              src={cardImageUrl}
              alt={card.name || card.card_name}
              className="w-full h-full object-contain bg-[#F8FAFC]"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK;
              }}
            />
            {tilt.active && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle 120px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.28), transparent 70%)`,
                }}
              />
            )}
          </div>
        </div>

        <div className="bg-neo-muted border-[1.5px] border-neo-border rounded-[8px] p-3.5 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-neo-ink-3 mb-1">Rareté</p>
            <span className={`inline-block px-2 py-0.5 rounded-[4px] border font-bold ${cfg.badgeClass}`}>
              {cfg.shortLabel}
            </span>
          </div>
          <div>
            <p className="text-neo-ink-3 mb-1">Cote estimée</p>
            <p className="font-mono text-base font-bold text-neo-ink tabular-nums">
              {formatPrice(cardPrice)}
            </p>
          </div>
          <div>
            <p className="text-neo-ink-3 mb-1">Exemplaires</p>
            <p className="font-mono text-base font-bold text-neo-ink flex items-center gap-1">
              <Layers size={14} className="text-neo-ink-3" aria-hidden="true" />
              <span>x{card.count || 1}</span>
            </p>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

