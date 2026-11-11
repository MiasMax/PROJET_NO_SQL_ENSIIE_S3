import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('pokevinted_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    try {
      const cached = localStorage.getItem('pokevinted_cached_favs');
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null

  const openLogin = useCallback(() => setAuthModal('login'), []);
  const openRegister = useCallback(() => setAuthModal('register'), []);
  const closeAuthModal = useCallback(() => setAuthModal(null), []);

  const loadUserFavorites = useCallback(async () => {
    try {
      const token = localStorage.getItem('pokevinted_token');
      const authHeaders = token ? { 'x-session-token': token } : {};
      const res = await fetch('/api/users/favorites', { headers: authHeaders });
      if (res.ok) {
        const favList = await res.json();
        let cachedArr = [];
        try {
          const cachedStr = localStorage.getItem('pokevinted_cached_favs');
          if (cachedStr) cachedArr = JSON.parse(cachedStr);
        } catch {
          // Ignore storage error
        }

        if (favList.length === 0 && cachedArr.length > 0) {
          for (const fid of cachedArr) {
            fetch(`/api/users/favorites/${fid}`, { method: 'POST', headers: authHeaders }).catch(() => {});
          }
        }

        const merged = new Set([...favList, ...cachedArr].filter(Boolean));
        setFavorites(merged);
        try {
          localStorage.setItem('pokevinted_cached_favs', JSON.stringify([...merged]));
        } catch {
          // Ignore storage error
        }
      }
    } catch (e) {
      console.error('Erreur chargement favoris :', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('pokevinted_token');
        if (!token) {
          localStorage.removeItem('pokevinted_cached_user');
          if (active) setCurrentUser(null);
          return;
        }
        const res = await fetch('/api/users/me', {
          headers: { 'x-session-token': token },
        });
        if (res.ok) {
          const user = await res.json();
          if (!active) return;
          setCurrentUser(user);
          try {
            localStorage.setItem('pokevinted_cached_user', JSON.stringify(user));
          } catch {
            // Ignore
          }
          if (user.id) loadUserFavorites();
        } else {
          localStorage.removeItem('pokevinted_token');
          localStorage.removeItem('pokevinted_cached_user');
          if (active) setCurrentUser(null);
        }
      } catch (e) {
        console.error('Erreur vérification session :', e);
        if (active) setCurrentUser(null);
      } finally {
        if (active) setIsSessionLoading(false);
      }
    };
    checkSession();
    return () => {
      active = false;
    };
  }, [loadUserFavorites]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadMessages(0);
      return;
    }
    const username = currentUser.name || currentUser.username;
    const poll = async () => {
      try {
        const token = localStorage.getItem('pokevinted_token');
        const res = await fetch(`/api/messages/unread-count?username=${encodeURIComponent(username)}`, {
          headers: token ? { 'x-session-token': token } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unread_total || 0);
        }
      } catch {
        // Best-effort polling
      }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = useCallback(
    (user) => {
      setCurrentUser(user);
      try {
        localStorage.setItem('pokevinted_cached_user', JSON.stringify(user));
      } catch {
        // Ignore
      }
      if (user.id) loadUserFavorites();
      showToast(`Bienvenue ${user.name}. Connexion réussie.`, 'success');
    },
    [loadUserFavorites, showToast]
  );

  const handleUserRegistered = useCallback(
    (newUser) => {
      setCurrentUser(newUser);
      try {
        localStorage.setItem('pokevinted_cached_user', JSON.stringify(newUser));
      } catch {
        // Ignore
      }
      if (newUser.id) loadUserFavorites();
      showToast(`Compte créé. Bienvenue ${newUser.name}.`, 'success');
    },
    [loadUserFavorites, showToast]
  );

  const handleLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem('pokevinted_token');
      if (token) {
        await fetch('/api/users/logout', {
          method: 'POST',
          headers: { 'x-session-token': token },
        });
      }
    } catch (e) {
      console.error('Erreur déconnexion :', e);
    } finally {
      localStorage.removeItem('pokevinted_token');
      localStorage.removeItem('pokevinted_cached_user');
      localStorage.removeItem('pokevinted_cached_favs');
      localStorage.removeItem('pokevinted_booster_collection');
      setCurrentUser(null);
      setFavorites(new Set());
      navigate('/');
      showToast('Déconnexion effectuée.', 'info');
    }
  }, [navigate, showToast]);

  const handleBalanceUpdated = useCallback((newBalance) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, balance: newBalance };
      try {
        localStorage.setItem('pokevinted_cached_user', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const handleToggleFavorite = useCallback(
    async (listingId) => {
      if (!currentUser) {
        showToast('Connectez-vous pour enregistrer des annonces en favoris.', 'info');
        openLogin();
        return;
      }
      if (!listingId) return;

      try {
        const token = localStorage.getItem('pokevinted_token');
        const res = await fetch(`/api/users/favorites/${listingId}`, {
          method: 'POST',
          headers: token ? { 'x-session-token': token } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setFavorites((prev) => {
            const next = new Set(prev);
            if (data.is_favorite) {
              next.add(listingId);
              showToast('Annonce ajoutée aux favoris.', 'success');
            } else {
              next.delete(listingId);
              showToast('Annonce retirée des favoris.', 'info');
            }
            try {
              localStorage.setItem('pokevinted_cached_favs', JSON.stringify([...next]));
            } catch {
              // Ignore
            }
            return next;
          });
        }
      } catch (e) {
        console.error('Erreur toggle favori :', e);
      }
    },
    [currentUser, openLogin, showToast]
  );

  const isCardInFavorites = useCallback(
    (listing) => Boolean(listing?.id && favorites.has(listing.id)),
    [favorites]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSessionLoading,
        favorites,
        unreadMessages,
        authModal,
        openLogin,
        openRegister,
        closeAuthModal,
        handleLoginSuccess,
        handleUserRegistered,
        handleLogout,
        handleBalanceUpdated,
        handleToggleFavorite,
        isCardInFavorites,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

