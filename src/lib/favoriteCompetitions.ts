// ── Favoritmarkerade tävlingar (sparas lokalt i webbläsaren) ───────────────
// Fungerar utan inloggning: nycklarna är UnifiedCompetition.key ("a-123"/"h-456").

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "am_favorite_competitions";
const EVENT = "am:favorite-competitions";

export function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* ignore quota/private mode */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function toggleFavorite(key: string): string[] {
  const current = readFavorites();
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  writeFavorites(next);
  return next;
}

export function clearFavorites() {
  writeFavorites([]);
}

/** Reaktiv lista över favoriter — synkas mellan komponenter och flikar. */
export function useFavoriteCompetitions() {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setKeys(readFavorites());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((key: string) => {
    setKeys(toggleFavorite(key));
  }, []);

  const isFavorite = useCallback((key: string) => keys.includes(key), [keys]);

  return { keys, count: keys.length, toggle, isFavorite, clear: clearFavorites };
}
