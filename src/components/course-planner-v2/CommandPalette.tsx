import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock3, Search } from "lucide-react";

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords?: string[];
  shortcut?: string[];
  icon?: React.ReactNode;
  run: () => void;
};

const RECENT_KEY = "am-planner-command-history";
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function rememberCommand(id: string, current: string[]): string[] {
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* localStorage kan vara avstängt */ }
  return next;
}

/**
 * Liten fuzzy-ranking som premierar riktiga ordträffar men fortfarande låter
 * användaren skriva t.ex. "spdf" och hitta "Exportera startlista/PDF".
 */
function scoreCommand(command: PaletteCommand, rawQuery: string): number | null {
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

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commands: PaletteCommand[];
}) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => {
    const scored = commands
      .map((command) => ({ command, score: scoreCommand(command, query) }))
      .filter((item): item is { command: PaletteCommand; score: number } => item.score != null);

    if (query.trim()) {
      return scored.sort((a, b) => b.score - a.score).map((item) => item.command);
    }
    return scored.map((item) => item.command);
  }, [query, commands]);

  const recentCommands = useMemo(() => {
    if (query.trim()) return [];
    return recentIds
      .map((id) => commands.find((command) => command.id === id))
      .filter((command): command is PaletteCommand => !!command);
  }, [commands, query, recentIds]);

  const recentSet = useMemo(() => new Set(recentCommands.map((c) => c.id)), [recentCommands]);
  const regularCommands = useMemo(
    () => (query.trim() ? ranked : ranked.filter((command) => !recentSet.has(command.id))),
    [query, ranked, recentSet],
  );

  const flattened = useMemo(() => [...recentCommands, ...regularCommands], [recentCommands, regularCommands]);

  // Reset när paletten öppnas.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const execute = (command: PaletteCommand) => {
    setRecentIds((current) => rememberCommand(command.id, current));
    onOpenChange(false);
    // Låt dialogen stänga innan kommandot eventuellt öppnar en annan dialog.
    setTimeout(() => command.run(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, flattened.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const command = flattened[activeIdx];
      if (command) execute(command);
    }
  };

  const grouped = useMemo(() => {
    const groups: { group: string; items: { cmd: PaletteCommand; idx: number }[]; recent?: boolean }[] = [];
    let offset = 0;

    if (recentCommands.length) {
      groups.push({
        group: "Senast använda",
        recent: true,
        items: recentCommands.map((cmd, idx) => ({ cmd, idx })),
      });
      offset = recentCommands.length;
    }

    const map = new Map<string, { cmd: PaletteCommand; idx: number }[]>();
    regularCommands.forEach((cmd, localIdx) => {
      if (!map.has(cmd.group)) map.set(cmd.group, []);
      map.get(cmd.group)!.push({ cmd, idx: offset + localIdx });
    });
    for (const [group, items] of map) groups.push({ group, items });
    return groups;
  }, [recentCommands, regularCommands]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl gap-0 overflow-hidden border-2 border-ink bg-paper p-0 shadow-hard [&>button.absolute]:hidden"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(false);
        }}
      >
        <div className="flex items-center gap-2 border-b-2 border-ink/10 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-forest" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Sök kommando… t.ex. spara, PDF, 3D, rutnät"
            className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-ink/35"
            aria-label="Sök kommando"
          />
          <kbd className="hidden items-center rounded-lg border border-ink/15 bg-cream px-1.5 py-0.5 font-mono text-[10px] text-ink/50 sm:inline-flex">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[62vh] overflow-y-auto py-2">
          {flattened.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-bold text-ink">Inga kommandon matchade “{query}”</p>
              <p className="mt-1 text-xs text-ink/45">Prova ett funktionsnamn som spara, exportera, zoom eller 3D.</p>
            </div>
          ) : (
            grouped.map(({ group, items, recent }) => (
              <div key={group} className="mb-1">
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-ink/40">
                  {recent && <Clock3 className="h-3 w-3" />}
                  {group}
                </div>
                {items.map(({ cmd, idx }) => (
                  <button
                    key={`${group}-${cmd.id}`}
                    data-cmd-idx={idx}
                    onClick={() => execute(cmd)}
                    onMouseMove={() => setActiveIdx(idx)}
                    className={[
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      idx === activeIdx
                        ? "bg-tang/20 text-ink"
                        : "text-ink/80 hover:bg-cream/70",
                    ].join(" ")}
                  >
                    {cmd.icon && (
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${idx === activeIdx ? "bg-tang text-ink" : "bg-cream text-ink/55"}`}>
                        {cmd.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{cmd.label}</div>
                      {cmd.hint && <div className="truncate text-xs text-ink/45">{cmd.hint}</div>}
                    </div>
                    {cmd.shortcut && (
                      <span className="flex shrink-0 items-center gap-1">
                        {cmd.shortcut.map((key, i) => (
                          <kbd
                            key={`${key}-${i}`}
                            className="inline-flex items-center rounded-md border border-ink/15 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink/45"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t-2 border-ink/10 px-4 py-2 text-[10px] font-semibold text-ink/45">
          <span className="flex items-center gap-1.5"><kbd className="rounded border border-ink/15 bg-cream px-1 py-0.5 font-mono">↑↓</kbd> navigera</span>
          <span className="flex items-center gap-1.5"><kbd className="rounded border border-ink/15 bg-cream px-1 py-0.5 font-mono">↵</kbd> kör</span>
          <span>{flattened.length} kommandon</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
