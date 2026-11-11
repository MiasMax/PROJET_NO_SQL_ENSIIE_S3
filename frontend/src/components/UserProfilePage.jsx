import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, ShoppingBag, Tag, LogIn, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice } from '../utils/format';
import Button from './ui/Button';
import WalletTab from './profile/WalletTab';
import OrdersTab from './profile/OrdersTab';
import ListingsTab from './profile/ListingsTab';
import EditListingPriceModal from './EditListingPriceModal';

const TABS = [
  { id: 'wallet', label: 'Portefeuille', path: '/profile', icon: Wallet },
  { id: 'orders', label: 'Commandes', path: '/orders', icon: ShoppingBag },
  { id: 'listings', label: 'Mes annonces', path: '/my-listings', icon: Tag },
];

export default function UserProfilePage({
  currentUser: propUser,
  onOpenLogin: propOpenLogin,
  onBalanceUpdated: propBalanceUpdated,
  onOpenSell: propOpenSell,
  showToast: propShowToast,
  defaultTab = 'wallet',
}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const marketplace = useMarketplace();
  const toastCtx = useToast();
  const confirm = useConfirm();

  const currentUser = propUser !== undefined ? propUser : auth.currentUser;
  const onOpenLogin = propOpenLogin || auth.openLogin;
  const onBalanceUpdated = propBalanceUpdated || auth.handleBalanceUpdated;
  const onOpenSell = propOpenSell || marketplace.handleOpenSell;
  const showToast = propShowToast || toastCtx.showToast;

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingListing, setEditingListing] = useState(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const fetchMyOrders = useCallback(async () => {
    if (!currentUser) return;
    setOrdersLoading(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const buyerHandle = currentUser.name || currentUser.username || currentUser.id;
      const res = await fetch(
        `/api/users/me/orders?buyer_name=${encodeURIComponent(buyerHandle)}`,
        { headers: token ? { 'x-session-token': token } : {} }
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      // keep existing state
    } finally {
      setOrdersLoading(false);
    }
  }, [currentUser]);

  const fetchMyListings = useCallback(async () => {
    if (!currentUser) return;
    setListingsLoading(true);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const sellerHandle = currentUser.name || currentUser.username || currentUser.id;
      const res = await fetch(
        `/api/users/me/listings?seller_name=${encodeURIComponent(sellerHandle)}`,
        { headers: token ? { 'x-session-token': token } : {} }
      );
      if (res.ok) {
        const data = await res.json();
        setMyListings(Array.isArray(data) ? data : []);
      }
    } catch {
      // keep existing state
    } finally {
      setListingsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'orders') {
      fetchMyOrders();
    } else if (activeTab === 'listings') {
      fetchMyListings();
    }
  }, [activeTab, currentUser, fetchMyOrders, fetchMyListings]);

  const handleDeleteListing = async (listing) => {
    if (!listing?.id) return;
    const ok = await confirm({
      title: 'Retirer cette annonce',
      description: 'Cette carte ne sera plus visible dans le catalogue du marché.',
      details: [
        { label: 'Carte', value: listing.card_name },
        { label: 'Prix', value: formatPrice(listing.price) },
      ],
      confirmLabel: "Retirer l'annonce",
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (!ok) return;

    setDeletingId(listing.id);
    try {
      const token = localStorage.getItem('pokevinted_token');
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
        headers: token ? { 'x-session-token': token } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Suppression impossible.');
      }
      setMyListings((prev) => prev.filter((item) => item.id !== listing.id));
      marketplace.fetchData();
      showToast(`Annonce « ${listing.card_name} » retirée.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (!currentUser) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-8 text-center shadow-tactile space-y-4">
          <div className="w-12 h-12 rounded-[8px] bg-neo-muted border border-neo-border flex items-center justify-center mx-auto text-neo-ink-2">
            <User size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-neo-ink">Connexion requise</h1>
          <p className="text-sm text-neo-ink-2">
            Connectez-vous pour accéder à votre portefeuille, vos commandes et vos annonces en cours.
          </p>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              Retour
            </Button>
            <Button variant="primary" onClick={onOpenLogin}>
              <LogIn size={16} aria-hidden="true" />
              <span>Se connecter</span>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Header */}
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-5 shadow-tactile-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-[8px] bg-neo-cobalt text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
            {(currentUser.name || currentUser.username || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-neo-ink truncate">
              {currentUser.name || currentUser.username}
            </h1>
            <p className="text-xs text-neo-ink-3 font-mono">
              @{currentUser.username || currentUser.id} ·{' '}
              <span className="text-neo-ink font-bold">{formatPrice(currentUser.balance ?? 0)}</span>
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Catalogue</span>
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b-[1.5px] border-neo-border pb-3 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                navigate(tab.path);
              }}
              className={`h-10 px-4 rounded-[6px] border-[1.5px] text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
                active
                  ? 'bg-neo-cobalt text-white border-[#1E3A8A]'
                  : 'bg-neo-surface border-neo-border text-neo-ink-2 hover:text-neo-ink hover:bg-neo-muted'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      {activeTab === 'wallet' && (
        <WalletTab
          currentUser={currentUser}
          onBalanceUpdated={onBalanceUpdated}
          showToast={showToast}
        />
      )}

      {activeTab === 'orders' && <OrdersTab orders={orders} loading={ordersLoading} />}

      {activeTab === 'listings' && (
        <ListingsTab
          listings={myListings}
          loading={listingsLoading}
          deletingId={deletingId}
          onOpenSell={() => onOpenSell?.()}
          onEditPrice={(listing) => setEditingListing(listing)}
          onDeleteListing={handleDeleteListing}
        />
      )}

      <EditListingPriceModal
        isOpen={Boolean(editingListing)}
        onClose={() => setEditingListing(null)}
        listing={editingListing}
        currentUser={currentUser}
        showToast={showToast}
        onSuccess={(updated) => {
          setMyListings((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, price: updated.price } : item))
          );
          marketplace.fetchData();
        }}
      />
    </main>
  );
}
