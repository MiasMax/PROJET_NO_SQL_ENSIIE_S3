import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useMarketplace } from './context/MarketplaceContext';
import Navbar from './components/Navbar';
import MarketplaceView from './components/MarketplaceView';
import BuyModal from './components/BuyModal';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import CartDrawer from './components/CartDrawer';
import ChatPanel from './components/ChatPanel';
import Drawer from './components/ui/Drawer';

const CardDetailPage = lazy(() => import('./components/CardDetailPage'));
const UserProfilePage = lazy(() => import('./components/UserProfilePage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const BoosterOpeningPage = lazy(() => import('./components/BoosterOpeningPage'));
const SellCardModal = lazy(() => import('./components/SellCardModal'));

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-neo-surface border-[1.5px] border-neo-border rounded-[8px] p-8 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-neo-muted rounded-[4px]" />
        <div className="h-4 w-80 bg-neo-muted rounded-[4px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="h-44 bg-neo-muted rounded-[6px]" />
          <div className="h-44 bg-neo-muted rounded-[6px]" />
          <div className="h-44 bg-neo-muted rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const {
    currentUser,
    authModal,
    openLogin,
    openRegister,
    closeAuthModal,
    handleLoginSuccess,
    handleUserRegistered,
  } = useAuth();

  const {
    listings,
    catalogCards,
    isSellModalOpen,
    setIsSellModalOpen,
    sellInitialCardId,
    setSellInitialCardId,
    handleListingCreated,
    selectedListingForBuy,
    setSelectedListingForBuy,
    handlePurchaseComplete,
    handleBuyFromChat,
    isBoosterOpen,
    setIsBoosterOpen,
    isChatOpen,
    setIsChatOpen,
  } = useMarketplace();

  return (
    <div className="min-h-screen bg-neo-bg text-neo-ink flex flex-col">
      <Navbar />

      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MarketplaceView />} />
            <Route path="/listing/:id" element={<CardDetailPage />} />
            <Route path="/card/:id" element={<CardDetailPage />} />
            <Route path="/profile" element={<UserProfilePage defaultTab="wallet" />} />
            <Route path="/orders" element={<UserProfilePage defaultTab="orders" />} />
            <Route path="/my-listings" element={<UserProfilePage defaultTab="listings" />} />
            <Route
              path="/admin"
              element={<AdminDashboard onBackToMarketplace={() => navigate('/')} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {/* Sell Card Modal */}
      {isSellModalOpen && (
        <Suspense fallback={null}>
          <SellCardModal
            isOpen={isSellModalOpen}
            onClose={() => {
              setIsSellModalOpen(false);
              setSellInitialCardId(null);
            }}
            onListingCreated={handleListingCreated}
            catalogCards={catalogCards}
            initialCardId={sellInitialCardId}
            currentUser={currentUser}
            onOpenLogin={openLogin}
          />
        </Suspense>
      )}

      {/* Direct Purchase Confirmation Modal */}
      <BuyModal
        isOpen={Boolean(selectedListingForBuy)}
        onClose={() => setSelectedListingForBuy(null)}
        listing={selectedListingForBuy}
        currentUser={currentUser}
        onPurchaseComplete={handlePurchaseComplete}
        onOpenLogin={openLogin}
      />

      {/* Authentication Modals */}
      <LoginModal
        isOpen={authModal === 'login'}
        onClose={closeAuthModal}
        onLoginSuccess={handleLoginSuccess}
        onOpenRegister={openRegister}
      />
      <RegisterModal
        isOpen={authModal === 'register'}
        onClose={closeAuthModal}
        onUserRegistered={handleUserRegistered}
        onOpenLogin={openLogin}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Global Messaging & Negotiation Drawer */}
      <Drawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        ariaLabel="Messagerie et négociations"
        widthClass="max-w-md"
      >
        <ChatPanel
          currentUser={currentUser}
          listings={listings}
          onClose={() => setIsChatOpen(false)}
          onBuyNow={handleBuyFromChat}
        />
      </Drawer>

      {/* Booster Opening Studio */}
      {isBoosterOpen && (
        <Suspense fallback={null}>
          <BoosterOpeningPage
            onClose={() => setIsBoosterOpen(false)}
            currentUser={currentUser}
          />
        </Suspense>
      )}
    </div>
  );
}
