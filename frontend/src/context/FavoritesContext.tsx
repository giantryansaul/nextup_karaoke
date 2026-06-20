import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { FavoriteSong } from '../types';

const FAVORITES_KEY = 'nextup_favorites';

interface FavoritesContextValue {
  favorites: FavoriteSong[];
  isFavorited: (video_id: string) => boolean;
  toggleFavorite: (song: FavoriteSong) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteSong[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as FavoriteSong[]) : [];
    } catch {
      return [];
    }
  });

  const isFavorited = (video_id: string) =>
    favorites.some((f) => f.video_id === video_id);

  const toggleFavorite = (song: FavoriteSong) => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.video_id === song.video_id)
        ? prev.filter((f) => f.video_id !== song.video_id)
        : [song, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorited, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
