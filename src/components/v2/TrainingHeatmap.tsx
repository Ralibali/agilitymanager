import { useMemo } from "react";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import type { TrainingSession } from "@/types";
import { DSCard } from "@/components/ds";

interface TrainingHeatmapProps {
  sessions: TrainingSession[];
  weeks?: number;
}

/**
 * GitHub-stil aktivitetsheatmap. Visar antal pass per dag i ett rutnät över X veckor.
 */
export function TrainingHeatmap({ sessions, weeks = 12 }: TrainingHeatmapProps) {
  const grid = useMemo(() => {
    const today = new Date();
    const firstDay = startOfWeek(addDays(today, -7 * (weeks - 1)), { weekStartsOn: 1 });
    const days: { date: Date; count: number }[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(firstDay, i);
      const count = sessions.filter((s) => isSameDay(new Date(s.date), d)).length;
      days.push({ date: d, count });
    }
    // Group by week (columns)
    const cols: { date: Date; count: number }[][] = [];
    for (let w = 0; w < weeks; w++) {
      cols.push(days.slice(w * 7, w * 7 + 7));
    }
    return cols;
  }, [sessions, weeks]);

  const intensity = (count: number) => {
    if (count === 0) return "bg-subtle";
    if (count === 1) return "bg-brand-500/30";
    if (count === 2) return "bg-brand-500/55";
    if (count === 3) return "bg-brand-500/80";
    return "bg-brand-500";
  };

  const totalSessions = grid.flat().reduce((s, d) => s + d.count, 0);
  const activeDays = grid.flat().filter((d) => d.count > 0).length;

  return (
    <DSCard>
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-h2 text-text-primary">Aktivitet</h2>
          <p className="text-small text-text-tertiary mt-0.5">
            Senaste {weeks} veckorna · {totalSessions} pass · {activeDays} aktiva dagar
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-micro text-text-tertiary">
          <span>Mindre</span>
          <span className="w-3 h-3 rounded-sm bg-subtle" />
          <span className="w-3 h-3 rounded-sm bg-brand-500/30" />
          <span className="w-3 h-3 rounded-sm bg-brand-500/55" />
          <span className="w-3 h-3 rounded-sm bg-brand-500/80" />
          <span className="w-3 h-3 rounded-sm bg-brand-500" />
          <span>Mer</span>
        </div>
      </header>
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3.5 h-3.5 rounded-sm ${intensity(day.count)}`}
                  title={`${format(day.date, "EEEE d MMM yyyy", { locale: sv })} · ${day.count} pass`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </DSCard>
  );
}
