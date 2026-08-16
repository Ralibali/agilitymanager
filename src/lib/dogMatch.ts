// ── Matchning av tävlingar mot hundens klass och storlek ───────────────────
import { useCallback, useEffect, useState } from "react";
import type { UnifiedCompetition } from "./competitionData";

export type MatchSport = "agility" | "hoopers";
export type SizeClass = "XS" | "S" | "M" | "L";
export type HoopersSize = "Small" | "Large";

/** Klassnivåer som förekommer i den hämtade tävlingsdatan. */
export const AGILITY_LEVELS = ["Nollklass", "Klass 1", "Klass 2", "Klass 3"] as const;
export const HOOPERS_LEVELS = ["Startklass", "Klass 1", "Klass 2", "Klass 3"] as const;

export type AgilityLevel = (typeof AGILITY_LEVELS)[number];
export type HoopersLevel = (typeof HOOPERS_LEVELS)[number];

export interface DogProfile {
  name: string;
  sport: MatchSport;
  agilityLevel: AgilityLevel;
  hoopersLevel: HoopersLevel;
  size: SizeClass;
}

export const DEFAULT_DOG_PROFILE: DogProfile = {
  name: "",
  sport: "agility",
  agilityLevel: "Klass 1",
  hoopersLevel: "Startklass",
  size: "M",
};

/** Hopphöjd enligt SBK:s agilityregler. */
export const JUMP_HEIGHT_CM: Record<SizeClass, number> = { XS: 25, S: 35, M: 45, L: 55 };

/** Mankhöjdsintervall per storleksklass (cm). */
export const SIZE_WITHERS: Record<SizeClass, string> = {
  XS: "under 28 cm",
  S: "28–34,9 cm",
  M: "35–42,9 cm",
  L: "43 cm och över",
};

/** Hoopers delas endast in i Small och Large. */
export function hoopersSizeFor(size: SizeClass): HoopersSize {
  return size === "XS" || size === "S" ? "Small" : "Large";
}

const AGILITY_TOKENS: Record<AgilityLevel, string[]> = {
  Nollklass: ["0-klass", "0klass", "nollklass"],
  "Klass 1": ["ag1", "ho1", "klass 1", "kl1"],
  "Klass 2": ["ag2", "ho2", "klass 2", "kl2"],
  "Klass 3": ["ag3", "ho3", "klass 3", "kl3", "lag"],
};

const HOOPERS_TOKENS: Record<HoopersLevel, string[]> = {
  Startklass: ["startklass", "start"],
  "Klass 1": ["klass 1", "kl 1", "k1"],
  "Klass 2": ["klass 2", "kl 2", "k2"],
  "Klass 3": ["klass 3", "kl 3", "k3"],
};

export interface MatchResult {
  /** Tävlingen har minst en klass som hunden får starta i. */
  matches: boolean;
  /** Klasserna i tävlingen som matchar hundens nivå. */
  matchedClasses: string[];
  /** Sant när tävlingen saknar klassinformation och därför inte kan bedömas. */
  unknownClasses: boolean;
}

/** Avgör om en tävling passar hundens sport och klassnivå. */
export function matchCompetition(comp: UnifiedCompetition, dog: DogProfile): MatchResult {
  if (comp.sport !== dog.sport) {
    return { matches: false, matchedClasses: [], unknownClasses: false };
  }

  const tokens =
    dog.sport === "agility" ? AGILITY_TOKENS[dog.agilityLevel] : HOOPERS_TOKENS[dog.hoopersLevel];

  const classes = comp.classes.filter((c) => c.trim().length > 0);
  if (classes.length === 0) {
    return { matches: true, matchedClasses: [], unknownClasses: true };
  }

  const matchedClasses = classes.filter((c) => {
    const value = c.toLowerCase().trim();
    return tokens.some((t) => value === t || value.includes(t));
  });

  return { matches: matchedClasses.length > 0, matchedClasses, unknownClasses: false };
}

/** Filtrerar en lista tävlingar till dem hunden kan starta i. */
export function filterMatching(
  list: UnifiedCompetition[],
  dog: DogProfile,
): UnifiedCompetition[] {
  return list.filter((c) => matchCompetition(c, dog).matches);
}

// ── Lokal lagring av hundprofiler ──────────────────────────────────────────

const STORAGE_KEY = "am_match_dog_profile";
const STORE_KEY = "am_match_dog_profiles";
const EVENT = "am:dog-profile";
export const MAX_DOG_PROFILES = 6;

/** En sparad matchningsprofil. Flera per användare, en är aktiv. */
export interface SavedDogProfile extends DogProfile {
  id: string;
}

export interface DogProfileStore {
  profiles: SavedDogProfile[];
  activeId: string;
  /** Tidpunkt (ms) för senaste ändringen — används vid synk mellan enheter. */
  updatedAt?: number;
}

function newId(): string {
  return `dp_${Math.random().toString(36).slice(2, 10)}`;
}

export function createProfile(patch: Partial<DogProfile> = {}): SavedDogProfile {
  return { ...DEFAULT_DOG_PROFILE, ...patch, id: newId() };
}

/** Etikett som alltid är läsbar även när namnet saknas. */
export function profileLabel(profile: DogProfile, index: number): string {
  return profile.name.trim() || `Profil ${index + 1}`;
}

/** Läser in och rensar upp en lagrad profillista (lokal eller från kontot). */
export function sanitizeStore(raw: unknown): DogProfileStore | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<DogProfileStore>;
  if (!Array.isArray(value.profiles) || value.profiles.length === 0) return null;
  const profiles = value.profiles
    .slice(0, MAX_DOG_PROFILES)
    .map((p) => ({ ...DEFAULT_DOG_PROFILE, ...p, id: p?.id || newId() }));
  const activeId = profiles.some((p) => p.id === value.activeId)
    ? (value.activeId as string)
    : profiles[0].id;
  const updatedAt = typeof value.updatedAt === "number" ? value.updatedAt : undefined;
  return { profiles, activeId, updatedAt };
}

export function readProfileStore(): DogProfileStore {
  if (typeof window === "undefined") {
    const first = createProfile();
    return { profiles: [first], activeId: first.id };
  }
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = sanitizeStore(raw ? JSON.parse(raw) : null);
    if (parsed) return parsed;
    // Migrering från den tidigare enskilda profilen.
    const legacy = window.localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const first = createProfile(JSON.parse(legacy) as Partial<DogProfile>);
      return { profiles: [first], activeId: first.id };
    }
  } catch {
    /* trasig lagring – börja om med en tom profil */
  }
  const first = createProfile();
  return { profiles: [first], activeId: first.id };
}

export function writeProfileStore(store: DogProfileStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    const active = store.profiles.find((p) => p.id === store.activeId);
    if (active) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  } catch {
    /* lagring kan vara blockerad – matchningen fungerar ändå i sessionen */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function activeProfile(store: DogProfileStore): SavedDogProfile {
  return store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];
}

export function readDogProfile(): DogProfile {
  return activeProfile(readProfileStore());
}

/** Uppdaterar den aktiva profilen. */
export function patchActive(store: DogProfileStore, patch: Partial<DogProfile>): DogProfileStore {
  return {
    ...store,
    profiles: store.profiles.map((p) => (p.id === store.activeId ? { ...p, ...patch } : p)),
  };
}

export function addProfile(store: DogProfileStore, patch: Partial<DogProfile> = {}): DogProfileStore {
  if (store.profiles.length >= MAX_DOG_PROFILES) return store;
  const created = createProfile(patch);
  return { profiles: [...store.profiles, created], activeId: created.id };
}

/** Duplicerar en profil så man snabbt kan skapa en variant. */
export function duplicateProfile(store: DogProfileStore, id: string): DogProfileStore {
  const source = store.profiles.find((p) => p.id === id);
  if (!source) return store;
  return addProfile(store, { ...source, name: source.name.trim() ? `${source.name} (kopia)` : "" });
}

export function removeProfile(store: DogProfileStore, id: string): DogProfileStore {
  if (store.profiles.length <= 1) return store;
  const profiles = store.profiles.filter((p) => p.id !== id);
  const activeId = profiles.some((p) => p.id === store.activeId) ? store.activeId : profiles[0].id;
  return { profiles, activeId };
}

export function selectProfile(store: DogProfileStore, id: string): DogProfileStore {
  return store.profiles.some((p) => p.id === id) ? { ...store, activeId: id } : store;
}

/** Hundprofiler som sparas lokalt i webbläsaren, inget konto krävs. */
export function useDogProfile() {
  const [store, setStore] = useState<DogProfileStore>(() => {
    const first = createProfile();
    return { profiles: [first], activeId: first.id };
  });

  useEffect(() => {
    setStore(readProfileStore());
    const sync = () => setStore(readProfileStore());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = useCallback((next: DogProfileStore) => {
    setStore(next);
    writeProfileStore(next);
  }, []);

  const update = useCallback(
    (patch: Partial<DogProfile>) => commit(patchActive(readProfileStore(), patch)),
    [commit],
  );
  const select = useCallback((id: string) => commit(selectProfile(readProfileStore(), id)), [commit]);
  const add = useCallback(() => commit(addProfile(readProfileStore())), [commit]);
  const duplicate = useCallback(
    (id: string) => commit(duplicateProfile(readProfileStore(), id)),
    [commit],
  );
  const remove = useCallback((id: string) => commit(removeProfile(readProfileStore(), id)), [commit]);

  return {
    profile: activeProfile(store),
    profiles: store.profiles,
    activeId: store.activeId,
    update,
    select,
    add,
    duplicate,
    remove,
    canAdd: store.profiles.length < MAX_DOG_PROFILES,
  };
}


// ── Förklaring: varför matchar tävlingen? ──────────────────────────────────

export type ReasonState = "ok" | "no" | "unknown";

export interface MatchReason {
  key: "sport" | "class" | "size";
  state: ReasonState;
  label: string;
  detail: string;
}

export interface MatchExplanation extends MatchResult {
  reasons: MatchReason[];
  summary: string;
}

/** Bygger en läsbar förklaring till varför en tävling matchar hunden eller inte. */
export function explainMatch(comp: UnifiedCompetition, dog: DogProfile): MatchExplanation {
  const result = matchCompetition(comp, dog);
  const dogName = dog.name.trim() || "din hund";
  const level = dog.sport === "agility" ? dog.agilityLevel : dog.hoopersLevel;
  const classes = comp.classes.filter((c) => c.trim().length > 0);

  const sportOk = comp.sport === dog.sport;
  const reasons: MatchReason[] = [
    {
      key: "sport",
      state: sportOk ? "ok" : "no",
      label: "Sport",
      detail: sportOk
        ? `Tävlingen är ${comp.sport} och ${dogName} tävlar i ${dog.sport}.`
        : `Tävlingen är ${comp.sport}, men ${dogName} är inställd på ${dog.sport}.`,
    },
    {
      key: "class",
      state: !sportOk ? "no" : result.unknownClasses ? "unknown" : result.matches ? "ok" : "no",
      label: "Klass",
      detail: !sportOk
        ? "Klasserna bedöms inte eftersom sporten skiljer sig."
        : result.unknownClasses
          ? "Arrangören har inte publicerat klasslistan ännu — kontrollera i inbjudan."
          : result.matches
            ? `${level} matchar ${result.matchedClasses.join(", ")}.`
            : `${level} finns inte bland klasserna: ${classes.join(", ")}.`,
    },
    {
      key: "size",
      state: "ok",
      label: "Storlek",
      detail:
        dog.sport === "agility"
          ? `Storleksklass ${dog.size} (${SIZE_WITHERS[dog.size]}) ger hopphöjd ${JUMP_HEIGHT_CM[dog.size]} cm. Svenska tävlingar tar emot alla storlekar.`
          : `Storleksklass ${dog.size} motsvarar hoopersstorlek ${hoopersSizeFor(dog.size)}. Svenska tävlingar tar emot alla storlekar.`,
    },
  ];

  const summary = !sportOk
    ? `Matchar inte — fel sport för ${dogName}.`
    : result.unknownClasses
      ? `Klasslista saknas — kan passa ${dogName}.`
      : result.matches
        ? `Matchar ${dogName}: ${result.matchedClasses.join(", ")}.`
        : `Matchar inte ${level}.`;

  return { ...result, reasons, summary };
}

// ── Matchstyrka: rangordning av hur väl en tävling passar hunden ───────────

export type MatchTier = "strong" | "likely" | "weak" | "none";

export interface MatchScore {
  /** 0–100 där 100 är en full träff på sport, klass och storlek. */
  score: number;
  tier: MatchTier;
  /** Kort etikett att visa på tävlingskortet. */
  label: string;
  /** En mening som förklarar rangordningen. */
  hint: string;
}

const TIER_LABEL: Record<MatchTier, string> = {
  strong: "Bra match",
  likely: "Nästan",
  weak: "Svag match",
  none: "Ingen match",
};

/** Räknar ut hur väl en tävling matchar hunden, för sortering och etikett. */
export function matchScore(comp: UnifiedCompetition, dog: DogProfile): MatchScore {
  const level = dog.sport === "agility" ? dog.agilityLevel : dog.hoopersLevel;
  if (comp.sport !== dog.sport) {
    return {
      score: 0,
      tier: "none",
      label: TIER_LABEL.none,
      hint: `Tävlingen är ${comp.sport} — din profil tävlar i ${dog.sport}.`,
    };
  }

  const result = matchCompetition(comp, dog);
  // Sport 40 p, klass upp till 45 p, storlek 15 p (alla storlekar tas emot).
  const classPoints = result.unknownClasses ? 15 : result.matchedClasses.length > 0 ? 45 : 0;
  const score = 40 + classPoints + 15;
  const tier: MatchTier = score >= 85 ? "strong" : score >= 65 ? "likely" : "weak";

  const hint = result.unknownClasses
    ? "Klasslistan är inte publicerad ännu — kan mycket väl passa."
    : result.matchedClasses.length > 0
      ? `${level} finns i tävlingen (${result.matchedClasses.join(", ")}).`
      : `${level} saknas bland klasserna.`;

  return { score, tier, label: TIER_LABEL[tier], hint };
}

/** Sorterar tävlingar efter matchstyrka, med datum som andrahandsordning. */
export function sortByMatchScore<T extends UnifiedCompetition>(
  list: T[],
  dog: DogProfile,
): T[] {
  return [...list].sort((a, b) => {
    const diff = matchScore(b, dog).score - matchScore(a, dog).score;
    if (diff !== 0) return diff;
    return (a.dateStart ?? "").localeCompare(b.dateStart ?? "");
  });
}
