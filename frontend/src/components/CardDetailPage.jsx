import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Heart,
  ShoppingBag,
  Share2,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  RotateCw,
  Search,
  Eye,
  Layers,
  Award,
  Zap,
  Flame,
  Droplets,
  Leaf,
  Moon,
  Sun,
  ShieldAlert,
  Clock,
  Database,
  ExternalLink,
  ChevronRight,
  Trash2,
  Tag,
  BarChart2,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { generateCardSlug, matchSlugWithCard } from '../utils/slug';
import { POKEMON_CARD_BACK_FALLBACK } from './PokemonCard3D';
import CardWearOverlay from './CardWearOverlay';
import PriceChartModal from './PriceChartModal';
import ChatPanel from './ChatPanel';
import EditListingPriceModal from './EditListingPriceModal';

export default function CardDetailPage({
  currentUser,
  favorites = new Set(),
  onToggleFavorite,
  onInitiateBuy,
  onDeleteListing,
  showToast = () => {},
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [listing, setListing] = useState(null);
  const [cardMeta, setCardMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 3D Tilt & Holographic Studio state
  const stageRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 50, y: 50, clientX: 0, clientY: 0, visible: false });
  const [activeFoilMode, setActiveFoilMode] = useState('off'); // 'cosmic' | 'rainbow' | 'standard' | 'off' (disabled by default)
  const [copiedLink, setCopiedLink] = useState(false);
  const [simulatedCondition, setSimulatedCondition] = useState(null);
  const [showWearPins, setShowWearPins] = useState(false);
  const prevTrackedCardIdRef = useRef(null);
  const [otherOffers, setOtherOffers] = useState([]);
  const [isPriceChartOpen, setIsPriceChartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const { addToCart, isInCart, openCart } = useCart();

  const isOwnListing = Boolean(
    currentUser &&
    listing?.seller_name &&
    (
      (currentUser.name && currentUser.name.toLowerCase().trim() === listing.seller_name.toLowerCase().trim()) ||
      (currentUser.username && currentUser.username.toLowerCase().trim() === listing.seller_name.toLowerCase().trim())
    )
  );

  // Scroll to top on card detail page mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id]);

  // Fetch listing and reference catalog card (supports SEO slug [set]-[name]-[number] and IDs)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        let currentListing = location.state?.listing || null;
        let cardIdToFetch = currentListing?.card_id || currentListing?.id || id;

        // 1. Try direct listing lookup by ID (fetch complete document from MongoDB)
        const targetListingId = location.state?.listing?.id || (id && !id.startsWith('sv') ? id : null);
        if (targetListingId) {
          try {
            const resListing = await fetch(`/api/listings/${targetListingId}`);
            if (resListing.ok) {
              const fullListing = await resListing.json();
              currentListing = { ...(location.state?.listing || {}), ...fullListing };
              cardIdToFetch = currentListing.card_id || cardIdToFetch;
            }
          } catch (e) {
            // Silently proceed
          }
        }

        // Also check if id directly resolves to a listing in case targetListingId wasn't set
        if (!currentListing && id) {
          try {
            const resListing = await fetch(`/api/listings/${id}`);
            if (resListing.ok) {
              const fullListing = await resListing.json();
              currentListing = fullListing;
              cardIdToFetch = currentListing.card_id || cardIdToFetch;
            }
          } catch (e) {
            // Silently proceed
          }
        }

        // 2. Fetch marketplace listings and catalog cards
        let allListings = [];
        let allCards = [];
        try {
          const [listingsRes, cardsRes] = await Promise.all([
            fetch('/api/listings?limit=1000'),
            fetch('/api/cards?limit=2500'),
          ]);

          if (listingsRes.ok) {
            const data = await listingsRes.json();
            allListings = data.items || [];
          }
          if (cardsRes.ok) {
            allCards = (await cardsRes.json()) || [];
          }
        } catch (e) {
          // Silently proceed
        }

        // If not found by direct listing ID, search active marketplace listings matching this card
        if (!currentListing) {
          const activeMatch = allListings.find(
            (l) => (l.card_id === id || l.id === id || matchSlugWithCard(id, l)) && l.status === 'ACTIVE'
          );
          if (activeMatch) {
            currentListing = activeMatch;
            cardIdToFetch = currentListing.card_id;
          } else {
            // Match slug against catalog reference cards
            const foundCard = allCards.find((c) => c.id === id || matchSlugWithCard(id, c));
            if (foundCard) {
              cardIdToFetch = foundCard.id;
            }
          }
        }

        // Fetch official reference card details from MongoDB
        let currentCard = null;
        try {
          const resCard = await fetch(`/api/cards/${cardIdToFetch}`);
          if (resCard.ok) {
            currentCard = await resCard.json();
          } else {
            const foundCard = allCards.find((c) => c.id === cardIdToFetch || matchSlugWithCard(cardIdToFetch, c));
            if (foundCard) {
              currentCard = foundCard;
            }
          }
        } catch (e) {
          // Silently proceed
        }

        // Identify alternative active offers for this card on the marketplace
        const altOffers = allListings.filter(
          (l) =>
            (l.card_id === cardIdToFetch || l.id === cardIdToFetch) &&
            l.id !== currentListing?.id &&
            l.status === 'ACTIVE'
        );

        // If no listing found but card exists:
        if (!currentListing && currentCard) {
          // Case A: Navigated from an order in history
          if (location.state?.order || location.state?.listing) {
            const st = location.state.listing || location.state.order;
            currentListing = {
              id: st.id || st.listing_id || null,
              card_id: currentCard.id,
              card_name: currentCard.name,
              set_name: currentCard.set_name,
              rarity: currentCard.rarity,
              image_url: currentCard.image_large || currentCard.image_small,
              price: st.price || currentCard.market_price || 29.99,
              condition: st.condition || 'NEAR_MINT',
              seller_name: st.seller_name || 'Vendeur PokéVinted',
              buyer_name: st.buyer_name,
              description: `Carte acquise lors de votre commande passée auprès de ${st.seller_name || 'la communauté'}.`,
              status: 'SOLD',
              isCatalogReference: false,
              created_at: st.timestamp || currentCard.created_at || new Date().toISOString(),
            };
          } else if (altOffers.length > 0) {
            // Case B: There is an active offer available on the marketplace
            currentListing = altOffers[0];
          } else {
            // Case C: Reference catalog card with NO active seller offer (Out of Stock)
            currentListing = {
              id: null,
              card_id: currentCard.id,
              card_name: currentCard.name,
              set_name: currentCard.set_name,
              rarity: currentCard.rarity,
              image_url: currentCard.image_large || currentCard.image_small,
              price: currentCard.market_price || 29.99,
              condition: 'NEAR_MINT',
              seller_name: 'Catalogue PokéVinted',
              description: currentCard.flavor_text || 'Carte de référence du catalogue officiel PokéVinted NoSQL. Aucune offre en vente pour le moment.',
              status: 'OUT_OF_STOCK',
              isCatalogReference: true,
              created_at: currentCard.created_at || new Date().toISOString(),
            };
          }
        }

        if (!currentListing && !currentCard) {
          throw new Error("Carte ou annonce introuvable dans la base de données.");
        }

        if (isMounted) {
          setListing(currentListing);
          setCardMeta(currentCard);
          setOtherOffers(altOffers.filter((o) => o.id !== currentListing?.id));

          // Track real-time card popularity in Redis Sorted Set (ZINCRBY) strictly once per card consultation
          if (cardIdToFetch && prevTrackedCardIdRef.current !== cardIdToFetch) {
            prevTrackedCardIdRef.current = cardIdToFetch;
            fetch(`/api/cards/${cardIdToFetch}/view`, { method: 'POST' }).catch(() => {});
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, location.state?.listing?.id, location.state?.listing?.card_id]);

  // Handle 3D perspective tilt on mouse move
  const handleMouseMove = (e) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -16;
    const rotY = ((x - centerX) / centerX) * 16;

    setRotateX(rotX);
    setRotateY(rotY);

    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    setGlare({
      x: pctX,
      y: pctY,
      opacity: activeFoilMode === 'off' ? 0 : 0.75,
    });

    if (isMagnifierActive) {
      setMagnifierPos({
        x: pctX,
        y: pctY,
        clientX: x,
        clientY: y,
        visible: true,
      });
    }
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
    setMagnifierPos((prev) => ({ ...prev, visible: false }));
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast("🔗 Lien direct copié dans votre presse-papier !");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const isFavorite = listing
    ? (favorites.has(listing.card_id) ||
       favorites.has(listing.id) ||
       (listing.card_id?.startsWith('sv3pt5-') && favorites.has(listing.card_id.replace('sv3pt5-', 'sv03.5-'))) ||
       (listing.card_id?.startsWith('sv03.5-') && favorites.has(listing.card_id.replace('sv03.5-', 'sv3pt5-'))))
    : false;
  const isSold = listing?.status === 'SOLD';
  const isOutOfStock = listing?.status === 'OUT_OF_STOCK' || Boolean(listing?.isCatalogReference) || !listing?.id;

  const displayImage = cardMeta?.image_large || listing?.image_url;

  const getConditionScore = (cond) => {
    switch (cond) {
      case 'MINT': return { grade: '10', label: 'GEM MINT', desc: 'État parfait, sortie de booster sous sleeve', centering: 98, corners: 99, edges: 99, surface: 98 };
      case 'NEAR_MINT': return { grade: '9', label: 'NEAR MINT', desc: 'Quasi-neuf, microrayure ou blanchiment infime', centering: 92, corners: 94, edges: 91, surface: 95 };
      case 'EXCELLENT': return { grade: '7.5', label: 'EXCELLENT', desc: 'Légères traces de jeu sur les bordures', centering: 85, corners: 88, edges: 82, surface: 89 };
      case 'GOOD': return { grade: '6', label: 'GOOD', desc: 'Traces d\'usure visibles mais carte saine', centering: 78, corners: 80, edges: 75, surface: 80 };
      default: return { grade: '4.5', label: 'PLAYED', desc: 'Carte jouée avec pliures ou bords blanchis', centering: 70, corners: 72, edges: 68, surface: 70 };
    }
  };

  const effectiveCondition = simulatedCondition || listing?.condition || 'NEAR_MINT';
  const conditionData = listing ? getConditionScore(effectiveCondition) : null;

  if (loading) {
    return (
      <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <RotateCw className="animate-spin text-indigo-500 mb-4" size={44} />
        <h2 className="text-xl font-bold text-white mb-2">Chargement du studio d'inspection 3D...</h2>
        <p className="text-slate-400 text-sm">Requête documentaire MongoDB & indexation Elasticsearch en cours</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container py-20 text-center max-w-xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 mb-6">
          <ShieldAlert size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Carte Introuvable</h2>
          <p className="text-slate-300 mb-6">{error || "Cette carte ou annonce n'existe pas dans le catalogue PokéVinted."}</p>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="btn btn-primary inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} /> Retour à la marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container py-8 max-w-7xl mx-auto px-4">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-slate-400 text-sm font-medium"
            title="Revenir à votre position dans la marketplace"
          >
            <ArrowLeft size={15} /> Marketplace
          </button>
          <ChevronRight size={14} className="text-slate-600" />
          <Link
            to={`/?set=${encodeURIComponent(listing.set_name)}`}
            className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors font-medium flex items-center gap-1"
            title={`Voir toutes les cartes de l'extension : ${listing.set_name}`}
          >
            {listing.set_name}
          </Link>
          <ChevronRight size={14} className="text-slate-600" />
          <span className="text-white font-semibold">{listing.card_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.03] cursor-pointer"
            title="Copier le lien direct vers cette carte"
          >
            <Share2 size={13} />
            <span>{copiedLink ? 'Lien copié !' : 'Partager'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left 3D Stage | Right Inspection Specs & Buy */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        
        {/* LEFT COLUMN: Interactive 3D Card Studio */}
        <div className="flex flex-col items-center">
          
          {/* 3D Viewport Stage */}
          <div className="relative w-full max-w-[460px] aspect-[1/1.42] flex items-center justify-center p-4">
            
            {/* Ambient Background Aura */}
            <div
              className="absolute inset-4 rounded-3xl blur-3xl opacity-35 transition-all duration-300 pointer-events-none"
              style={{
                background: isFlipped
                  ? 'radial-gradient(circle, #3b82f6 0%, #1e40af 60%, transparent 80%)'
                  : activeFoilMode === 'cosmic'
                  ? 'radial-gradient(circle, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)'
                  : activeFoilMode === 'rainbow'
                  ? 'radial-gradient(circle, #f59e0b 0%, #ef4444 50%, #6366f1 100%)'
                  : 'radial-gradient(circle, #6366f1 0%, #1e1b4b 100%)',
              }}
            />

            {/* Interactive Card Stage with 3D Transform */}
            <div
              ref={stageRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
              style={{
                perspective: '1400px',
              }}
            >
              <div
                className="w-full h-full relative rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] transition-transform duration-100 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg)`,
                }}
              >
                {/* FRONT FACE: HD Card Artwork & Holo Shimmer */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden bg-[#121826] border border-white/20 backface-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <img
                    src={displayImage || POKEMON_CARD_BACK_FALLBACK}
                    alt={listing.card_name}
                    className="w-full h-full object-contain p-2 drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
                    style={{
                      filter: effectiveCondition === 'PLAYED'
                        ? 'saturate(0.90) contrast(0.95)'
                        : effectiveCondition === 'GOOD'
                        ? 'saturate(0.95)'
                        : 'none',
                    }}
                    draggable={false}
                    onError={(e) => { e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK; }}
                  />

                  {/* Physical condition wear overlay (creases, whitening, folds) */}
                  <CardWearOverlay
                    condition={effectiveCondition}
                    isDetailStage={true}
                    showPinDetails={showWearPins}
                    glarePos={glare}
                  />

                  {/* Dynamic Holographic Foil Overlay */}
                  {activeFoilMode !== 'off' && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                      style={{
                        opacity: glare.opacity,
                        background: activeFoilMode === 'cosmic'
                          ? `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.75) 0%, rgba(236,72,153,0.3) 25%, rgba(99,102,241,0.25) 50%, rgba(6,182,212,0.15) 75%, transparent 100%)`
                          : activeFoilMode === 'rainbow'
                          ? `linear-gradient(${glare.x * 3.6}deg, rgba(255,0,0,0.2), rgba(255,165,0,0.2), rgba(255,255,0,0.2), rgba(0,128,0,0.2), rgba(0,0,255,0.2), rgba(238,130,238,0.2))`
                          : `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.6) 0%, transparent 60%)`,
                        mixBlendMode: 'color-dodge',
                      }}
                    />
                  )}

                  {/* High-Precision Magnifier Lens Overlay */}
                  {isMagnifierActive && magnifierPos.visible && (
                    <div
                      className="absolute w-36 h-36 rounded-full border-2 border-amber-400/90 shadow-[0_0_25px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(255,255,255,0.5)] pointer-events-none overflow-hidden z-30"
                      style={{
                        left: `${magnifierPos.clientX - 72}px`,
                        top: `${magnifierPos.clientY - 72}px`,
                        backgroundImage: `url(${displayImage})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`,
                        backgroundSize: '320%',
                        backgroundColor: '#121826',
                      }}
                    >
                      {/* Crosshairs & HUD info in lens */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <div className="w-full h-[1px] bg-amber-300" />
                        <div className="h-full w-[1px] bg-amber-300 absolute" />
                      </div>
                      <span className="absolute bottom-1 right-2 text-[9px] font-black tracking-wider text-amber-300 bg-black/75 px-1 rounded">
                        2.5x ZOOM
                      </span>
                    </div>
                  )}

                  {/* Sold & Stock Ribbon Badges */}
                  {isSold && (
                    <div className="absolute top-6 -right-12 bg-red-600 text-white font-black text-xs py-1 px-12 rotate-45 shadow-lg tracking-widest z-40">
                      VENDU
                    </div>
                  )}
                  {isOutOfStock && !isSold && (
                    <div className="absolute top-6 -right-12 bg-amber-600 text-white font-black text-xs py-1 px-12 rotate-45 shadow-lg tracking-widest z-40">
                      RUPTURE
                    </div>
                  )}
                </div>

                {/* BACK FACE: Official Authentic Standard Pokémon TCG Card Back */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden bg-[#121826] border border-white/20 shadow-2xl backface-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <img
                    src="/images/pokemon-card-back.jpg"
                    alt="Dos officiel de carte Pokémon"
                    className="w-full h-full object-contain p-2 drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
                    draggable={false}
                    onError={(e) => { e.currentTarget.src = POKEMON_CARD_BACK_FALLBACK; }}
                  />

                  {/* Specular glare on back face */}
                  {activeFoilMode !== 'off' && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                      style={{
                        opacity: glare.opacity * 0.45,
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.45) 0%, transparent 60%)`,
                        mixBlendMode: 'overlay',
                      }}
                    />
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Studio Control Toolbar */}
          <div className="w-full max-w-[460px] bg-[#121826]/90 border border-white/10 rounded-2xl p-4 mt-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between gap-3 text-xs">
              
              {/* Flip Button */}
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  isFlipped
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-[#1a2236] border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <RotateCw size={14} className={isFlipped ? 'animate-spin-slow' : ''} />
                <span>{isFlipped ? 'Face Avant' : 'Verso (Dos 3D)'}</span>
              </button>

              {/* Magnifier Lens Toggle */}
              <button
                type="button"
                onClick={() => setIsMagnifierActive(!isMagnifierActive)}
                className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  isMagnifierActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20'
                    : 'bg-[#1a2236] border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Search size={14} />
                <span>{isMagnifierActive ? 'Loupe Active' : 'Mode Loupe'}</span>
              </button>
            </div>

            {/* Foil Shimmer Shaders Switcher */}
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles size={12} className="text-amber-400" />
                Reflet Holographique :
              </span>
              <div className="flex gap-1">
                {[
                  { key: 'cosmic', label: 'Cosmique' },
                  { key: 'rainbow', label: 'Arc-en-ciel' },
                  { key: 'standard', label: 'Standard' },
                  { key: 'off', label: 'Désactivé' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setActiveFoilMode(mode.key)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      activeFoilMode === mode.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-[#1a2236] text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition Wear Simulator & Diagnostics */}
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Award size={12} className="text-amber-400" />
                  État physique visualisé :
                </span>
                <button
                  type="button"
                  onClick={() => setShowWearPins(!showWearPins)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                    showWearPins
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                  title="Afficher/masquer les repères de défauts (plis, blanchiment)"
                >
                  {showWearPins ? '📍 Masquer défauts' : '📍 Repérer défauts'}
                </button>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { value: listing?.condition || 'NEAR_MINT', label: `Annonce (${listing?.condition || 'NM'})`, isOriginal: true },
                  { value: 'MINT', label: 'Mint 10' },
                  { value: 'NEAR_MINT', label: 'Near Mint 9' },
                  { value: 'EXCELLENT', label: 'Excellent 7.5' },
                  { value: 'GOOD', label: 'Good 6' },
                  { value: 'PLAYED', label: 'Played 4.5' },
                ].map((item, idx) => {
                  const isActive = item.isOriginal
                    ? simulatedCondition === null
                    : simulatedCondition === item.value;
                  return (
                    <button
                      key={`${item.value}-${idx}`}
                      type="button"
                      onClick={() => setSimulatedCondition(item.isOriginal ? null : item.value)}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                          : 'bg-[#1a2236] text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Micro-guide hint */}
          <p className="text-[11px] text-slate-500 mt-3 text-center">
            💡 Déplacez votre curseur sur la carte pour l'incliner en 3D avec physique dynamique.
          </p>
        </div>

        {/* RIGHT COLUMN: Official Metadata, Condition Audit & Purchase Card */}
        <div className="flex flex-col gap-6">

          {/* Main Card Header & Price Panel */}
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl shadow-2xl">
            {/* Holographic accent glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Set & Number Tag */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <Link
                to={`/?set=${encodeURIComponent(listing.set_name)}`}
                title={`Voir toutes les cartes de l'extension ${listing.set_name}`}
                className="text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-400/50 px-3 py-1 rounded-full transition-all inline-flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/20 cursor-pointer"
              >
                <Layers size={13} className="text-indigo-400" />
                <span>{listing.set_name}</span>
                {cardMeta?.number && <span className="text-slate-400 font-normal">• #{cardMeta.number}</span>}
              </Link>

              <span className={`condition-badge ${
                listing.condition === 'MINT' ? 'badge-mint' :
                listing.condition === 'NEAR_MINT' ? 'badge-near-mint' :
                listing.condition === 'EXCELLENT' ? 'badge-excellent' : 'badge-played'
              }`}>
                {conditionData?.label || listing.condition} (Note {conditionData?.grade}/10)
              </span>
            </div>

            {/* Card Name */}
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {listing.card_name}
            </h1>

            {/* Subtypes & Rarity Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {cardMeta?.supertype && (
                <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-lg border border-white/5">
                  {cardMeta.supertype}
                </span>
              )}
              {cardMeta?.subtypes?.map((st) => (
                <span key={st} className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-lg border border-white/5">
                  {st}
                </span>
              ))}
              <span className="text-xs bg-amber-500/10 text-amber-300 font-bold px-2.5 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1">
                <Sparkles size={11} /> {listing.rarity}
              </span>
            </div>

            {/* Price Presentation — Clean authentic Vinted style */}
            <div className="py-2 mb-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums">
                    {listing.price.toFixed(2).replace('.', ',')} €
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                    <ShieldCheck size={14} className="text-[#007782] shrink-0" />
                    <span>Protection acheteurs incluse • Envoi soigné sous toploader</span>
                  </div>
                </div>

                {cardMeta?.market_price && (
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500 block">Cote moyenne</span>
                    <span className="text-sm font-medium text-slate-400 line-through tabular-nums">
                      {cardMeta.market_price.toFixed(2).replace('.', ',')} €
                    </span>
                    {cardMeta.market_price > listing.price && (
                      <span className="block text-[11px] font-semibold text-emerald-400 mt-0.5">
                        -{Math.round(((cardMeta.market_price - listing.price) / cardMeta.market_price) * 100)} % sous cote
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Commercial Action Hub — Authentic Vinted layout */}
            <div className="space-y-2.5">
              {isOwnListing ? (
                <div className="flex flex-col gap-2">
                  {!isSold && (
                    <button
                      type="button"
                      onClick={() => setIsEditPriceOpen(true)}
                      className="w-full h-11 px-5 rounded-lg text-sm font-semibold bg-[#007782] hover:bg-[#00656f] active:bg-[#00555e] text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Tag size={16} />
                      <span>Modifier le prix de mon annonce</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/my-listings')}
                    className="w-full h-10 px-4 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:scale-[0.99] border border-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Voir toutes mes annonces en vente →</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSold || isOutOfStock}
                      onClick={() => {
                        if (!isSold && !isOutOfStock && onInitiateBuy) {
                          onInitiateBuy(listing);
                        }
                      }}
                      className={`flex-1 h-12 px-5 rounded-lg text-sm sm:text-base font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-sm ${
                        isSold || isOutOfStock
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          : 'bg-[#007782] hover:bg-[#00656f] active:bg-[#00555e] text-white'
                      }`}
                    >
                      <span>
                        {isSold
                          ? 'Carte déjà vendue'
                          : isOutOfStock
                          ? 'Rupture de stock'
                          : 'Acheter maintenant'}
                      </span>
                    </button>

                    {/* Add to Cart Button (1-card reservation constraint) */}
                    {!isSold && !isOutOfStock && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isInCart(listing.id)) {
                            openCart();
                          } else {
                            addToCart(listing);
                          }
                        }}
                        className={`h-12 px-3.5 sm:px-4 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                          isInCart(listing.id)
                            ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 hover:bg-indigo-600/35'
                            : 'bg-[#1a2236] hover:bg-[#222d48] border-white/15 text-white'
                        }`}
                        title={isInCart(listing.id) ? "Carte déjà dans votre panier • Cliquez pour ouvrir" : "Ajouter cette carte à mon panier"}
                      >
                        <ShoppingCart size={17} className={isInCart(listing.id) ? "text-indigo-400" : "text-slate-300"} />
                        <span className="hidden sm:inline">
                          {isInCart(listing.id) ? 'Au panier' : 'Panier'}
                        </span>
                      </button>
                    )}

                    {/* Favorite Action Button */}
                    <button
                      type="button"
                      onClick={() => onToggleFavorite && onToggleFavorite(listing.card_id)}
                      className={`h-12 px-4 rounded-lg border text-sm font-medium flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                        isFavorite
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-slate-900/60 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                      }`}
                      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <Heart size={18} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
                    </button>
                  </div>

                  {!isSold && !isOutOfStock && (
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      className="w-full h-11 px-5 rounded-lg text-sm font-semibold bg-transparent hover:bg-white/[0.04] active:scale-[0.99] border border-[#007782] text-[#00a8b5] hover:border-[#008f9c] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      title="Négocier le prix avec le vendeur"
                    >
                      <MessageCircle size={16} />
                      <span>Faire une offre</span>
                    </button>
                  )}
                </div>
              )}

              {/* Secondary Utility Tools Row */}
              <button
                type="button"
                onClick={() => setIsPriceChartOpen(true)}
                className="w-full h-9 px-4 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Consulter l'historique et la cote de marché"
              >
                <BarChart2 size={13} />
                <span>Historique des prix & cote</span>
              </button>
            </div>

            {/* Informative Banner for Own Listing */}
            {isOwnListing && !isSold && (
              <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start gap-3">
                <Tag size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-indigo-300 text-sm mb-0.5">
                    Vous êtes le vendeur de cette annonce
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    Cette offre vous appartient. Vous ne pouvez pas l'acheter vous-même. Vous pouvez suivre ou retirer cette offre depuis votre tableau de bord.
                  </p>
                  <Link
                    to="/my-listings"
                    className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                  >
                    Accéder à mes annonces en vente →
                  </Link>
                </div>
              </div>
            )}

            {/* Informative Status Banners */}
            {isSold && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-emerald-300 text-sm mb-0.5">
                    {listing.buyer_name ? `Carte acquise par ${listing.buyer_name}` : 'Cette annonce a déjà été vendue'}
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Transaction enregistrée dans le registre d'audit MongoDB. L'exemplaire est archivé et n'est plus disponible à l'achat.
                  </p>
                </div>
              </div>
            )}

            {isOutOfStock && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-amber-300 text-sm mb-0.5">
                    Rupture temporaire — Aucune offre active
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    Cette carte fait partie du catalogue officiel PokéVinted NoSQL, mais aucun dresseur ne l'a mise en vente pour le moment.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                  >
                    <ArrowLeft size={13} /> Parcourir les cartes disponibles sur la marketplace
                  </Link>
                </div>
              </div>
            )}

            {otherOffers.length > 0 && (
              <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles size={14} /> {otherOffers.length} autre{otherOffers.length > 1 ? 's' : ''} offre{otherOffers.length > 1 ? 's' : ''} active{otherOffers.length > 1 ? 's' : ''} pour cette carte
                  </span>
                  <span className="text-[11px] text-slate-400">
                    dès {Math.min(...otherOffers.map((o) => o.price)).toFixed(2).replace('.', ',')} €
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {otherOffers.map((off) => (
                    <button
                      key={off.id}
                      type="button"
                      onClick={() => {
                        setListing(off);
                        navigate(`/listing/${off.id}`, { state: { listing: off } });
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-indigo-950/60 border border-white/5 hover:border-indigo-500/30 transition-all text-left text-xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 group-hover:text-white">
                          {off.seller_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 font-mono">
                          {off.condition}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white tabular-nums">{off.price.toFixed(2).replace('.', ',')} €</span>
                        <span className="text-[10px] text-indigo-400 group-hover:text-indigo-300 font-semibold">
                          Consulter →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Moderation Action */}
            {currentUser?.is_admin && listing.id && !listing.isCatalogReference && (
              <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-rose-300">
                  <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                  <span><strong>Modération Admin :</strong> Supprimer cette annonce de MongoDB, Elasticsearch & Redis.</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Confirmer la suppression administrative de l'offre "${listing.card_name}" (${listing.price} €) ?\nCette opération purgera l'annonce du cluster NoSQL.`
                    );
                    if (!confirmed) return;
                    try {
                      const res = await fetch(`/api/admin/listings/${listing.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        showToast(`Offre "${listing.card_name}" supprimée avec succès par l'administrateur.`);
                        navigate('/');
                      } else {
                        const data = await res.json().catch(() => ({}));
                        showToast(data.detail || "Échec de la suppression de l'offre");
                      }
                    } catch (err) {
                      console.error(err);
                      showToast("Erreur lors de la suppression");
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 size={14} />
                  <span>Supprimer l'offre</span>
                </button>
              </div>
            )}
          </div>

          {/* PSA-Grade Inspection Scorecard */}
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                <h3 className="font-black text-white text-base">Rapport d'État Détaillé (Audit Visuel)</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Standard PSA/BGS
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {conditionData?.desc}
            </p>

            {/* Sub-scores metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Centrage (Front & Back)', score: conditionData?.centering || 90 },
                { label: 'Coins (Angles et netteté)', score: conditionData?.corners || 90 },
                { label: 'Bords (Zéro blanchiment)', score: conditionData?.edges || 90 },
                { label: 'Surface (Brillance & Vernis)', score: conditionData?.surface || 90 },
              ].map((sub) => (
                <div key={sub.label} className="bg-[#0a0d14]/60 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">{sub.label}</span>
                    <span className="font-black text-amber-300">{(sub.score / 10).toFixed(1)}/10</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-indigo-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${sub.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Credibility Profile */}
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white text-lg shadow-md">
                {(listing.seller_name || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{listing.seller_name || 'Catalogue PokéVinted'}</span>
                  <CheckCircle2 size={15} className="text-sky-400" />
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="text-amber-400 font-bold">★ 4.9/5</span>
                  <span>•</span>
                  <span>34 ventes certifiées</span>
                  <span>•</span>
                  <span>Expédition rapide &lt; 24h</span>
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-500 block">Membre depuis</span>
              <span className="text-xs font-semibold text-slate-300">Saison 2024</span>
            </div>
          </div>

          {/* NoSQL Architecture Provenance Telemetry */}
          <div className="bg-[#0a0d14]/70 border border-white/[0.06] rounded-2xl p-4 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-indigo-400" />
              <span>MongoDB Document : <strong className="text-slate-300">{listing.id ? `${listing.id.slice(0, 12)}...` : (cardMeta?.id || 'Ref-Catalogue')}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-400" />
              <span>Redis Sorted Set View Score : <strong className="text-amber-300">+1 ZINCRBY</strong></span>
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* Price chart modal */}
    {isPriceChartOpen && (listing || cardMeta) && (
      <PriceChartModal
        cardId={listing?.card_id || cardMeta?.id}
        cardName={listing?.card_name || cardMeta?.name}
        onClose={() => setIsPriceChartOpen(false)}
      />
    )}

    {/* Inline chat drawer anchored to this listing */}
    {isChatOpen && listing && (
      <>
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[190] transition-opacity"
          onClick={() => setIsChatOpen(false)}
        />
        <div
          className="fixed right-0 top-0 bottom-0 z-[200] flex flex-col"
          style={{
            width: 'min(420px, 100vw)',
            background: '#0c0e14',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '-12px 0 40px rgba(0,0,0,0.7)',
            animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <ChatPanel
            currentUser={currentUser}
            listingId={listing.id}
            sellerName={listing.seller_name}
            listingPrice={listing.price}
            cardName={listing.card_name}
            cardImage={listing.card_image || cardMeta?.image_url}
            onClose={() => setIsChatOpen(false)}
            onBuyNow={(price) => {
              setIsChatOpen(false);
              if (onInitiateBuy) {
                onInitiateBuy(price ? { ...listing, price: Number(price) } : listing);
              }
            }}
          />
        </div>
      </>
    )}

      {/* Edit Listing Price Modal */}
      {isEditPriceOpen && listing && (
        <EditListingPriceModal
          isOpen={isEditPriceOpen}
          onClose={() => setIsEditPriceOpen(false)}
          listing={listing}
          currentUser={currentUser}
          showToast={showToast}
          onSuccess={(updated) => {
            setListing((prev) => ({ ...prev, price: updated.price }));
          }}
        />
      )}
    </>
  );
}
