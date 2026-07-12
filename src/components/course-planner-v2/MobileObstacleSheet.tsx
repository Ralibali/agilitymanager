import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ObstacleDefV2, ObstacleTypeV2, Sport } from "@/features/course-planner-v2/config";
import { OBSTACLES_V2 } from "@/features/course-planner-v2/config";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport: Sport;
  onPick: (type: ObstacleTypeV2) => void;
}

/**
 * Mobil-först bottom sheet för att välja hinder. Kategoriserad palett med
 * stora touch-ytor (min 56px). Ett tryck lägger till hindret och stänger
 * arket så användaren direkt kan placera/dra det.
 */
export function MobileObstacleSheet({ open, onOpenChange, sport, onPick }: Props) {
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const list = OBSTACLES_V2.filter((o) => o.sport.includes(sport));
    const filtered = q.trim()
      ? list.filter((o) =>
          (o.label + " " + o.description + " " + o.category)
            .toLowerCase()
            .includes(q.trim().toLowerCase()),
        )
      : list;
    const map = new Map<string, ObstacleDefV2[]>();
    for (const o of filtered) {
      const arr = map.get(o.category) ?? [];
      arr.push(o);
      map.set(o.category, arr);
    }
    return Array.from(map.entries());
  }, [q, sport]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)]">
        <SheetHeader className="text-left">
          <SheetTitle>Lägg till hinder</SheetTitle>
        </SheetHeader>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sök hinder…"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-[15px] outline-none focus:border-primary/50"
            aria-label="Sök hinder"
          />
        </div>
        <div className="mt-4 space-y-4">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground">Inga hinder matchar sökningen.</p>
          )}
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {cat}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {items.map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => {
                      onPick(def.type);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "min-h-16 rounded-xl border border-border bg-card p-2 text-left",
                      "hover:border-primary/40 hover:bg-muted transition-colors active:scale-[0.97]",
                    )}
                  >
                    <span className="block text-[11px] font-semibold text-foreground">
                      {def.label}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[10px] text-muted-foreground">
                      {def.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileObstacleSheet;
