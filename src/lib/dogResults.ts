// ── Resultatlogg och meritlista per hund ───────────────────────────────────
import { useCallback, useEffect, useState } from "react";
import { AGILITY_LEVELS, HOOPERS_LEVELS } from "./dogMatch";

export type Discipline = "agility" | "hopp" | "hoopers";

export const DISCIPLINES: { value: Discipline; label: string }[] = [
  { value: "agility", label: "Agility" },
  { value: "hopp", label: "Hopp" },
  { value: "hoopers", label: "Hoopers" },
];

export function levelsFor(discipline: Discipline): readonly string[] {
  return discipline === "hoopers" ? HOOPERS_LEVELS : AGILITY_LEVELS;
}

/** Ett genomfört lopp. Föraren anger själv om loppet gav en merit (pinne). */
export interface RunResult {
  id: string;
  dogId: string;
  /** YYYY-MM-DD */
  date: string;
  competitionName: string;
  /** Nyckel till tävlingen i kalendern när loppet loggades därifrån. */
  competitionKey?: string;
  discipline: Discipline;
  level: string;
  faults: number | null;
  disqualified: boolean;
  timeSec: number | null;
  placement: number | null;
  starters: number | null;
  merit: boolean;
  judge?: string;
  notes?: string;
  /** Tidpunkt (ms) när loppet sparades — avgör ordningen samma dag. */
  updatedAt: number;
}

export interface ResultStore {
  results: RunResult[];
  /** Antal meriter som krävs för uppflyttning. Kontrollera mot aktuellt regelverk. */
  meritTarget: number;
}

export const DEFAULT_MERIT_TARGET = 3;
export const MAX_RESULTS = 2000;
const MAX_TEXT = 200;
const MAX_NOTES = 1000;

const STORE_KEY = "am_dog_results";
export const RESULTS_EVENT = "am:dog-results";

export function emptyResultStore(): ResultStore {
  return { results: [], meritTarget: DEFAULT_MERIT_TARGET };
}

export function newResultId(): string {
  return `run_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Ett lopp är felfritt när det saknar fel och inte blev diskat. */
export function isClean(run: Pick<RunResult, "faults" | "disqualified">): boolean {
  return !run.disqualified && run.faults === 0;
}

function num(value: unknown, { min = 0, max = 100000, int = false } = {}): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return int ? Math.round(n) : Math.round(n * 100) / 100;
}

function text(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rensar upp ett lopp från lagring eller konto. Ogiltiga lopp ger null. */
export function sanitizeResult(raw: unknown): RunResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id, 64);
  const dogId = text(r.dogId, 64);
  const date = text(r.date, 10);
  if (!id || !dogId || !DATE_RE.test(date)) return null;
  const discipline: Discipline = DISCIPLINES.some((d) => d.value === r.discipline)
    ? (r.discipline as Discipline)
    : "agility";
  const levels = levelsFor(discipline);
  const level = levels.includes(r.level as string) ? (r.level as string) : levels[1];
  const judge = text(r.judge);
  const notes = text(r.notes, MAX_NOTES);
  const competitionKey = text(r.competitionKey, 120);
  return {
    id,
    dogId,
    date,
    competitionName: text(r.competitionName) || "Tävling",
    ...(competitionKey ? { competitionKey } : {}),
    discipline,
    level,
    faults: num(r.faults, { max: 100, int: true }),
    disqualified: r.disqualified === true,
    timeSec: num(r.timeSec, { max: 1000 }),
    placement: num(r.placement, { min: 1, max: 1000, int: true }),
    starters: num(r.starters, { min: 1, max: 1000, int: true }),
    merit: r.merit === true,
    ...(judge ? { judge } : {}),
    ...(notes ? { notes } : {}),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

export function sanitizeResultStore(raw: unknown): ResultStore | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<ResultStore>;
  if (!Array.isArray(value.results)) return null;
  const results = value.results
    .map(sanitizeResult)
    .filter((r): r is RunResult => r !== null)
    .slice(0, MAX_RESULTS);
  const target = num(value.meritTarget, { min: 1, max: 20, int: true }) ?? DEFAULT_MERIT_TARGET;
  return { results: sortResults(results), meritTarget: target };
}

/** Nyaste loppet först. */
export function sortResults(results: RunResult[]): RunResult[] {
  return [...results].sort((x, y) => y.date.localeCompare(x.date) || y.updatedAt - x.updatedAt);
}

export function upsertResult(store: ResultStore, run: RunResult, now = Date.now()): ResultStore {
  const stamped = { ...run, updatedAt: now };
  const others = store.results.filter((r) => r.id !== run.id);
  return { ...store, results: sortResults([stamped, ...others]).slice(0, MAX_RESULTS) };
}

export function removeResult(store: ResultStore, id: string): ResultStore {
  return { ...store, results: store.results.filter((r) => r.id !== id) };
}

// ── Statistik ──────────────────────────────────────────────────────────────

export interface DogStats {
  starts: number;
  clean: number;
  /** Andel felfria lopp, 0–1. null utan starter. */
  cleanRate: number | null;
  disqualified: number;
  wins: number;
  podiums: number;
  merits: number;
  /** Snabbaste felfria tid per disciplin och klass. */
  bestCleanTime: Record<string, number>;
}

export function statsFor(results: RunResult[]): DogStats {
  const starts = results.length;
  const clean = results.filter(isClean).length;
  const bestCleanTime: Record<string, number> = {};
  for (const r of results) {
    if (!isClean(r) || r.timeSec === null) continue;
    const key = `${r.discipline}|${r.level}`;
    if (bestCleanTime[key] === undefined || r.timeSec < bestCleanTime[key]) {
      bestCleanTime[key] = r.timeSec;
    }
  }
  return {
    starts,
    clean,
    cleanRate: starts ? clean / starts : null,
    disqualified: results.filter((r) => r.disqualified).length,
    wins: results.filter((r) => r.placement === 1).length,
    podiums: results.filter((r) => r.placement !== null && r.placement <= 3).length,
    merits: results.filter((r) => r.merit).length,
    bestCleanTime,
  };
}

export interface MeritProgress {
  discipline: Discipline;
  level: string;
  merits: number;
  target: number;
  /** Sant när målet för uppflyttning är nått. */
  reached: boolean;
}

/**
 * Meriter per disciplin och klass, i klassordning. Nollklass och högsta
 * klassen saknar uppflyttning och visas därför inte.
 */
export function meritProgress(results: RunResult[], target: number): MeritProgress[] {
  const out: MeritProgress[] = [];
  for (const { value: discipline } of DISCIPLINES) {
    const levels = levelsFor(discipline);
    const promotable = levels.slice(1, -1);
    for (const level of promotable) {
      const runs = results.filter((r) => r.discipline === discipline && r.level === level);
      if (runs.length === 0) continue;
      const merits = runs.filter((r) => r.merit).length;
      out.push({ discipline, level, merits, target, reached: merits >= target });
    }
  }
  return out;
}

/** Svenskt ordningstal: 1:a, 2:a, 3:e, 11:e, 21:a … */
export function ordinal(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  return `${n}:${(last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? "a" : "e"}`;
}

/** Nästa klass efter den angivna, eller null om det är högsta klassen. */
export function nextLevel(discipline: Discipline, level: string): string | null {
  const levels = levelsFor(discipline);
  const i = levels.indexOf(level);
  return i >= 0 && i < levels.length - 1 ? levels[i + 1] : null;
}

// ── Lokal lagring ──────────────────────────────────────────────────────────

export function readResultStore(): ResultStore {
  if (typeof window === "undefined") return emptyResultStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return sanitizeResultStore(raw ? JSON.parse(raw) : null) ?? emptyResultStore();
  } catch {
    return emptyResultStore();
  }
}

export function writeResultStore(store: ResultStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* lagring kan vara blockerad – loggen fungerar ändå i sessionen */
  }
  window.dispatchEvent(new CustomEvent(RESULTS_EVENT));
}

/** Resultatloggen, sparad lokalt i webbläsaren — inget konto krävs. */
export function useDogResults() {
  const [store, setStore] = useState<ResultStore>(emptyResultStore);

  useEffect(() => {
    const sync = () => setStore(readResultStore());
    queueMicrotask(sync);
    window.addEventListener(RESULTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RESULTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = useCallback((next: ResultStore) => {
    setStore(next);
    writeResultStore(next);
  }, []);

  const save = useCallback((run: RunResult) => commit(upsertResult(readResultStore(), run)), [commit]);
  const remove = useCallback((id: string) => commit(removeResult(readResultStore(), id)), [commit]);
  const setMeritTarget = useCallback(
    (meritTarget: number) => commit({ ...readResultStore(), meritTarget }),
    [commit],
  );

  return { store, save, remove, setMeritTarget };
}
