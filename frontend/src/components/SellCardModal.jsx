import React, { useState, useEffect, useMemo } from 'react';
import { Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CONDITION_OPTIONS, formatPrice } from '../utils/format';
import Modal from './ui/Modal';
import Button from './ui/Button';
import SellCatalogStep from './sell/SellCatalogStep';
import SellPricingStep from './sell/SellPricingStep';

export default function SellCardModal({
  isOpen,
  onClose,
  onListingCreated,
  catalogCards = [],
  initialCardId = null,
  currentUser,
  onOpenLogin,
}) {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState(catalogCards);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState('ALL');
  const [sortBy, setSortBy] = useState('cote_desc');

  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('NEAR_MINT');
  const [sellerName, setSellerName] = useState(currentUser?.name || currentUser?.username || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [publishedListing, setPublishedListing] = useState(null);

  useEffect(() => {
    if (catalogCards && catalogCards.length > 0) {
      setCatalog(catalogCards);
    } else if (isOpen) {
      fetch('/api/cards?limit=3000')
        .then((res) => (res.ok ? res.json() : []))
        .then((cards) => setCatalog(cards || []))
        .catch(() => {});
    }
  }, [catalogCards, isOpen]);

  useEffect(() => {
    if (currentUser) {
      setSellerName(currentUser.name || currentUser.username || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (catalog.length > 0 && !selectedCardId && !initialCardId) {
      setSelectedCardId(catalog[0].id);
      setPrice(catalog[0].market_price ? catalog[0].market_price.toFixed(2) : '20.00');
    }
  }, [catalog, selectedCardId, initialCardId]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPublishedListing(null);
      if (!initialCardId) setStep(1);
    }
  }, [isOpen, initialCardId]);

  useEffect(() => {
    if (!isOpen || !initialCardId || catalog.length === 0) return;
    const card = catalog.find((c) => c.id === initialCardId);
    if (card) {
      setSelectedCardId(card.id);
      setPrice(card.market_price ? card.market_price.toFixed(2) : '20.00');
      setStep(2);
    } else {
      setStep(1);
    }
  }, [isOpen, initialCardId, catalog]);

  const selectedCard = useMemo(
    () => catalog.find((c) => c.id === selectedCardId) || catalog[0] || null,
    [catalog, selectedCardId]
  );

  const availableSets = useMemo(() => {
    const sets = new Set();
    (catalog || []).forEach((c) => {
      if (c.set_name) sets.add(c.set_name);
    });
    return Array.from(sets);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = (catalog || []).filter((c) => {
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.set_name?.toLowerCase().includes(q) ||
        c.number?.toLowerCase().includes(q) ||
        c.rarity?.toLowerCase().includes(q);
      const matchesSet = selectedSet === 'ALL' || c.set_name === selectedSet;
      return matchesSearch && matchesSet;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'cote_desc') return (b.market_price || 0) - (a.market_price || 0);
      if (sortBy === 'cote_asc') return (a.market_price || 0) - (b.market_price || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'number') return (a.number || '').localeCompare(b.number || '');
      return 0;
    });
  }, [catalog, searchQuery, selectedSet, sortBy]);

  if (!isOpen) return null;

  const currentCondObj = CONDITION_OPTIONS.find((c) => c.value === condition) || CONDITION_OPTIONS[1];

  const handleConditionChange = (newCondition) => {
    setCondition(newCondition);
    const target = CONDITION_OPTIONS.find((c) => c.value === newCondition);
    const mult = target?.multiplier || 1.0;
    if (selectedCard?.market_price) {
      const computed = Math.max(0.5, Math.round(selectedCard.market_price * mult * 2) / 2);
      setPrice(computed.toFixed(2));
    }
  };

  const handleCardSelect = (card) => {
    setSelectedCardId(card.id);
    if (card.market_price) {
      const computed = Math.max(0.5, Math.round(card.market_price * currentCondObj.multiplier * 2) / 2);
      setPrice(computed.toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Veuillez vous connecter pour publier une annonce.');
      onOpenLogin?.();
      return;
    }
    if (!selectedCardId) {
      setError('Veuillez sélectionner une carte.');
      setStep(1);
      return;
    }

    const numericPrice = parseFloat(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError('Veuillez renseigner un prix valide.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({
          card_id: selectedCardId,
          price: numericPrice,
          condition,
          seller_name: sellerName || currentUser.name || 'Dresseur',
          description,
          custom_image_url: null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur lors de la création de l'annonce.");
      }

      const newListing = await response.json();
      onListingCreated?.(newListing);
      setPublishedListing(newListing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (publishedListing) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <Modal.Header
          title="Annonce publiée"
          icon={<CheckCircle2 size={18} className="text-[#15803D]" />}
        />
        <Modal.Body className="space-y-4">
          <p className="text-sm text-neo-ink-2">
            Votre carte est maintenant visible par tous les acheteurs sur le catalogue.
          </p>
          <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-4 space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-neo-ink-3">Carte</dt>
              <dd className="font-bold text-neo-ink text-right">{publishedListing.card_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neo-ink-3">État</dt>
              <dd className="font-semibold text-neo-ink">{publishedListing.condition}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neo-ink-3">Prix demandé</dt>
              <dd className="font-mono font-bold text-neo-ink">{formatPrice(publishedListing.price)}</dd>
            </div>
          </dl>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPublishedListing(null);
              setDescription('');
              setStep(1);
            }}
          >
            Vendre une autre carte
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Terminer
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <Modal.Header
        title="Mettre une carte en vente"
        subtitle="0 % commission · Publication immédiate"
        icon={<Tag size={17} className="text-neo-vermilion" />}
        rightSlot={
          <div className="hidden sm:flex items-center gap-1 bg-neo-muted p-1 rounded-[6px] border border-neo-border">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                step === 1 ? 'bg-neo-cobalt text-white' : 'text-neo-ink-3 hover:text-neo-ink'
              }`}
            >
              1. Carte
            </button>
            <button
              type="button"
              disabled={!selectedCard}
              onClick={() => selectedCard && setStep(2)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40 ${
                step === 2 ? 'bg-neo-vermilion text-white' : 'text-neo-ink-3 hover:text-neo-ink'
              }`}
            >
              2. Prix & État
            </button>
          </div>
        }
      />

      {error && (
        <div role="alert" className="mx-5 mt-4 p-3 rounded-[6px] bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] text-[#B91C1C] text-xs font-medium flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <SellCatalogStep
          catalog={catalog}
          filteredCatalog={filteredCatalog}
          availableSets={availableSets}
          selectedCard={selectedCard}
          selectedCardId={selectedCardId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedSet={selectedSet}
          setSelectedSet={setSelectedSet}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onSelectCard={handleCardSelect}
          onDoubleSelectCard={(card) => {
            handleCardSelect(card);
            setStep(2);
          }}
          onNextStep={() => setStep(2)}
        />
      )}

      {step === 2 && selectedCard && (
        <SellPricingStep
          selectedCard={selectedCard}
          condition={condition}
          onConditionChange={handleConditionChange}
          price={price}
          setPrice={setPrice}
          description={description}
          setDescription={setDescription}
          sellerName={sellerName}
          loading={loading}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
        />
      )}
    </Modal>
  );
}
