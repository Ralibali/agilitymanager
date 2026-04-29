/**
 * Användarpreferens: synka lokala gästmarkeringar till kontot vid inloggning,
 * så de blir tillgängliga på flera enheter.
 *
 * Lagras i localStorage (per enhet) — om av: gästmarkeringar lever bara lokalt.
 */

const KEY = "am.guest.interests.sync_enabled";
export const SYNC_PREF_EVENT = "am:guest-interests-sync-pref-changed";

/** Default: PÅ — de flesta vill att deras markeringar följer med vid inloggning. */
export function getGuestInterestsSyncEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setGuestInterestsSyncEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent(SYNC_PREF_EVENT));
  } catch {
    /* ignore quota */
  }
}

export function subscribeGuestInterestsSyncPref(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) handler();
  };
  window.addEventListener(SYNC_PREF_EVENT, handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SYNC_PREF_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}
