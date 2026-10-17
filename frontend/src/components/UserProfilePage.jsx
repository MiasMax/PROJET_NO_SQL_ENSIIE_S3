import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  ShoppingBag,
  User,
  ShieldCheck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Receipt,
  RefreshCw,
  Tag,
  Trash2,
  Layers,
  Search,
  X,
} from 'lucide-react';
import CardWearOverlay from './CardWearOverlay';
import EditListingPriceModal from './EditListingPriceModal';

const formatOrderDate = (raw) => {
  if (!raw) return 'Récemment';
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const clean = String(raw).replace(/\.\d+/, '');
    const d2 = new Date(clean);
    if (!isNaN(d2.getTime())) {
      return d2.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {}
  return 'Récemment';
};

export default function UserProfilePage({
  currentUser,
  onBalanceUpdated,
  onLogout,
  showToast = () => {},
  defaultTab = 'wallet',
  isSessionLoading = false,
  onOpenSell = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Active tab is derived directly from the route or defaultTab prop
  const activeTab = location.pathname.startsWith('/my-listings') || location.pathname.startsWith('/listings')
    ? 'listings'
    : location.pathname.startsWith('/orders')
    ? 'orders'
    : (defaultTab === 'orders' ? 'orders' : defaultTab === 'listings' ? 'listings' : 'wallet');

  const handleTabChange = (newTab) => {
    if (newTab === 'orders') {
      navigate('/orders');
    } else if (newTab === 'listings') {
      navigate('/my-listings');
    } else {
      navigate('/profile');
    }
  };

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [isRefreshingListings, setIsRefreshingListings] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [listingSearchQuery, setListingSearchQuery] = useState('');
  const [filterListingStatus, setFilterListingStatus] = useState('ALL');
  const [editingPriceListing, setEditingPriceListing] = useState(null);

  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchMyOrders(false);
      fetchMyListings(false);
    }
  }, [currentUser]);

  const fetchMyListings = async (isManualRefresh = false) => {
    if (!currentUser) return;
    if (isManualRefresh) {
      setIsRefreshingListings(true);
    } else {
      setLoadingListings(true);
    }
    try {
      const token = localStorage.getItem('pokevinted_token');
      const headers = token ? { 'x-session-token': token } : {};
      const seller = currentUser.name || currentUser.username;
      const res = await fetch(`/api/users/me/listings?seller_name=${encodeURIComponent(seller)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMyListings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load user listings:", err);
    } finally {
      setLoadingListings(false);
      setIsRefreshingListings(false);
    }
  };

  const handleDeleteListing = async (listingId, cardName) => {
    const confirmed = window.confirm(
      `Confirmer le retrait de la vente de l'annonce "${cardName}" ?\nElle sera immédiatement retirée de la vente sur la marketplace.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pokevinted_token');
      const headers = token ? { 'x-session-token': token } : {};
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setMyListings((prev) => prev.filter((item) => item.id !== listingId));
        showToast(`Annonce pour "${cardName}" retirée de la vente avec succès.`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Échec de la suppression de l'annonce");
      }
    } catch (err) {
      console.error("Delete listing failed:", err);
      showToast("Erreur lors de la suppression de l'annonce");
    }
  };

  const fetchMyOrders = async (isManualRefresh = false) => {
    if (!currentUser) return;
    if (isManualRefresh) {
      setIsRefreshingOrders(true);
    } else {
      setLoadingOrders(true);
    }
    try {
      const token = localStorage.getItem('pokevinted_token');
      const headers = token ? { 'x-session-token': token } : {};
      const res = await fetch(`/api/users/me/orders?buyer_name=${encodeURIComponent(currentUser.name || currentUser.username)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch (err) {
      console.error("Failed to load user orders:", err);
    } finally {
      setLoadingOrders(false);
      setIsRefreshingOrders(false);
    }
  };

  const handleRecharge = async (amountToAdd) => {
    const rawVal = amountToAdd !== undefined ? amountToAdd : rechargeAmount;
    const amount = parseFloat(rawVal);
    if (isNaN(amount) || amount <= 0) {
      setError("Veuillez saisir un montant valide (supérieur à 0 €).");
      return;
    }
    if (amount > 10000) {
      setError("Le montant maximum autorisé par recharge est de 10 000,00 €.");
      return;
    }

    setRecharging(true);
    setError(null);
    setMessage(null);

    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch('/api/users/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = "Échec du rechargement.";
        if (typeof errData.detail === 'string') {
          errMsg = errData.detail;
        } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
          const first = errData.detail[0];
          if (typeof first === 'string') {
            errMsg = first;
          } else if (first.type === 'less_than_equal' || (first.loc && first.loc.includes('amount'))) {
            errMsg = "Le montant maximum autorisé par recharge est de 10 000,00 €.";
          } else {
            errMsg = first.msg || "Erreur de validation du montant.";
          }
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      setMessage(`🎉 Votre solde a été crédité de ${amount.toFixed(2)} € !`);
      setRechargeAmount('');
      onBalanceUpdated(data.new_balance);
      showToast(`💰 Solde crédité avec succès : +${amount.toFixed(2)} €`);
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors du rechargement.");
    } finally {
      setRecharging(false);
    }
  };

  if (!currentUser) {
    if (isSessionLoading) {
      return (
        <div className="container py-24 text-center max-w-md mx-auto">
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-10 shadow-2xl flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-300">Synchronisation de votre profil dresseur...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <div className="bg-[#121826] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <User size={48} className="text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Espace Dresseur</h2>
          <p className="text-slate-400 text-sm mb-6">
            Veuillez vous connecter pour accéder à votre portefeuille et à l'historique de vos commandes.
          </p>
          <Link to="/" className="btn btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Retour à la marketplace
          </Link>
        </div>
      </div>
    );
  }

  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) return orders;
    const q = orderSearchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const name = (o.card_name || '').toLowerCase();
      const seller = (o.seller_name || '').toLowerCase();
      const id = (o.id || '').toLowerCase();
      const condition = (o.condition || '').toLowerCase();
      const priceStr = String(o.price || '');
      return (
        name.includes(q) ||
        seller.includes(q) ||
        id.includes(q) ||
        condition.includes(q) ||
        priceStr.includes(q)
      );
    });
  }, [orders, orderSearchQuery]);

  const filteredListings = useMemo(() => {
    let list = myListings;
    if (filterListingStatus === 'ACTIVE') {
      list = list.filter((l) => l.status === 'ACTIVE');
    } else if (filterListingStatus === 'SOLD') {
      list = list.filter((l) => l.status === 'SOLD');
    }
    if (listingSearchQuery.trim()) {
      const q = listingSearchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const name = (l.card_name || '').toLowerCase();
        const condition = (l.condition || '').toLowerCase();
        const id = (l.id || '').toLowerCase();
        const setName = (l.set_name || '').toLowerCase();
        const priceStr = String(l.price || '');
        return (
          name.includes(q) ||
          condition.includes(q) ||
          id.includes(q) ||
          setName.includes(q) ||
          priceStr.includes(q)
        );
      });
    }
    return list;
  }, [myListings, filterListingStatus, listingSearchQuery]);

  const activeCount = myListings.filter((l) => l.status === 'ACTIVE').length;
  const soldCount = myListings.filter((l) => l.status === 'SOLD').length;
  const activeStockValue = myListings
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
        <Link to="/" className="hover:text-white transition-colors flex items-center gap-2 text-sm text-slate-400">
          <ArrowLeft size={16} /> Retour à la marketplace
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          Session Token Authentifiée (Redis)
        </span>
      </div>

      {/* User Header Hero Card */}
      <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white text-2xl shadow-lg">
              {(currentUser.name || currentUser.username || 'D').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{currentUser.name}</h1>
                {currentUser.is_admin && (
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">
                @{currentUser.username} • Dresseur PokéVinted
              </p>
            </div>
          </div>

          {/* Wallet Balance Hero Badge */}
          <div className="bg-[#0a0d14]/90 border border-white/10 rounded-2xl p-4 sm:px-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Solde Actuel</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                {(currentUser.balance ?? 0).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-white/[0.08] flex-wrap">
          <button
            type="button"
            onClick={() => handleTabChange('wallet')}
            className={`btn text-xs py-2.5 px-5 flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'wallet' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <Wallet size={15} /> Portefeuille & Rechargement
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('orders')}
            className={`btn text-xs py-2.5 px-5 flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <ShoppingBag size={15} /> Mes Commandes ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('listings')}
            className={`btn text-xs py-2.5 px-5 flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'listings' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <Tag size={15} /> Mes Annonces ({myListings.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Wallet & Recharge */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Recharge Actions */}
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <PlusCircle size={20} className="text-indigo-400" />
              Créditer mon compte
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Ajoutez des fonds instantanément pour commander vos cartes en 1 clic.
            </p>

            {/* Quick amount presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={recharging}
                  onClick={() => handleRecharge(amt)}
                  className="py-3 px-4 bg-[#1a2236] hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-400 rounded-xl text-white font-bold text-sm transition-all"
                >
                  +{amt} €
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-2 font-medium">Autre montant personnalisé (€)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="0.5"
                    placeholder="Ex: 35.00 (max 10 000 €)"
                    value={rechargeAmount}
                    onChange={(e) => {
                      setRechargeAmount(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRecharge();
                      }
                    }}
                    className="form-input flex-1"
                  />
                  <button
                    type="button"
                    disabled={recharging || !rechargeAmount}
                    onClick={() => handleRecharge()}
                    className="btn btn-gold px-6 font-bold cursor-pointer disabled:opacity-60"
                  >
                    {recharging ? 'Crédit...' : 'Recharger'}
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1.5">
                  Montant autorisé : de 1,00 € à 10 000,00 € par transaction sécurisée
                </span>
              </div>

              {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} /> {message}
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </div>
          </div>

          {/* Wallet Security Perks */}
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                Sécurité & Séquestre NoSQL
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Chaque transaction est protégée par le système de transactions atomiques PokéVinted.
              </p>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <strong className="text-white block">Débit atomique sans découvert</strong>
                    Le solde est débité au moment exact de l'achat via les compteurs Redis protégés.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <strong className="text-white block">Audit immuable MongoDB</strong>
                    Chaque commande génère un bon d'achat numéroté et stocké de manière inaltérable.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <strong className="text-white block">Invalidation de cache instantanée</strong>
                    Dès l'achat conclu, le cache Elasticsearch/Redis est nettoyé pour interdire tout double achat.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 text-[11px] text-slate-500">
              Transactions chiffrées de bout en bout • PokéVinted ENSIIE S3
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Orders History */}
      {activeTab === 'orders' && (
        <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Receipt size={20} className="text-indigo-400" />
                Historique de vos Achats
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Toutes vos cartes acquises auprès de la communauté PokéVinted.
              </p>
            </div>
            <button
              type="button"
              disabled={isRefreshingOrders || loadingOrders}
              onClick={() => fetchMyOrders(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-60"
              title="Actualiser l'historique des achats"
            >
              <RefreshCw size={13} className={isRefreshingOrders ? "animate-spin text-indigo-400" : "text-slate-400"} />
              <span>{isRefreshingOrders ? 'Actualisation...' : 'Actualiser'}</span>
            </button>
          </div>

          {/* Orders Container with fixed min-height to eliminate layout shaking */}
          <div className={`min-h-[240px] transition-opacity duration-150 ${isRefreshingOrders ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            {loadingOrders && orders.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Clock className="animate-spin text-indigo-500 mx-auto mb-3" size={32} />
                <p className="text-xs">Chargement de vos commandes...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-[#0a0d14]/50 rounded-2xl border border-white/5">
                <ShoppingBag size={48} className="text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Aucune commande pour le moment</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Explorez la marketplace pour dénicher vos cartes Pokémon préférées !
                </p>
                <Link to="/" className="btn btn-primary inline-flex items-center gap-2 text-xs">
                  Découvrir la marketplace
                </Link>
              </div>
            ) : (
              <div>
                {/* Orders Search Input */}
                <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom de carte, vendeur, référence..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0d14]/80 border border-white/10 hover:border-white/20 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                    />
                    {orderSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setOrderSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Effacer la recherche"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {orderSearchQuery && (
                    <div className="text-xs text-slate-400 shrink-0 self-center">
                      <span className="text-white font-bold">{filteredOrders.length}</span> sur <span className="text-slate-300">{orders.length}</span> commande(s)
                    </div>
                  )}
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-[#0a0d14]/40 rounded-2xl border border-white/5">
                    <Search size={36} className="text-slate-600 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-white mb-1">Aucun achat trouvé</h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Aucune commande ne correspond à « <strong className="text-slate-200">{orderSearchQuery}</strong> »
                    </p>
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
                    >
                      Réinitialiser la recherche
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => {
                      const targetLink = `/listing/${order.listing_id || order.card_id}`;
                      const orderLinkState = {
                        order,
                        listing: {
                          id: order.listing_id,
                          card_id: order.card_id,
                          card_name: order.card_name,
                          price: order.price,
                          seller_name: order.seller_name,
                          buyer_name: order.buyer_name,
                          condition: order.condition || 'NEAR_MINT',
                          image_url: order.image_url,
                          status: 'SOLD',
                          purchased_at: order.timestamp || order.created_at,
                        },
                      };

                      return (
                        <div
                          key={order.id}
                          className="bg-[#0a0d14]/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Link to={targetLink} state={orderLinkState} className="shrink-0 group">
                              {order.image_url ? (
                                <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center shadow-md">
                                  <img
                                    src={order.image_url}
                                    alt={order.card_name}
                                    className="w-full h-full object-contain p-0.5"
                                    style={{
                                      filter:
                                        order.condition === 'PLAYED'
                                          ? 'saturate(0.90) contrast(0.95)'
                                          : order.condition === 'GOOD'
                                          ? 'saturate(0.95)'
                                          : 'none',
                                    }}
                                  />
                                  {order.condition && <CardWearOverlay condition={order.condition} />}
                                </div>
                              ) : (
                                <div className="w-14 h-20 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-slate-700 transition-colors">
                                  <ShoppingBag size={24} />
                                </div>
                              )}
                            </Link>
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Link
                                  to={targetLink}
                                  state={orderLinkState}
                                  className="font-bold text-white text-base hover:text-indigo-300 transition-colors"
                                >
                                  {order.card_name}
                                </Link>
                                <span className={`condition-badge text-[10px] px-2 py-0.5 rounded-full ${
                                  order.condition === 'MINT' ? 'badge-mint' :
                                  order.condition === 'NEAR_MINT' ? 'badge-near-mint' :
                                  order.condition === 'EXCELLENT' ? 'badge-excellent' : 'badge-played'
                                }`}>
                                  {order.condition || 'NEAR_MINT'}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  Payé & Validé
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Vendeur : <strong className="text-slate-200">{order.seller_name}</strong> • Réf : <span className="font-mono text-slate-400">{order.id.slice(0, 8)}...</span>
                              </p>
                              <span className="text-[11px] text-slate-500 block mt-1">
                                Commandé le {formatOrderDate(order.timestamp || order.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <span className="text-xl font-black text-amber-400">
                              {order.price.toFixed(2)} €
                            </span>
                            <Link
                              to={targetLink}
                              state={orderLinkState}
                              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold mt-1 cursor-pointer"
                            >
                              Inspecter la carte →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: My Listings */}
      {activeTab === 'listings' && (
        <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Tag size={20} className="text-emerald-400" />
                Mes Annonces en Vente
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gérez vos cartes Pokémon mises en vente, suivez leur statut et retirez des offres à tout moment.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenSell}
                className="btn btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Déposer une annonce</span>
              </button>

              <button
                type="button"
                disabled={isRefreshingListings || loadingListings}
                onClick={() => fetchMyListings(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-60"
                title="Actualiser vos annonces"
              >
                <RefreshCw size={13} className={isRefreshingListings ? "animate-spin text-indigo-400" : "text-slate-400"} />
                <span>{isRefreshingListings ? 'Actualisation...' : 'Actualiser'}</span>
              </button>
            </div>
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-[#0a0d14]/60 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Total Annonces</span>
                <Layers size={14} className="text-slate-400" />
              </div>
              <div className="text-2xl font-black text-white">{myListings.length}</div>
            </div>
            <div className="bg-[#0a0d14]/60 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>En Vente Active</span>
                <Tag size={14} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
            </div>
            <div className="bg-[#0a0d14]/60 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Cartes Vendues</span>
                <ShoppingBag size={14} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-400">{soldCount}</div>
            </div>
            <div className="bg-[#0a0d14]/60 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Valeur Stock Actif</span>
                <TrendingUp size={14} className="text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight tabular-nums">{activeStockValue.toFixed(2).replace('.', ',')} €</div>
            </div>
          </div>

          {/* Filter and Search Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
            {/* Listings Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher une annonce par nom, rareté, prix..."
                value={listingSearchQuery}
                onChange={(e) => setListingSearchQuery(e.target.value)}
                className="w-full bg-[#0a0d14]/80 border border-white/10 hover:border-white/20 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner"
              />
              {listingSearchQuery && (
                <button
                  type="button"
                  onClick={() => setListingSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Effacer la recherche"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setFilterListingStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterListingStatus === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10'
                }`}
              >
                Toutes ({myListings.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterListingStatus('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterListingStatus === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10'
                }`}
              >
                En vente ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterListingStatus('SOLD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterListingStatus === 'SOLD'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10'
                }`}
              >
                Vendues ({soldCount})
              </button>
            </div>
          </div>

          {/* Listings List */}
          <div className={`min-h-[240px] transition-opacity duration-150 ${isRefreshingListings ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            {loadingListings && myListings.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Clock className="animate-spin text-indigo-500 mx-auto mb-3" size={32} />
                <p className="text-xs">Chargement de vos annonces...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-[#0a0d14]/50 rounded-2xl border border-white/5">
                <Tag size={48} className="text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">
                  {myListings.length === 0
                    ? "Aucune annonce déposée"
                    : listingSearchQuery
                    ? "Aucune annonce trouvée"
                    : "Aucune annonce pour ce filtre"}
                </h4>
                <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                  {myListings.length === 0
                    ? "Vous n'avez pas encore mis de carte en vente. Vendez vos doubles et cartes rares pour créditer votre solde PokéVinted !"
                    : listingSearchQuery
                    ? `Aucune de vos annonces ne correspond à « ${listingSearchQuery} ».`
                    : "Aucune de vos annonces ne correspond au statut sélectionné."}
                </p>
                {myListings.length === 0 ? (
                  <button
                    type="button"
                    onClick={onOpenSell}
                    className="btn btn-primary inline-flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <PlusCircle size={15} /> Déposer ma première annonce
                  </button>
                ) : listingSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setListingSearchQuery('');
                      setFilterListingStatus('ALL');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
                  >
                    Réinitialiser les filtres et la recherche
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFilterListingStatus('ALL')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Voir toutes mes annonces
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredListings.map((item) => {
                  const targetLink = `/listing/${item.id}`;
                  const listingLinkState = { listing: item };
                  const isActive = item.status === 'ACTIVE';

                  return (
                    <div
                      key={item.id}
                      className="bg-[#0a0d14]/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Link to={targetLink} state={listingLinkState} className="shrink-0 group">
                          {item.image_url ? (
                            <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center shadow-md">
                              <img
                                src={item.image_url}
                                alt={item.card_name}
                                className="w-full h-full object-contain p-0.5"
                                style={{
                                  filter:
                                    item.condition === 'PLAYED'
                                      ? 'saturate(0.90) contrast(0.95)'
                                      : item.condition === 'GOOD'
                                      ? 'saturate(0.95)'
                                      : 'none',
                                }}
                              />
                              {item.condition && <CardWearOverlay condition={item.condition} />}
                            </div>
                          ) : (
                            <div className="w-14 h-20 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-slate-700 transition-colors">
                              <Tag size={24} />
                            </div>
                          )}
                        </Link>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link
                              to={targetLink}
                              state={listingLinkState}
                              className="font-bold text-white text-base hover:text-indigo-300 transition-colors"
                            >
                              {item.card_name}
                            </Link>
                            <span className={`condition-badge text-[10px] px-2 py-0.5 rounded-full ${
                              item.condition === 'MINT' ? 'badge-mint' :
                              item.condition === 'NEAR_MINT' ? 'badge-near-mint' :
                              item.condition === 'EXCELLENT' ? 'badge-excellent' : 'badge-played'
                            }`}>
                              {item.condition || 'NEAR_MINT'}
                            </span>
                            {isActive ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                En vente
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                                Vendue
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {isActive ? (
                              <>Réf : <span className="font-mono text-slate-400">{item.id.slice(0, 8)}...</span></>
                            ) : (
                              <>Achetée par : <strong className="text-slate-200">{item.buyer_name || 'Dresseur anonyme'}</strong> • Réf : <span className="font-mono text-slate-400">{item.id.slice(0, 8)}...</span></>
                            )}
                          </p>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Publiée le {formatOrderDate(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 gap-2">
                        <span className="text-xl font-bold text-white tabular-nums">
                          {Number(item.price).toFixed(2).replace('.', ',')} €
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            to={targetLink}
                            state={listingLinkState}
                            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            Inspecter
                          </Link>
                          {isActive && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingPriceListing(item)}
                                className="text-xs text-white hover:bg-[#00656f] flex items-center gap-1 font-semibold cursor-pointer px-2.5 py-1 rounded-lg bg-[#007782] transition-colors shadow-sm"
                                title="Modifier le prix de vente de cette carte"
                              >
                                <Tag size={12} />
                                <span>Modifier prix</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteListing(item.id, item.card_name)}
                                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                                title="Retirer cette annonce de la marketplace"
                              >
                                <Trash2 size={13} />
                                <span>Retirer</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Listing Price Modal */}
      {editingPriceListing && (
        <EditListingPriceModal
          isOpen={Boolean(editingPriceListing)}
          onClose={() => setEditingPriceListing(null)}
          listing={editingPriceListing}
          currentUser={currentUser}
          showToast={showToast}
          onSuccess={(updated) => {
            setMyListings((prev) =>
              prev.map((l) => (l.id === updated.id ? { ...l, price: updated.price } : l))
            );
          }}
        />
      )}
    </div>
  );
}
