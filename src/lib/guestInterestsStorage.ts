/**
 * Versionssäkrad localStorage-nyckel för gäst-intresseringar.
 *
 * Strategi: ETT centralt namespace (CURRENT_KEY) som lagrar alla val som en
 * lista av poster med metadata (sport/region/class). competition_id är globalt
 * unikt över både Agility & Hoopers — så vi behöver inte segmentera nyckeln
 * per sport/region för att undvika krockar; metadatan används istället för
 * filtrering i UI.
 *
 * Versionering: bumpa STORAGE_VERSION när schemat ändras. Äldre versioner
 * migreras vid första läsning via MIGRATIONS-tabellen och raderas sedan.
 *
 * Format v2:
 *   {
 *     version: 2,
 *     items: [{
 *       competition_id, sport, region, class, status, dog_name, created_at, updated_at
 *     }]
 *   }
 */

export const STORAGE_VERSION = 2;
export const STORAGE_NAMESPACE = "am.guest.competition_interests";
export const CURRENT_KEY = `${STORAGE_NAMESPACE}.v${STORAGE_VERSION}`;
export const STORAGE_EVENT = "am:guest-interests-changed";

export type GuestInterestStatus = "interested" | "registered" | "done";
export type GuestSport = "Agility" | "Hoopers" | "unknown";

export interface GuestInterestItem {
  competition_id: string;
  sport: GuestSport;
  region: string | null;
  /** Klass (t.ex. "Klass 1", "Hoopers 2") — för filtrering per klass */
  class: string | null;
  status: GuestInterestStatus;
  dog_name: string | null;
  created_at: string;
  updated_at: string;
}

interface StoredPayload {
  version: number;
  items: GuestInterestItem[];
}

const LEGACY_KEY_V1 = "am.guest.interests.v1";

interface LegacyV1Item {
  competition_id: string;
  status: string;
  dog_name: string | null;
  class: string | null;
  created_at: string;
}

/** Migrera v1 (platt array, ingen sport/region) → v2-poster med tomma metadata-fält. */
function migrateV1(): GuestInterestItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = new Date().toISOString();
    const migrated: GuestInterestItem[] = (parsed as LegacyV1Item[])
      .filter((it) => it && typeof it.competition_id === "string")
      .map((it) => ({
        competition_id: it.competition_id,
        sport: "unknown",
        region: null,
        class: it.class ?? null,
        status: (it.status === "registered" || it.status === "done" ? it.status : "interested") as GuestInterestStatus,
        dog_name: it.dog_name ?? null,
        created_at: it.created_at ?? now,
        updated_at: now,
      }));
    return migrated;
  } catch {
    return [];
  }
}

function readPayload(): StoredPayload {
  if (typeof window === "undefined") return { version: STORAGE_VERSION, items: [] };
  try {
    const raw = window.localStorage.getItem(CURRENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return { version: parsed.version ?? STORAGE_VERSION, items: parsed.items as GuestInterestItem[] };
      }
    }
  } catch {
    /* ignore corrupt */
  }

  // Ingen v2-data — försök migrera från v1
  const legacy = migrateV1();
  if (legacy.length > 0) {
    const payload: StoredPayload = { version: STORAGE_VERSION, items: legacy };
    try {
      window.localStorage.setItem(CURRENT_KEY, JSON.stringify(payload));
      window.localStorage.removeItem(LEGACY_KEY_V1);
    } catch {
      /* ignore quota */
    }
    return payload;
  }
  return { version: STORAGE_VERSION, items: [] };
}

function writePayload(items: GuestInterestItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPayload = { version: STORAGE_VERSION, items };
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  } catch {
    /* ignore quota errors */
  }
}

export function readGuestInterestItems(): GuestInterestItem[] {
  return readPayload().items;
}

export function clearGuestInterestItems(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_KEY);
  window.localStorage.removeItem(LEGACY_KEY_V1);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
}

export interface SetGuestInterestInput {
  competition_id: string;
  status: GuestInterestStatus;
  sport?: GuestSport;
  region?: string | null;
  class?: string | null;
  dog_name?: string | null;
}

/**
 * Sätt eller toggle:a status för en tävling. Om samma status sätts igen → toggle bort.
 * Returnerar resulterande status (eller null om borttagen).
 */
export function setGuestInterest(input: SetGuestInterestInput): GuestInterestStatus | null {
  const items = readPayload().items;
  const idx = items.findIndex((i) => i.competition_id === input.competition_id);
  const now = new Date().toISOString();

  if (idx >= 0 && items[idx].status === input.status) {
    const next = items.filter((_, i) => i !== idx);
    writePayload(next);
    return null;
  }

  if (idx >= 0) {
    const next = items.map((it, i) =>
      i === idx
        ? {
            ...it,
            status: input.status,
            sport: input.sport ?? it.sport,
            region: input.region ?? it.region,
            class: input.class ?? it.class,
            dog_name: input.dog_name ?? it.dog_name,
            updated_at: now,
          }
        : it,
    );
    writePayload(next);
    return input.status;
  }

  const fresh: GuestInterestItem = {
    competition_id: input.competition_id,
    sport: input.sport ?? "unknown",
    region: input.region ?? null,
    class: input.class ?? null,
    status: input.status,
    dog_name: input.dog_name ?? null,
    created_at: now,
    updated_at: now,
  };
  writePayload([...items, fresh]);
  return input.status;
}

export function removeGuestInterest(competition_id: string): void {
  const items = readPayload().items.filter((i) => i.competition_id !== competition_id);
  writePayload(items);
}

/** Lyssna på alla källor som indikerar ändring (samma flik, andra flikar, return-fokus). */
export function subscribeGuestInterests(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === CURRENT_KEY || e.key === LEGACY_KEY_V1) handler();
  };
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", handler);
  document.addEventListener("visibilitychange", handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", handler);
    document.removeEventListener("visibilitychange", handler);
  };
}
