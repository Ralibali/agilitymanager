/**
 * Sparar tävlingskalenderns filterval lokalt så de ligger kvar
 * när man byter flik eller startar om appen.
 */

export type SportFilterPref = "alla" | "agility" | "hoopers";

export interface CompetitionFilterPrefs {
  sport: SportFilterPref;
  county: string;
  onlyOpen: boolean;
  onlyFavorites: boolean;
  matchOn: boolean;
}

export const DEFAULT_FILTER_PREFS: CompetitionFilterPrefs = {
  sport: "alla",
  county: "alla",
  onlyOpen: false,
  onlyFavorites: false,
  matchOn: false,
};

const KEY = "am_competition_filters";
const EVENT = "am:competition-filters";

export function sanitizeFilterPrefs(raw: unknown): CompetitionFilterPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FILTER_PREFS };
  const v = raw as Partial<CompetitionFilterPrefs>;
  const sport: SportFilterPref =
    v.sport === "agility" || v.sport === "hoopers" || v.sport === "alla"
      ? v.sport
      : DEFAULT_FILTER_PREFS.sport;
  return {
    sport,
    county: typeof v.county === "string" && v.county ? v.county : DEFAULT_FILTER_PREFS.county,
    onlyOpen: v.onlyOpen === true,
    onlyFavorites: v.onlyFavorites === true,
    matchOn: v.matchOn === true,
  };
}

export function readFilterPrefs(): CompetitionFilterPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_FILTER_PREFS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return sanitizeFilterPrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_FILTER_PREFS };
  }
}

export function writeFilterPrefs(prefs: CompetitionFilterPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* lagring kan vara blockerad – filtren gäller ändå i sessionen */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}
