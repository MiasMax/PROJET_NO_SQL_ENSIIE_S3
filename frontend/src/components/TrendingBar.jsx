import React, { useState, useEffect } from 'react';
import { Flame, Eye, Sparkles } from 'lucide-react';

export default function TrendingBar({ onSelectCard }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = async () => {
    try {
      const res = await fetch('/api/cards/trending/top?limit=5');
      if (res.ok) {
        setTrending(await res.json());
      }
    } catch (e) {
      console.error("Erreur chargement trending :", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
    // Poll every 15s to illustrate real-time Redis Sorted Set updates
    const interval = setInterval(fetchTrending, 15000);
    return () => clearInterval(interval);
  }, []);

  if (trending.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      marginBottom: '32px',
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={20} color="#ef4444" className="animate-pulse" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top 5 Tendances en Direct
          </h3>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            borderRadius: '999px',
            fontWeight: 700
          }}>
            Redis Sorted Set (ZSET)
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Calculé instantanément par <code>ZINCRBY</code> / <code>ZREVRANGE</code>
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {trending.map((card, idx) => (
          <div
            key={card.id}
            onClick={() => onSelectCard && onSelectCard(card)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span style={{
              fontWeight: 900,
              fontSize: '1.1rem',
              color: idx === 0 ? 'var(--accent-gold)' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)',
              width: '20px'
            }}>
              #{idx + 1}
            </span>
            <img
              src={card.image_small}
              alt={card.name}
              style={{ width: '36px', height: '48px', objectFit: 'contain', borderRadius: '4px' }}
            />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: '#ffffff' }}>
                {card.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                <Eye size={12} />
                <span>{card.views} consultation{card.views > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
