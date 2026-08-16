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

// ── Lokal lagring av hundprofilen ──────────────────────────────────────────

const STORAGE_KEY = "am_match_dog_profile";
const EVENT = "am:dog-profile";

export function readDogProfile(): DogProfile {
  if (typeof window === "undefined") return DEFAULT_DOG_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DOG_PROFILE;
    const parsed = JSON.parse(raw) as Partial<DogProfile>;
    return { ...DEFAULT_DOG_PROFILE, ...parsed };
  } catch {
    return DEFAULT_DOG_PROFILE;
  }
}

export function writeDogProfile(profile: DogProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* lagring kan vara blockerad – matchningen fungerar ändå i sessionen */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Hundprofil som sparas lokalt i webbläsaren, inget konto krävs. */
export function useDogProfile() {
  const [profile, setProfile] = useState<DogProfile>(DEFAULT_DOG_PROFILE);

  useEffect(() => {
    setProfile(readDogProfile());
    const sync = () => setProfile(readDogProfile());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<DogProfile>) => {
    const next = { ...readDogProfile(), ...patch };
    writeDogProfile(next);
    setProfile(next);
  }, []);

  return { profile, update };
}
