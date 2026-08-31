/**
 * Lokalt sparade banor (namngivna) i webbläsaren.
 *
 * Skiljer sig från autosparade utkastet: här ligger banor som användaren
 * uttryckligen har sparat via "Spara"/"Spara som…" i planeraren. Fungerar
 * utan inloggning.
 *
 * Härdning: allt som läses från localStorage behandlas som opålitligt —
 * poster valideras/saniteras vid inläsning, namn längdbegränsas och
 * styrtecken tas bort, och skrivningar evictar äldsta posterna om
 * lagringskvoten annars skulle sprängas.
 */

const KEY = "am_planner_local_courses";
const MAX_LOCAL_COURSES = 60;
const MAX_NAME_CHARS = 120;
const MAX_ID_CHARS = 64;
const MAX_SPORT_CHARS = 30;
/** Målstorlek för hela lagringen (~3,5 MB) — under de flesta kvoter på 5 MB. */
const MAX_STORAGE_CHARS = 3_500_000;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;

export interface LocalCourse {
  id: string;
  name: string;
  sport: string;
  obstacleCount: number;
  updatedAt: string;
  /** Hela Draft-objektet som JSON. */
  data: unknown;
}

function cleanText(v: unknown, max: number, fallback = ""): string {
  if (typeof v !== "string") return fallback;
  const cleaned = v.replace(CONTROL_CHARS_RE, "").trim().slice(0, max);
  return cleaned || fallback;
}

function cleanCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0;
}

/** Validerar/saniterar en lagrad post. Returnerar null om posten är obrukbar. */
function sanitizeEntry(raw: unknown): LocalCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const id = cleanText(c.id, MAX_ID_CHARS);
  if (!id) return null;
  if (c.data === null || typeof c.data !== "object") return null;
  return {
    id,
    name: cleanText(c.name, MAX_NAME_CHARS, "Namnlös bana"),
    sport: cleanText(c.sport, MAX_SPORT_CHARS, "agility"),
    obstacleCount: cleanCount(c.obstacleCount),
    updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : "",
    data: c.data,
  };
}

function readAll(): LocalCourse[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeEntry)
      .filter((c): c is LocalCourse => c !== null);
  } catch {
    return [];
  }
}

function writeAll(list: LocalCourse[]) {
  try {
    let trimmed = list.slice(0, MAX_LOCAL_COURSES);
    let text = JSON.stringify(trimmed);
    // Evicta äldsta poster tills vi får plats (eller listan är tom).
    while (trimmed.length > 1 && text.length > MAX_STORAGE_CHARS) {
      trimmed = trimmed.slice(0, trimmed.length - 1);
      text = JSON.stringify(trimmed);
    }
    if (text.length <= MAX_STORAGE_CHARS) {
      localStorage.setItem(KEY, text);
    }
    // Annars: posten är ensam för stor — behåll tidigare lagring orörd.
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
  const id = cleanText(input.id, MAX_ID_CHARS) || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: LocalCourse = {
    id,
    name: cleanText(input.name, MAX_NAME_CHARS, "Namnlös bana"),
    sport: cleanText(input.sport, MAX_SPORT_CHARS, "agility"),
    obstacleCount: cleanCount(input.obstacleCount),
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
