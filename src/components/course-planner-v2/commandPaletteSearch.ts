/**
 * Ren logik för kommandopaletten: fuzzy-ranking + "senast använda".
 * Ligger i en egen modul så att den kan enhetstestas utan React.
 */

export interface SearchableCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords?: string[];
}

export const RECENT_KEY = "am-planner-command-history";
export const MAX_RECENT = 6;

export function readRecent(storage: Pick<Storage, "getItem"> | null = safeLocalStorage()): string[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

export function rememberCommand(
  id: string,
  current: string[],
  storage: Pick<Storage, "setItem"> | null = safeLocalStorage(),
): string[] {
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENT);
  try {
    storage?.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage kan vara avstängt */
  }
  return next;
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Liten fuzzy-ranking som premierar riktiga ordträffar men fortfarande låter
 * användaren skriva t.ex. "spdf" och hitta "Exportera startlista/PDF".
 * Returnerar null när kommandot inte matchar alls.
 */
export function scoreCommand(command: SearchableCommand, rawQuery: string): number | null {
  const query = rawQuery.trim().toLocaleLowerCase("sv-SE");
  if (!query) return 0;

  const label = command.label.toLocaleLowerCase("sv-SE");
  const hay = [command.label, command.hint || "", command.group, ...(command.keywords || [])]
    .join(" ")
    .toLocaleLowerCase("sv-SE");

  if (label === query) return 1000;
  if (label.startsWith(query)) return 900 - label.length * 0.01;
  const wordStart = hay.split(/\s+/).some((word) => word.startsWith(query));
  if (wordStart) return 780 - hay.length * 0.005;
  const exactAt = hay.indexOf(query);
  if (exactAt >= 0) return 650 - exactAt * 0.25;

  let cursor = 0;
  let first = -1;
  let last = -1;
  let gaps = 0;
  for (const char of query) {
    const found = hay.indexOf(char, cursor);
    if (found === -1) return null;
    if (first === -1) first = found;
    if (last >= 0) gaps += Math.max(0, found - last - 1);
    last = found;
    cursor = found + 1;
  }

  return 350 - first * 0.4 - gaps * 2;
}

/** Rankad filtrering: sortera fallande på score, kasta bort icke-träffar. */
export function rankCommands<T extends SearchableCommand>(commands: T[], query: string): T[] {
  const scored = commands
    .map((command) => ({ command, score: scoreCommand(command, query) }))
    .filter((item): item is { command: T; score: number } => item.score != null);
  if (query.trim()) {
    return scored.sort((a, b) => b.score - a.score).map((item) => item.command);
  }
  return scored.map((item) => item.command);
}
