import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, CheckCircle2, Pencil, Sparkles, Target } from "lucide-react";
import { trackGrowthEvent } from "@/lib/growth";
import { cn } from "@/lib/utils";
import {
  buildPlannerUrl,
  buildSignupUrl,
  type BridgeDestination,
} from "./competitionBridgeRoutes";

export type CompetitionBridgeVariant = "upcoming" | "past";
export type CompetitionBridgeSport = "agility" | "hoopers";
export type CompetitionBridgeLayout = "detail" | "listing";

interface Props {
  /** Analytics context — t.ex. "competition_detail", "hoopers_competition_detail", "public_competitions_top". */
  placement: string;
  /** Competition-id skickas till signup men aldrig till analytics-egenskaper som PII. */
  competitionId?: string | null;
  /** Namn används endast i copy, aldrig i analytics. */
  competitionName?: string | null;
  /** ISO-datum för tävlingen (används i CSS-previewn). */
  competitionDate?: string | null;
  sport?: CompetitionBridgeSport;
  variant?: CompetitionBridgeVariant;
  /** "detail" = full vertikal, "listing" = kompakt horisontell ovan kalender. */
  layout?: CompetitionBridgeLayout;
  /** Signal till förälder om vi är i vyn (används för att gömma sticky mobil-CTA). */
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
}

const COPY = {
  agility: {
    upcoming: {
      eyebrow: "Från datum till plan",
      headline: "Gör tävlingen till en plan – inte bara ett datum.",
      steps: [
        {
          icon: Calendar,
          title: "Spara tävlingen",
          body: "Håll koll på sista anmälningsdag och slipp missa datum.",
        },
        {
          icon: Target,
          title: "Få tydliga träningspass",
          body: "Ett konkret nästa pass fram till start – 10–20 minuter i taget.",
        },
        {
          icon: Pencil,
          title: "Rita banor & logga passet",
          body: "Testa banor i banbyggaren och logga hur det gick.",
        },
      ],
      primary: "Få min plan fram till start",
    },
    past: {
      eyebrow: "Efter tävlingen",
      headline: "Logga resultatet och gör nästa tävling bättre.",
      steps: [
        {
          icon: CheckCircle2,
          title: "Logga resultatet",
          body: "Spara starter, tider och fel — grunden för statistiken.",
        },
        {
          icon: Target,
          title: "Få nästa träningspass",
          body: "Vi föreslår vad ni ska jobba på till nästa start.",
        },
        {
          icon: Pencil,
          title: "Testa nya banor",
          body: "Träna på liknande banor i banbyggaren.",
        },
      ],
      primary: "Logga resultat & få nästa pass",
    },
  },
  hoopers: {
    upcoming: {
      eyebrow: "Från datum till plan",
      headline: "Gör hooperstävlingen till en plan – inte bara ett datum.",
      steps: [
        {
          icon: Calendar,
          title: "Spara tävlingen",
          body: "Håll koll på när anmälan öppnar och stänger.",
        },
        {
          icon: Target,
          title: "Få tydliga träningspass",
          body: "Hoopers-anpassade pass fram till start.",
        },
        {
          icon: Pencil,
          title: "Rita hoopers-banor",
          body: "Hoopers-anpassade hinder och kontroller i banbyggaren.",
        },
      ],
      primary: "Få min plan fram till start",
    },
    past: {
      eyebrow: "Efter tävlingen",
      headline: "Logga hoopersresultatet och gör nästa start bättre.",
      steps: [
        {
          icon: CheckCircle2,
          title: "Logga resultatet",
          body: "Spara löp och placeringar — grunden för statistiken.",
        },
        {
          icon: Target,
          title: "Få nästa träningspass",
          body: "Vi föreslår vad ni ska jobba på till nästa start.",
        },
        {
          icon: Pencil,
          title: "Testa nya banor",
          body: "Träna på hoopers-banor i banbyggaren.",
        },
      ],
      primary: "Logga resultat & få nästa pass",
    },
  },
} as const;

function formatShortDate(d?: string | null): string {
  if (!d) return "Snart";
  try {
    return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(new Date(d));
  } catch {
    return "Snart";
  }
}

/**
 * Kompakt, CSS-baserad produkt-preview: datum → dagens pass → mini-bana.
 * Använder design tokens (border, bg-card, primary) så mörkt/ljust läge fungerar.
 */
function ProductPreview({
  sport,
  date,
}: {
  sport: CompetitionBridgeSport;
  date?: string | null;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Datum-kort */}
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Nästa tävling
          </p>
          <p className="mt-1 text-lg font-bold leading-tight text-foreground">
            {formatShortDate(date)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {sport === "hoopers" ? "Hoopers" : "Agility"}
          </p>
        </div>

        {/* Dagens pass-kort */}
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Dagens pass
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-foreground">
            {sport === "hoopers" ? "Distans & linjer" : "Kontakt & tempo"}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span>12 min · 3 steg</span>
          </div>
        </div>

        {/* Mini-bana */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Bana
          </p>
          <svg
            viewBox="0 0 100 44"
            className="mt-1.5 h-11 w-full"
            role="img"
            aria-label="Illustration av bana"
          >
            <path
              d="M4 34 Q 22 6 42 22 T 82 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              className="text-primary/50"
            />
            {[
              [8, 32],
              [24, 14],
              [42, 22],
              [62, 26],
              [82, 12],
              [94, 20],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={2}
                className={i === 2 ? "fill-primary" : "fill-primary/70"}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

export function CompetitionProductBridge({
  placement,
  competitionId,
  competitionName,
  competitionDate,
  sport = "agility",
  variant = "upcoming",
  layout = "detail",
  onVisibilityChange,
  className,
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);
  const seenRef = useRef(false);
  const [visible, setVisible] = useState(false);

  const copy = COPY[sport][variant];

  const signupHref = buildSignupUrl({
    source: `competition_bridge_${placement}`,
    competitionId,
    sport,
  });
  const plannerHref = buildPlannerUrl({
    source: `competition_bridge_${placement}`,
    sport,
  });

  // IntersectionObserver → tracka view en gång vid ≥40% synlighet + rapportera up-live
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      // Fallback: räkna som visad direkt så vi inte tappar tracking i test-miljö.
      if (!seenRef.current) {
        seenRef.current = true;
        trackGrowthEvent("competition_bridge_view", {
          placement,
          competition_id: competitionId ?? null,
          sport,
          variant,
        });
      }
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
          setVisible(isVisible);
          onVisibilityChange?.(isVisible);
          if (isVisible && !seenRef.current) {
            seenRef.current = true;
            trackGrowthEvent("competition_bridge_view", {
              placement,
              competition_id: competitionId ?? null,
              sport,
              variant,
            });
          }
        }
      },
      { threshold: [0, 0.4, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [placement, competitionId, sport, variant, onVisibilityChange]);

  const handleClick = (destination: BridgeDestination) => {
    trackGrowthEvent("competition_bridge_click", {
      placement,
      destination,
      competition_id: competitionId ?? null,
      sport,
      variant,
    });
  };

  const isListing = layout === "listing";

  // Sanera tävlingsnamn i copy (aldrig i analytics).
  const safeName = (competitionName ?? "").replace(/[<>]/g, "").trim();
  const contextLine = safeName
    ? variant === "past"
      ? `Efter ${safeName}: bygg vidare på det ni lärde er.`
      : `Från ${safeName} till nästa pass — i en enda plan.`
    : null;

  return (
    <section
      ref={rootRef}
      aria-labelledby={`comp-bridge-${placement}-h`}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        isListing ? "p-5 sm:p-6" : "p-5 sm:p-7",
        className,
      )}
      data-visible={visible ? "true" : "false"}
    >
      {/* Subtil brand-glimt utan att skrika */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent"
      />

      <div className="relative flex flex-col gap-5">
        <header className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={20} strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {copy.eyebrow}
            </p>
            <h2
              id={`comp-bridge-${placement}-h`}
              className={cn(
                "mt-1 font-display font-bold leading-tight text-foreground",
                isListing ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
              )}
            >
              {copy.headline}
            </h2>
            {contextLine && !isListing && (
              <p className="mt-1.5 text-sm text-muted-foreground">{contextLine}</p>
            )}
          </div>
        </header>

        {/* CSS-preview visas bara i detail (skulle vara för tung på listing-toppen). */}
        {!isListing && <ProductPreview sport={sport} date={competitionDate} />}

        {/* Tre värde-steg */}
        <ol
          className={cn(
            "grid gap-2.5",
            isListing ? "sm:grid-cols-3" : "sm:grid-cols-3",
          )}
        >
          {copy.steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={16} strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {idx + 1}. {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* CTA:er */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to={signupHref}
            onClick={() => handleClick("signup")}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow transition hover:-translate-y-0.5 hover:bg-primary/90 sm:flex-none"
          >
            {copy.primary} <ArrowRight size={16} />
          </Link>
          <Link
            to={plannerHref}
            onClick={() => handleClick("planner")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <Pencil size={15} /> Testa banbyggaren gratis
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Gratis att börja · Ingen betalning krävs
        </p>
      </div>
    </section>
  );
}

export default CompetitionProductBridge;
