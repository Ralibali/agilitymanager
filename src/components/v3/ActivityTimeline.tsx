import { Dumbbell, Trophy, Target, Heart } from "lucide-react";
import type { TimelineEntry } from "@/hooks/v3/useV3Dashboard";
import { cn } from "@/lib/utils";

interface Props {
  entries: TimelineEntry[];
  loading?: boolean;
}

const ICON_BY_KIND = {
  training: Dumbbell,
  result: Trophy,
  goal: Target,
  health: Heart,
} as const;

const ACCENT_BG: Record<TimelineEntry["accent"], string> = {
  traning: "bg-v3-accent-traning/12 text-v3-accent-traning",
  tavlings: "bg-v3-accent-tavlings/12 text-v3-accent-tavlings",
  prestation: "bg-v3-accent-prestation/12 text-v3-accent-prestation",
  halsa: "bg-v3-accent-halsa/12 text-v3-accent-halsa",
};

const WEEKDAY = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  if (days < 7) return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
}

/**
 * Tunn vertikal linje + cirkulär markör per typ.
 */
export function ActivityTimeline({ entries, loading }: Props) {
  return (
    <section aria-label="Aktivitet" className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Senast</h2>
        <span className="text-v3-xs text-v3-text-tertiary">
          {entries.length > 0 ? `${entries.length} händelser` : ""}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-v3-lg bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-6 text-center">
          <p className="text-v3-base text-v3-text-secondary">
            Inget loggat än för den här hunden.
          </p>
          <p className="text-v3-sm text-v3-text-tertiary mt-1">
            Tryck på + längst ner för att logga ditt första pass.
          </p>
        </div>
      ) : (
        <ol className="relative">
          {/* vertikal linje */}
          <span
            aria-hidden
            className="absolute left-[15px] top-2 bottom-2 w-px bg-v3-canvas-sunken"
          />
          {entries.map((e) => {
            const Icon = ICON_BY_KIND[e.kind];
            return (
              <li key={e.id} className="relative pl-10 py-2.5">
                <span
                  className={cn(
                    "absolute left-0 top-3 h-8 w-8 rounded-full grid place-items-center ring-4 ring-v3-canvas",
                    ACCENT_BG[e.accent],
                  )}
                >
                  <Icon size={14} strokeWidth={1.8} />
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-v3-base text-v3-text-primary truncate">{e.title}</p>
                  <span className="text-v3-xs text-v3-text-tertiary shrink-0">
                    {formatDay(e.date)}
                  </span>
                </div>
                <p className="text-v3-sm text-v3-text-secondary mt-0.5 truncate">
                  {e.subtitle}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
