import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Heart,
  ShieldCheck,
  UserPlus,
  LogIn,
  LogOut,
  Wallet,
  ShoppingBag,
  User,
  X,
  ChevronDown,
  Tag,
  Package,
  MessageCircle,
  ShoppingCart,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { formatPrice } from '../utils/format';
import Button from './ui/Button';
import PokedexLens from './ui/PokedexLens';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const {
    currentUser,
    unreadMessages,
    openLogin,
    openRegister,
    handleLogout,
  } = useAuth();
  const { itemCount, isCartOpen, openCart, closeCart } = useCart();
  const {
    searchQuery,
    handleSearchChange,
    handleLogoClick,
    handleNavbarFavoritesClick,
    favoriteListingsCount,
    showOnlyFavorites,
    handleOpenSell,
    setIsBoosterOpen,
    isChatOpen,
    setIsChatOpen,
  } = useMarketplace();

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const favActive = location.pathname === '/' && showOnlyFavorites;

  return (
    <header className="sticky top-0 z-40 bg-neo-surface border-t-[3px] border-t-neo-vermilion border-b-[1.5px] border-b-neo-border shadow-tactile-sm">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-2.5 flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
        {/* Brand — Pokédex Field Unit */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer shrink-0 group text-left"
        >
          <PokedexLens />
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold tracking-tight text-neo-ink group-hover:text-neo-vermilion transition-colors">
              PokéVinted
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-[4px] bg-neo-muted border border-neo-border font-mono text-[9px] font-bold tracking-wider text-neo-lens uppercase">
              DEX
            </span>
          </div>
        </button>

        {/* Search Command Bar */}
        <div className="flex-1 min-w-[200px] xl:max-w-md order-3 xl:order-2 w-full xl:w-auto">
          <label htmlFor="navbar-search" className="sr-only">
            Rechercher une carte, extension ou numéro
          </label>
          <div className="relative flex items-center bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] px-3 py-1.5 focus-within:bg-neo-surface focus-within:border-neo-cobalt focus-within:ring-2 focus-within:ring-neo-cobalt/15 transition-colors">
            <Search size={15} className="text-neo-ink-3 mr-2 shrink-0" aria-hidden="true" />
            <input
              id="navbar-search"
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une carte, un set…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-neo-ink placeholder:text-neo-ink-3 focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Effacer la recherche"
                className="p-1 rounded-[4px] text-neo-ink-3 hover:text-neo-ink hover:bg-neo-alt cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-neo-ink-3 bg-neo-surface border border-neo-border rounded-[4px] select-none shrink-0">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {/* Actions — single clean row on desktop */}
        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-1.5 order-2 xl:order-3 flex-wrap xl:flex-nowrap shrink-0"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBoosterOpen(true)}
            title="Ouvrir le simulateur de boosters virtuels"
            className="whitespace-nowrap px-2.5"
          >
            <Package size={14} className="text-neo-ink-3 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Boosters</span>
          </Button>

          <Button
            variant={isChatOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            aria-label="Messagerie et négociations"
            className="relative whitespace-nowrap px-2.5"
          >
            <MessageCircle size={14} className="shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Messages</span>
            {unreadMessages > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-[4px] bg-neo-vermilion text-white font-mono text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </Button>

          <Button
            variant={favActive ? 'danger-outline' : 'outline'}
            size="sm"
            onClick={handleNavbarFavoritesClick}
            aria-label="Mes annonces favorites"
            aria-pressed={favActive}
            className="whitespace-nowrap px-2.5"
          >
            <Heart
              size={14}
              className={`shrink-0 ${favActive || favoriteListingsCount > 0 ? 'text-neo-vermilion fill-neo-vermilion' : 'text-neo-ink-3'}`}
              aria-hidden="true"
            />
            <span className="hidden md:inline">Favoris</span>
            {favoriteListingsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-neo-alt text-neo-ink font-mono text-[10px] font-bold leading-none">
                {favoriteListingsCount}
              </span>
            )}
          </Button>

          <Button
            variant={itemCount > 0 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => (isCartOpen ? closeCart() : openCart())}
            aria-label={`Panier (${itemCount} articles)`}
            className="whitespace-nowrap px-2.5"
          >
            <ShoppingCart size={14} className="shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Panier</span>
            {itemCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-white/20 font-mono text-[10px] font-bold leading-none">
                {itemCount}
              </span>
            )}
          </Button>

          <div className="hidden xl:block w-px h-5 bg-neo-border mx-0.5 shrink-0" aria-hidden="true" />

          {currentUser ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => navigate('/profile')}
                title="Accéder au portefeuille"
                className="font-mono tabular-nums whitespace-nowrap px-2.5"
              >
                <Wallet size={14} className="text-neo-ink-3 shrink-0" aria-hidden="true" />
                <span>{formatPrice(currentUser.balance ?? 0)}</span>
              </Button>

              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUserDropdownOpen((v) => !v)}
                  aria-expanded={isUserDropdownOpen}
                  aria-haspopup="menu"
                  className="pr-2 whitespace-nowrap"
                >
                  <span className="w-5 h-5 rounded-[4px] bg-neo-cobalt text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden md:inline max-w-[90px] truncate">{currentUser.name}</span>
                  <ChevronDown
                    size={13}
                    className={`text-neo-ink-3 shrink-0 transition-transform duration-150 ${isUserDropdownOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </Button>

                {isUserDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute top-[calc(100%+6px)] right-0 w-64 bg-neo-surface border-[1.5px] border-neo-ink rounded-[8px] shadow-tactile-modal p-1.5 z-50 animate-modal-pop"
                  >
                    <div className="px-3 py-2 border-b border-neo-border mb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-neo-ink truncate">{currentUser.name}</span>
                        {currentUser.is_admin && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-neo-cobalt text-white">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neo-ink-3 truncate mt-0.5">
                        {currentUser.email || `@${currentUser.username}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-neo-ink-2 hover:bg-neo-muted hover:text-neo-ink cursor-pointer text-left"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/profile');
                      }}
                    >
                      <User size={15} /> Mon compte & portefeuille
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-neo-ink-2 hover:bg-neo-muted hover:text-neo-ink cursor-pointer text-left"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/orders');
                      }}
                    >
                      <ShoppingBag size={15} /> Mes achats
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-neo-ink-2 hover:bg-neo-muted hover:text-neo-ink cursor-pointer text-left"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/my-listings');
                      }}
                    >
                      <Tag size={15} /> Mes annonces en vente
                    </button>

                    {currentUser.is_admin && (
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-semibold text-neo-cobalt hover:bg-[#EFF6FF] dark:hover:bg-neo-muted cursor-pointer text-left"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          navigate('/admin');
                        }}
                      >
                        <ShieldCheck size={15} /> Administration NoSQL
                      </button>
                    )}

                    <div className="h-px bg-neo-border my-1" />

                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] dark:text-[#FCA5A5] dark:hover:bg-[#450A0A] cursor-pointer text-left"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={15} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={openLogin}>
                <LogIn size={14} aria-hidden="true" />
                <span>Connexion</span>
              </Button>
              <Button variant="subtle" size="sm" onClick={openRegister} className="hidden sm:inline-flex">
                <UserPlus size={14} aria-hidden="true" />
                <span>S'inscrire</span>
              </Button>
            </div>
          )}

          <Button variant="primary" size="sm" onClick={() => handleOpenSell()} className="whitespace-nowrap">
            <PlusCircle size={14} aria-hidden="true" />
            <span>Vendre</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            aria-label={isDark ? 'Passer au thème clair Pokédex' : 'Passer au thème sombre Pokédex'}
            title={isDark ? 'Mode Jour' : 'Mode Nuit'}
            className="w-9 px-0 shrink-0"
          >
            {isDark ? (
              <Sun size={14} className="text-[#FBBF24]" aria-hidden="true" />
            ) : (
              <Moon size={14} className="text-neo-ink-2" aria-hidden="true" />
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}

