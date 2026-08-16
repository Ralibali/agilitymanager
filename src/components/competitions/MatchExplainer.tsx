import { useState } from "react";
import { Check, ChevronDown, HelpCircle, Minus, X } from "lucide-react";
import { explainMatch, profileLabel, useDogProfile, type ReasonState } from "@/lib/dogMatch";
import type { UnifiedCompetition } from "@/lib/competitionData";

const STATE_ICON: Record<ReasonState, typeof Check> = {
  ok: Check,
  no: X,
  unknown: Minus,
};

const STATE_STYLE: Record<ReasonState, string> = {
  ok: "bg-forest text-paper",
  no: "bg-ink/15 text-ink/60",
  unknown: "bg-tang text-ink",
};

/** "Varför matchar den?" — visar klass- och storleksmatchningen mot aktiv hundprofil. */
export function MatchExplainer({
  comp,
  variant = "card",
}: {
  comp: UnifiedCompetition;
  variant?: "card" | "detail";
}) {
  const { profile, profiles, activeId, select } = useDogProfile();
  const [open, setOpen] = useState(variant === "detail");
  const explanation = explainMatch(comp, profile);
  const tone =
    explanation.matches && !explanation.unknownClasses
      ? "border-forest/40 bg-forest/5"
      : explanation.unknownClasses
        ? "border-tang bg-tang/10"
        : "border-ink/15 bg-ink/[0.03]";

  return (
    <div className={`rounded-2xl border-2 ${tone} p-3 ${variant === "detail" ? "sm:p-5" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-ink">
          <HelpCircle className="h-4 w-4 shrink-0 text-forest" />
          Varför matchar den?
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <p className="mt-1.5 text-sm font-semibold text-ink/60">{explanation.summary}</p>

      {open && (
        <>
          <ul className="mt-3 space-y-2">
            {explanation.reasons.map((r) => {
              const Icon = STATE_ICON[r.state];
              return (
                <li key={r.key} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${STATE_STYLE[r.state]}`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="text-sm font-semibold text-ink/70">
                    <span className="font-extrabold text-ink">{r.label}: </span>
                    {r.detail}
                  </span>
                </li>
              );
            })}
          </ul>

          {profiles.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t-2 border-ink/10 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Profil</span>
              {profiles.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.id)}
                  aria-pressed={p.id === activeId}
                  className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                    p.id === activeId
                      ? "border-ink bg-forest text-paper"
                      : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                  }`}
                >
                  {profileLabel(p, i)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
