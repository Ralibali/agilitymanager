import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Play, Clock3, Package, ChevronDown, ChevronUp, X, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  recommendDailyPlan,
  type FocusArea,
  type RecSport,
  type TrainingRecommendation,
  type TrainingSessionSummary,
} from "@/lib/trainingRecommendations";
import { trackGrowthEvent } from "@/lib/growth";

interface Props {
  sport: RecSport;
  focus: FocusArea[];
  dogName: string;
  recentSessions?: TrainingSessionSummary[];
  onStart: (rec: TrainingRecommendation) => void;
  onLog: (rec: TrainingRecommendation) => void;
}

/**
 * "Dagens pass" — det visuellt dominanta kortet överst på dashboarden.
 * Kärnkomponent i aktiveringsflödet: konkret nästa steg, inte fluff.
 *
 * När användaren klickar "Starta passet" öppnas ett lokalt passläge direkt
 * i kortet: en fokuserad vy med de tre stegen och en enkel bock-per-steg.
 * Ingen ny databas involverad. När passet markeras som klart öppnas den
 * riktiga loggnings-sheeten med rekommendationens defaults.
 */
export function DagensPassCard({ sport, focus, dogName, recentSessions, onStart, onLog }: Props) {
  const [variant, setVariant] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [runMode, setRunMode] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [showAlternative, setShowAlternative] = useState(false);

  const rec = useMemo<TrainingRecommendation>(
    () => recommendDailyPlan({ sport, focus, recentSessions, variant }),
    [sport, focus, recentSessions, variant],
  );

  // Tracka första gången kortet visas.
  useEffect(() => {
    trackGrowthEvent("daily_plan_viewed", {
      focus: rec.focus,
      sport,
      recommendation_id: rec.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.id, sport]);

  const handleStart = () => {
    trackGrowthEvent("daily_plan_started", { recommendation_id: rec.id, focus: rec.focus });
    setDoneSteps(new Set());
    setRunMode(true);
    onStart(rec);
  };

  const handleSwap = () => {
    setVariant((v) => {
      const next = v + 1;
      trackGrowthEvent("daily_plan_swapped", { from: rec.id, variant: next });
      return next;
    });
  };

  const handleLog = () => {
    trackGrowthEvent("daily_plan_log_clicked", { recommendation_id: rec.id });
    onLog(rec);
  };

  const handleFinishRun = () => {
    trackGrowthEvent("daily_plan_completed_run", { recommendation_id: rec.id });
    setRunMode(false);
    onLog(rec);
  };

  const toggleStep = (i: number) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-v3-brand-500/20 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--v3-brand-500)/0.14),transparent_45%),linear-gradient(135deg,hsl(var(--v3-canvas-elevated))_0%,hsl(var(--v3-canvas))_100%)] p-5 shadow-v3-lg sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-v3-brand-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-v3-brand-700">
          Dagens pass
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-sunken/50 px-3 py-1 text-xs font-semibold text-v3-text-secondary">
          <Clock3 size={13} /> {rec.durationMinutes} min
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-sunken/50 px-3 py-1 text-xs font-semibold text-v3-text-secondary">
          Fokus: {rec.focusLabel}
        </span>
      </div>

      <h2 className="mt-4 font-v3-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.05] tracking-[-0.03em] text-v3-text-primary">
        {rec.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-v3-text-secondary sm:text-base">
        För {dogName}. {rec.reason}
      </p>

      {/* Steg-lista — normalt läge visar första steget, expanderbar. */}
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
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-v3-brand-700 hover:text-v3-brand-800"
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
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas-elevated px-4 text-sm font-bold text-v3-text-secondary transition hover:bg-v3-canvas-sunken/40"
          aria-label="Byt övning"
        >
          <RefreshCw size={15} /> Byt övning
        </button>
      </div>

      {/* Lättare variant — hopfällbar, visar egna steg + utrustning. */}
      <div className="mt-4">
        {showAlternative ? (
          <div className="rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-v3-text-tertiary">
                  Lättare variant
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-v3-canvas-elevated px-2.5 py-0.5 text-[11px] font-semibold text-v3-text-secondary">
                  <Clock3 size={11} /> {rec.easierAlternative.durationMinutes} min
                </span>
              </div>
              <button
                onClick={() => setShowAlternative(false)}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/40"
                aria-label="Dölj lättare variant"
              >
                <X size={14} />
              </button>
            </div>
            <h4 className="mt-2 font-v3-display text-lg text-v3-text-primary">{rec.easierAlternative.title}</h4>
            <p className="mt-1 text-sm leading-6 text-v3-text-secondary">{rec.easierAlternative.reason}</p>
            <ol className="mt-3 space-y-2">
              {rec.easierAlternative.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-v3-text-primary">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-v3-brand-500/15 text-[11px] font-black text-v3-brand-700">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-v3-canvas-sunken/70 bg-v3-canvas-elevated/60 p-2.5 text-xs text-v3-text-secondary">
              <Package size={13} className="mt-0.5 shrink-0" />
              <span>{rec.easierAlternative.equipment.join(" · ")}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAlternative(true)}
            className="text-xs font-semibold text-v3-text-secondary underline underline-offset-4 hover:text-v3-text-primary"
          >
            Visa lättare variant för tuffa dagar
          </button>
        )}
      </div>

      {/* Passläge – overlay ovanpå kortet. */}
      {runMode && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 flex flex-col bg-v3-canvas-elevated/95 backdrop-blur-sm p-5 sm:p-7 rounded-[2rem] animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-brand-700">Passläge</p>
              <h3 className="mt-1 font-v3-display text-2xl leading-tight text-v3-text-primary">{rec.title}</h3>
              <p className="mt-1 text-xs text-v3-text-secondary">
                Fokus: {rec.focusLabel} · {rec.durationMinutes} min
              </p>
            </div>
            <button
              onClick={() => setRunMode(false)}
              aria-label="Stäng passläge"
              className="min-h-11 min-w-11 grid place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/40 hover:text-v3-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          <ol className="mt-5 flex-1 space-y-3 overflow-y-auto">
            {rec.steps.map((step, i) => {
              const done = doneSteps.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggleStep(i)}
                    aria-pressed={done}
                    className={cn(
                      "w-full min-h-14 flex items-start gap-3 rounded-2xl border p-3 text-left transition",
                      done
                        ? "border-v3-brand-500/40 bg-v3-brand-500/10"
                        : "border-v3-canvas-sunken/60 bg-v3-canvas/60 hover:bg-v3-canvas-sunken/30",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black",
                        done ? "bg-v3-brand-500 text-v3-text-inverse" : "bg-v3-canvas-sunken/60 text-v3-text-secondary",
                      )}
                    >
                      {done ? <Check size={16} strokeWidth={2.6} /> : <Circle size={16} />}
                    </span>
                    <span
                      className={cn(
                        "text-sm leading-6 sm:text-[15px]",
                        done ? "text-v3-text-secondary line-through" : "text-v3-text-primary",
                      )}
                    >
                      <span className="font-black mr-1">Steg {i + 1}.</span>
                      {step}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-v3-canvas-sunken/70 bg-v3-canvas/40 p-2.5 text-xs text-v3-text-secondary">
            <Package size={13} className="mt-0.5 shrink-0" />
            <span>{rec.equipment.join(" · ")}</span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleFinishRun}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-v3-brand-500 px-5 text-sm font-extrabold text-v3-text-inverse shadow-v3-brand hover:bg-v3-brand-600"
            >
              <Check size={17} strokeWidth={2.4} /> Klart – logga passet
            </button>
            <button
              onClick={() => setRunMode(false)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas-elevated px-5 text-sm font-bold text-v3-text-primary hover:bg-v3-canvas-sunken/40"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
