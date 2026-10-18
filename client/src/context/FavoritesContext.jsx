import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createFavorite, getFavorites, removeFavorite } from '../api.js';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    const data = await getFavorites();
    setFavorites(data.favorites);
    setStatus('ready');
    setError('');
    return data.favorites;
  }, []);

  useEffect(() => {
    let cancelled = false;
    getFavorites()
      .then((data) => {
        if (cancelled) return;
        setFavorites(data.favorites);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byMenuItem = useMemo(() => {
    const map = new Map();
    for (const favorite of favorites) map.set(favorite.menuItemId, favorite);
    return map;
  }, [favorites]);

  const toggle = useCallback(async (menuItemId) => {
    setPendingIds((current) => new Set(current).add(menuItemId));
    setError('');
    try {
      const existing = byMenuItem.get(menuItemId);
      if (existing) await removeFavorite(existing.id);
      else await createFavorite(menuItemId);
      await refresh();
    } catch (err) {
      setError(err.message);
      try {
        await refresh();
      } catch {
        // The first error is the one to show.
      }
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(menuItemId);
        return next;
      });
    }
  }, [byMenuItem, refresh]);

  const value = useMemo(() => ({
    favorites,
    status,
    error,
    pendingIds,
    isSaved: (menuItemId) => byMenuItem.has(menuItemId),
    toggle,
    refresh,
  }), [favorites, status, error, pendingIds, byMenuItem, toggle, refresh]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used within FavoritesProvider');
  return value;
}
