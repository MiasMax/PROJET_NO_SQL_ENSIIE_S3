import React, { useState, useEffect } from 'react';
import { X, Sparkles, UploadCloud, CheckCircle2, AlertCircle, Database } from 'lucide-react';

export default function SellCardModal({ isOpen, onClose, onListingCreated, catalogCards = [] }) {
  const [selectedCardId, setSelectedCardId] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('NEAR_MINT');
  const [sellerName, setSellerName] = useState('');
  const [description, setDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialisation du premier Pokémon du catalogue par défaut
  useEffect(() => {
    if (catalogCards.length > 0 && !selectedCardId) {
      setSelectedCardId(catalogCards[0].id);
      setPrice(catalogCards[0].market_price ? catalogCards[0].market_price.toString() : '20');
    }
  }, [catalogCards, selectedCardId]);

  if (!isOpen) return null;

  const selectedCard = catalogCards.find((c) => c.id === selectedCardId) || catalogCards[0];

  const handleCardChange = (cardId) => {
    setSelectedCardId(cardId);
    const card = catalogCards.find((c) => c.id === cardId);
    if (card) {
      setPrice(card.market_price ? card.market_price.toString() : '20');
    }
  };

  const filteredCatalog = catalogCards.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.set_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: selectedCardId,
          price: parseFloat(price),
          condition: condition,
          seller_name: sellerName,
          description: description,
          custom_image_url: customImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Erreur lors de la création de l\'annonce');
      }

      const newListing = await response.json();
      onListingCreated(newListing);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Vendre une Carte Pokémon</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Publiez votre annonce en quelques secondes (synchronisation NoSQL automatique).
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Bannière de persistance multi-systèmes */}
        <div style={{ padding: '12px 24px', background: 'rgba(99, 102, 241, 0.08)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Database size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>
            Persistance active : <strong>MongoDB</strong> (document) + <strong>Elasticsearch</strong> (recherche) + <strong>Redis</strong> (statistiques).
          </span>
        </div>

        {error && (
          <div style={{ margin: '16px 24px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '24px' }}>
          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            {/* Sélection de la carte */}
            <div className="form-group">
              <label className="form-label">1. Choisir le Pokémon dans le catalogue</label>
              <input
                type="text"
                placeholder="Filtrer (ex: Dracaufeu, Pikachu...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ marginBottom: '8px', padding: '8px 12px', fontSize: '0.85rem' }}
              />
              <select
                value={selectedCardId}
                onChange={(e) => handleCardChange(e.target.value)}
                className="form-select"
                required
              >
                {filteredCatalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.set_name} ({c.rarity}) ~ {c.market_price}€
                  </option>
                ))}
              </select>
            </div>

            {/* État de la carte */}
            <div className="form-group">
              <label className="form-label">2. État d'usure</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="form-select"
              >
                <option value="MINT">💎 MINT (Parfait, sortie de booster sous toploader)</option>
                <option value="NEAR_MINT">✨ NEAR MINT (Quasi neuf, infimes micro-défauts)</option>
                <option value="EXCELLENT">👍 EXCELLENT (Très bon état, légers blanchiments)</option>
                <option value="GOOD">👌 GOOD (Bon état, rayures superficielles)</option>
                <option value="PLAYED">⚡ PLAYED (Jouée, traces d'usure visibles)</option>
              </select>
            </div>

            {/* Prix de vente */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="form-label">3. Prix demandé (€)</label>
                {selectedCard && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                    Cote moyenne : {selectedCard.market_price} €
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input"
                placeholder="ex: 45.00"
              />
            </div>

            {/* Nom du vendeur */}
            <div className="form-group">
              <label className="form-label">4. Votre Pseudo Vendeur</label>
              <input
                type="text"
                required
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="form-input"
                placeholder="ex: Sacha_Kanto"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">5. Description de l'annonce</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                placeholder="Ex: Carte protégée sous double sleeve + toploader, envoi rapide sous enveloppe à bulles."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {loading ? 'Publication en cours...' : '🚀 Publier l\'annonce sur PokéVinted'}
            </button>
          </form>

          {/* Prévisualisation en direct */}
          <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Aperçu en temps réel
            </span>

            {selectedCard && (
              <>
                <div style={{ width: '190px', margin: '0 auto', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>
                  <img
                    src={selectedCard.image_large || selectedCard.image_small}
                    alt={selectedCard.name}
                    style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                  />
                </div>
                <h4 style={{ marginTop: '16px', fontSize: '1.2rem', fontWeight: 700 }}>
                  {selectedCard.name}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {selectedCard.set_name} • {selectedCard.rarity}
                </p>
                <div style={{ marginTop: '12px', fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  {price ? `${parseFloat(price || 0).toFixed(2)} €` : '-- €'}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Vendeur : <strong>{sellerName || 'Votre pseudo'}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
