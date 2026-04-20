import { ChevronRight } from "lucide-react";
import type { NextMilestone } from "@/hooks/v3/useV3Milestones";

interface NextMilestoneCardProps {
  /** Den närmst uppnåbara olåsta milstolpen */
  primary: NextMilestone;
  /** Övriga olåsta mål – visas som kompakta progress-rader under */
  others?: NextMilestone[];
}

/**
 * Visuell widget för nästa milstolpe.
 * Hero-kort med emoji, hint ("3 pass kvar till 100 träningspass") och
 * en stor progress-bar. Övriga olåsta mål staplas under som tunna rader
 * så användaren ser hela "stegen" framför sig.
 */
export function NextMilestoneCard({ primary, others = [] }: NextMilestoneCardProps) {
  const pct = Math.round(primary.progress * 100);

  return (
    <section
      aria-label="Nästa milstolpe"
      className="rounded-v3-2xl border border-v3-canvas-sunken/40 bg-gradient-to-br from-v3-brand-500/[0.06] via-v3-canvas-elevated to-v3-canvas-elevated p-5 sm:p-6 space-y-5"
    >
      {/* Eyebrow + emoji-hero */}
      <header className="flex items-start gap-4">
        <div
          className="shrink-0 h-14 w-14 rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 grid place-items-center text-[28px] leading-none shadow-sm"
          aria-hidden
        >
          {primary.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-v3-xs uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
            Nästa milstolpe · {primary.category}
          </p>
          <h3 className="font-v3-display text-v3-xl sm:text-v3-2xl text-v3-text-primary leading-tight mt-1">
            {primary.hint}
          </h3>
        </div>
      </header>

      {/* Progress-bar */}
      <div className="space-y-2">
        <div
          className="relative h-3 rounded-full bg-v3-canvas-sunken/60 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% mot ${primary.title}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-v3-brand-500 to-v3-brand-400 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-v3-xs text-v3-text-tertiary tabular-nums">
          <span>
            {primary.current} / {primary.target}
          </span>
          <span className="font-medium text-v3-text-secondary">{pct}%</span>
        </div>
      </div>

      {/* Övriga olåsta mål */}
      {others.length > 0 && (
        <ul className="space-y-2 pt-1 border-t border-v3-canvas-sunken/40">
          {others.map((m) => {
            const p = Math.round(m.progress * 100);
            return (
              <li key={m.id} className="flex items-center gap-3 pt-3">
                <span className="text-base leading-none shrink-0" aria-hidden>
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-v3-sm text-v3-text-primary truncate">{m.hint}</p>
                    <span className="text-v3-xs text-v3-text-tertiary tabular-nums shrink-0">
                      {m.current}/{m.target}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-v3-canvas-sunken/60 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={p}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-v3-brand-500/80 transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.max(2, p)}%` }}
                    />
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-v3-text-tertiary shrink-0"
                  aria-hidden
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
