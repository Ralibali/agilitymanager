import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search } from 'lucide-react';

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

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commands: PaletteCommand[];
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = [c.label, c.hint || '', c.group, ...(c.keywords || [])].join(' ').toLowerCase();
      // Simple fuzzy: every char of query must exist in order
      let idx = 0;
      for (const ch of q) {
        const found = hay.indexOf(ch, idx);
        if (found === -1) return false;
        idx = found + 1;
      }
      return true;
    });
  }, [query, commands]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd) {
        onOpenChange(false);
        // Defer so dialog closes first
        setTimeout(() => cmd.run(), 0);
      }
    }
  };

  // Group by section for display
  const grouped = useMemo(() => {
    const map = new Map<string, { cmd: PaletteCommand; idx: number }[]>();
    filtered.forEach((c, idx) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push({ cmd: c, idx });
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden [&>button.absolute]:hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Sök kommando... (t.ex. 'spara', 'pdf', 'slalom')"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            aria-label="Sök kommando"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Inga kommandon matchade "{query}".
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {group}
                </div>
                {items.map(({ cmd, idx }) => (
                  <button
                    key={cmd.id}
                    data-cmd-idx={idx}
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => cmd.run(), 0);
                    }}
                    onMouseMove={() => setActiveIdx(idx)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                      idx === activeIdx
                        ? 'bg-primary/10 text-foreground'
                        : 'text-foreground hover:bg-muted/50',
                    ].join(' ')}
                  >
                    {cmd.icon && <span className="flex-shrink-0 text-muted-foreground">{cmd.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{cmd.label}</div>
                      {cmd.hint && (
                        <div className="text-xs text-muted-foreground truncate">{cmd.hint}</div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {cmd.shortcut.map((k, i) => (
                          <kbd
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground"
                          >
                            {k}
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

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↑↓</kbd>
            navigera
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↵</kbd>
            välj
          </span>
          <span>{filtered.length} kommandon</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
