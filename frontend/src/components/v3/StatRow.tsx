import type { DashboardStats } from "@/hooks/v3/useV3Dashboard";

interface Props {
  stats: DashboardStats | null;
}

const FALLBACK: DashboardStats = {
  sessionsThisWeek: 0,
  minutesThisWeek: 0,
  streakDays: 0,
  passedThisMonth: 0,
};

/**
 * Stat-block i Instrument Serif. Tabular nums. Lugn elevation.
 */
export function StatRow({ stats }: Props) {
  const s = stats ?? FALLBACK;
  const items: { label: string; value: string; sub: string }[] = [
    { label: "Pass", value: String(s.sessionsThisWeek), sub: "denna vecka" },
    { label: "Minuter", value: String(s.minutesThisWeek), sub: "denna vecka" },
    { label: "Streak", value: String(s.streakDays), sub: s.streakDays === 1 ? "dag" : "dagar" },
    { label: "Klarade lopp", value: String(s.passedThisMonth), sub: "denna månad" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 lg:p-5"
        >
          <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
            {it.label}
          </div>
          <div className="font-v3-display text-[36px] lg:text-[44px] leading-none mt-2 text-v3-text-primary tabular-nums">
            {it.value}
          </div>
          <div className="text-v3-xs text-v3-text-tertiary mt-1.5">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}
