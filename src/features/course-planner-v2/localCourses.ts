/**
 * Lokalt sparade banor (namngivna) i webbläsaren.
 *
 * Skiljer sig från autosparade utkastet: här ligger banor som användaren
 * uttryckligen har sparat via "Spara"/"Spara som…" i planeraren. Fungerar
 * utan inloggning.
 */

const KEY = "am_planner_local_courses";

export interface LocalCourse {
  id: string;
  name: string;
  sport: string;
  obstacleCount: number;
  updatedAt: string;
  /** Hela Draft-objektet som JSON. */
  data: unknown;
}

function readAll(): LocalCourse[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is LocalCourse => Boolean(c && c.id && c.data));
  } catch {
    return [];
  }
}

function writeAll(list: LocalCourse[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    /* localStorage kan vara fullt/avstängt */
  }
}

/** Alla lokalt sparade banor, senast ändrad först. */
export function listLocalCourses(): LocalCourse[] {
  return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getLocalCourse(id: string): LocalCourse | null {
  return readAll().find((c) => c.id === id) ?? null;
}

/** Spara (skapa eller uppdatera) en lokal bana. Returnerar dess id. */
export function saveLocalCourse(input: {
  id?: string | null;
  name: string;
  sport: string;
  obstacleCount: number;
  data: unknown;
}): string {
  const list = readAll();
  const id = input.id || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: LocalCourse = {
    id,
    name: input.name.trim() || "Namnlös bana",
    sport: input.sport,
    obstacleCount: input.obstacleCount,
    updatedAt: new Date().toISOString(),
    data: input.data,
  };
  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  writeAll(list);
  return id;
}

export function deleteLocalCourse(id: string) {
  writeAll(readAll().filter((c) => c.id !== id));
}
