import { useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Play, Clock3, Package, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { recommendDailyPlan, swapRecommendation, type FocusArea, type RecSport, type Recommendation } from "@/lib/trainingRecommendations";
import { trackGrowthEvent } from "@/lib/growth";

interface Props {
  sport: RecSport;
  focus: FocusArea[];
  dogName: string;
  recentSessions?: React.ComponentProps<"div"> extends never ? never : Parameters<typeof recommendDailyPlan>[0]["recentSessions"];
  onStart: (rec: Recommendation) => void;
  onLog: (rec: Recommendation) => void;
}

/**
 * "Dagens pass" — det visuellt dominanta kortet överst på dashboarden.
 * Kärnkomponent i aktiveringsflödet: konkret nästa steg, inte fluff.
 */
export function DagensPassCard({ sport, focus, dogName, recentSessions, onStart, onLog }: Props) {
  const [variant, setVariant] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [viewed, setViewed] = useState(false);

  const rec = useMemo(
    () => recommendDailyPlan({ sport, focus, recentSessions, variant }),
    [sport, focus, recentSessions, variant],
  );

  // Tracka första gången kortet visas per session.
  useMemo(() => {
    if (!viewed) {
      trackGrowthEvent("starter_plan_viewed", {
        focus: rec.focusKey,
        sport,
        recommendation_id: rec.id,
      });
      setViewed(true);
    }
  }, [viewed, rec.focusKey, rec.id, sport]);

  const handleStart = () => {
    trackGrowthEvent("daily_plan_started", { recommendation_id: rec.id, focus: rec.focusKey });
    onStart(rec);
  };

  const handleSwap = () => {
    trackGrowthEvent("daily_plan_swapped", { from: rec.id, variant: variant + 1 });
    setVariant((v) => v + 1);
    swapRecommendation(rec, { sport, focus, recentSessions, variant: variant + 1 });
  };

  const handleLog = () => {
    trackGrowthEvent("daily_plan_log_clicked", { recommendation_id: rec.id });
    onLog(rec);
  };

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-v3-brand-500/20 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--v3-brand-500)/0.14),transparent_45%),linear-gradient(135deg,hsl(var(--v3-canvas-elevated))_0%,hsl(var(--v3-canvas))_100%)] p-5 shadow-v3-lg sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-v3-brand-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-v3-brand-700">
          Dagens pass
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-sunken/50 px-3 py-1 text-xs font-semibold text-v3-text-secondary">
          <Clock3 size={13} /> {rec.minutes} min
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-sunken/50 px-3 py-1 text-xs font-semibold text-v3-text-secondary">
          Fokus: {rec.focusLabel}
        </span>
      </div>

      <h2 className="mt-4 font-v3-display text-[clamp(1.75rem,3.4vw,2.4rem)] leading-[1.05] tracking-[-0.03em] text-v3-text-primary">
        {rec.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-v3-text-secondary sm:text-base">
        För {dogName}. {rec.why}
      </p>

      <div className="mt-5 grid gap-3">
        {rec.steps.slice(0, showAll ? 3 : 1).map((step, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas-elevated/70 p-3 sm:p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-v3-brand-500 text-sm font-black text-v3-text-inverse">
              {i + 1}
            </span>
            <p className="text-sm leading-6 text-v3-text-primary sm:text-[15px]">{step}</p>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-v3-brand-700 hover:text-v3-brand-800"
        >
          {showAll ? (
            <>Visa mindre <ChevronUp size={15} /></>
          ) : (
            <>Visa alla 3 steg <ChevronDown size={15} /></>
          )}
        </button>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-dashed border-v3-canvas-sunken/70 bg-v3-canvas/40 p-3 text-xs text-v3-text-secondary sm:text-sm">
        <Package size={15} className="mt-0.5 shrink-0" />
        <span>{rec.equipment.join(" · ")}</span>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={handleStart}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-v3-brand-500 px-5 text-sm font-extrabold text-v3-text-inverse shadow-v3-brand transition hover:-translate-y-0.5 hover:bg-v3-brand-600 sm:flex-none sm:min-w-[220px]"
        >
          <Play size={17} strokeWidth={2.4} /> Starta passet
        </button>
        <button
          onClick={handleLog}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas-elevated px-5 text-sm font-bold text-v3-text-primary transition hover:bg-v3-canvas-sunken/40"
        >
          Logga passet <ArrowRight size={15} />
        </button>
        <button
          onClick={handleSwap}
          className={cn(
            "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas-elevated px-4 text-sm font-bold text-v3-text-secondary transition hover:bg-v3-canvas-sunken/40",
          )}
          aria-label="Byt övning"
        >
          <RefreshCw size={15} /> Byt övning
        </button>
      </div>

      <p className="mt-3 text-xs text-v3-text-tertiary">
        Alternativ på tuffa dagar: <span className="font-semibold text-v3-text-secondary">{rec.alternative.title}</span> ({rec.alternative.minutes} min) — {rec.alternative.why}
      </p>
    </article>
  );
}
