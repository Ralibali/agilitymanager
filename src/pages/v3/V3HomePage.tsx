import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  HeartPulse,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard, type NextEvent } from "@/hooks/v3/useV3Dashboard";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { ActivityTimeline } from "@/components/v3/ActivityTimeline";
import { V3OnboardingWizard } from "@/components/v3/V3OnboardingWizard";
import { V3AddDogSheet } from "@/components/v3/V3AddDogSheet";
import { DogHero } from "@/components/v3/DogHero";
import { DagensPassCard } from "@/components/v3/DagensPassCard";
import { ProValueCard } from "@/components/v3/ProValueCard";
import type { FocusArea, RecSport, TrainingRecommendation } from "@/lib/trainingRecommendations";
import { defaultFocus, AGILITY_FOCUS_KEYS, HOOPERS_FOCUS_KEYS } from "@/lib/trainingRecommendations";
import { cn } from "@/lib/utils";

function formatDate(date?: string | null): string {
  if (!date) return "Inte planerat";
  try {
    return new Intl.DateTimeFormat("sv-SE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(date));
  } catch {
    return date;
  }
}

function getCurrentWeekDays(): { d: string; n: string; active: boolean }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const labels = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"];

  return labels.map((d, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { d, n: String(date.getDate()), active: date.getTime() === today.getTime() };
  });
}

type HomeMode = "no-dog" | "dashboard";

/**
 * V3 hemskärm.
 *
 * Progressiv hierarki:
 *   - Utan hund → fokuserad "Lägg till hund"-vy.
 *   - Med hund → dashboard där "Dagens pass" är den visuellt dominanta
 *     aha-upplevelsen, oavsett om användaren har loggat pass eller ej.
 *
 * Tävlingsresultat-import är sekundärt och lever under "Fler sätt att komma
 * igång". Aktiveringschecklistan visas så länge användaren har < 2 loggade pass.
 */
export default function V3HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { dogs, active, activeId, setActive, loading: dogsLoading, refetch: refetchDogs } = useV3Dogs();
  const { stats, signals, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [addDogOpen, setAddDogOpen] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState<boolean>(() => {
    const meta = (user?.user_metadata ?? {}) as { home_insight_dismissed_at?: string };
    return Boolean(meta.home_insight_dismissed_at);
  });

  const meta = (user?.user_metadata ?? {}) as {
    onboarding_complete?: boolean;
    onboarding_skipped?: boolean;
    onboarding_focus?: FocusArea[];
    onboarding_goal?: string | null;
    onboarding_sport?: RecSport;
    starter_plan_id?: string | null;
  };

  const recSport: RecSport =
    meta.onboarding_sport ?? (active?.sport === "Hoopers" ? "Hoopers" : "Agility");
  const validFocusKeys = recSport === "Hoopers" ? HOOPERS_FOCUS_KEYS : AGILITY_FOCUS_KEYS;
  const savedFocus = (meta.onboarding_focus ?? []).filter((f): f is FocusArea =>
    (validFocusKeys as readonly string[]).includes(f as string),
  );
  const focusList: FocusArea[] = savedFocus.length > 0 ? savedFocus : [defaultFocus(recSport)];

  const sessionsThisWeek = stats?.sessionsThisWeek ?? 0;
  const minutesThisWeek = stats?.minutesThisWeek ?? 0;
  const streakDays = stats?.streakDays ?? 0;
  const passedThisMonth = stats?.passedThisMonth ?? 0;
  const hasTimeline = timeline.length > 0;

  useEffect(() => {
    if (dogsLoading || !user) return;
    const done = meta.onboarding_complete || meta.onboarding_skipped;
    if (!done && dogs.length === 0) setShowOnboarding(true);
  }, [user, dogs, dogsLoading, meta.onboarding_complete, meta.onboarding_skipped]);

  // Öppna loggsheet automatiskt om användaren kommit hit från onboardingens
  // "Jag har redan tränat"-CTA.
  useEffect(() => {
    if (searchParams.get("logNow") === "1") {
      openV3LogSheet();
      const next = new URLSearchParams(searchParams);
      next.delete("logNow");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const mode: HomeMode | null = useMemo(() => {
    if (dogsLoading) return null;
    if (dogs.length === 0) return "no-dog";
    return "dashboard";
  }, [dogsLoading, dogs.length]);

  const totalTraining = signals?.totalTraining ?? 0;
  const hasAnyTraining = Boolean(signals?.hasAnyTraining);
  const hasAnyResults = Boolean(signals?.hasAnyResults);
  const showActivationChecklist = mode === "dashboard" && totalTraining < 2;
  const starterPlanChosen = Boolean(
    meta.starter_plan_id || (meta.onboarding_focus && meta.onboarding_focus.length > 0),
  );

  const dismissInsight = async () => {
    setInsightDismissed(true);
    try {
      await supabase.auth.updateUser({ data: { home_insight_dismissed_at: new Date().toISOString() } });
    } catch {
      /* ignore */
    }
  };

  const startPassFromCard = (_rec: TrainingRecommendation) => {
    // Passläget körs lokalt i DagensPassCard — vi hoppar INTE till ett generiskt stoppur.
  };

  const logFromCard = (rec: TrainingRecommendation) => {
    openV3LogSheet(rec.logDefaults);
  };

  if (showOnboarding) {
    // Efter onboarding: hämta om hundlistan — wizarden skapar hunden direkt
    // mot databasen, och utan refetch skulle hemskärmen fastna i "no-dog"-läge.
    return (
      <V3OnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          refetchDogs();
        }}
      />
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1520px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8 animate-v3-fade-in"
    >
      {mode === null ? (
        <div className="h-[520px] rounded-[2rem] v3-skeleton" />
      ) : mode === "no-dog" ? (
        <FocusedIntroCard
          eyebrow="Kom igång"
          title="Vem tränar du med?"
          body="Lägg till din hund så bygger vi ett fokuserat startpass åt er."
          primary={{ label: "Lägg till hund", onClick: () => setAddDogOpen(true), icon: Plus }}
          secondary={{
            label: "Utforska banplaneraren först →",
            onClick: () => navigate("/v3/course-planner-v2"),
          }}
        />
      ) : (
        <div className="space-y-5 lg:space-y-6">
          {/* Personlig hälsning — värme utan att konkurrera med hierarkin */}
          <GreetingHeader userMetadata={user?.user_metadata} />

          {/* Kompakt hundidentitet + växlare */}
          <DogHero
            dogs={dogs}
            active={active}
            activeId={activeId}
            onSelect={setActive}
            onAddDog={() => setAddDogOpen(true)}
          />

          {/* Första insikt-kortet visas bara när det finns loggade pass. */}
          {hasAnyTraining && !insightDismissed && signals && (
            <FirstInsightCard
              signals={signals}
              onDismiss={dismissInsight}
              onOpen={() => navigate("/v3/stats")}
            />
          )}

          {/* Aktiveringschecklista tills 2+ pass loggats */}
          {showActivationChecklist && (
            <ActivationChecklist
              dogAdded={dogs.length > 0}
              starterPlanChosen={starterPlanChosen}
              firstSessionLogged={totalTraining >= 1}
              hasInsight={hasAnyTraining}
              onLog={() => openV3LogSheet()}
              onSeeInsight={() => navigate("/v3/stats")}
            />
          )}

          {/* Dagens pass — visuellt dominant */}
          <DagensPassCard
            sport={recSport}
            focus={focusList}
            dogName={active?.name ?? "din hund"}
            recentSessions={timeline
              .filter((t) => t.kind === "training")
              .slice(0, 3)
              .map((t) => ({
                date: t.date,
                duration_min: null,
                obstacles_trained: null,
                overall_mood: null,
                tags: null,
              }))}
            onStart={startPassFromCard}
            onLog={logFromCard}
          />

          {/* Primär CTA på mobil */}
          <button
            onClick={() => openV3LogSheet()}
            className="w-full min-h-14 rounded-2xl bg-v3-text-primary text-v3-text-inverse font-black text-base inline-flex items-center justify-center gap-2 shadow-v3-brand hover:bg-v3-brand-600 sm:hidden"
          >
            <Plus size={20} /> Logga ett riktigt pass
          </button>

          {/* Pro-värdekort — visas först efter första riktiga passet (gate:as internt) */}
          <ProValueCard />

          {/* Fler sätt att komma igång — sekundärt när användaren inte hunnit igång än */}
          {totalTraining === 0 && (
            <SecondaryStartWays
              hasResults={hasAnyResults}
              onFetchResults={() => navigate("/v3/competition?tab=find")}
              onPlanCourse={() => navigate("/v3/course-planner-v2")}
            />
          )}

          {/* Nästa aktivitet + veckans träning */}
          <section className="grid gap-4 md:grid-cols-2">
            <NextEventPanel
              loading={dashLoading}
              nextEvent={nextEvent}
              onOpen={() =>
                navigate(nextEvent?.kind === "training" ? "/v3/training" : "/v3/competition")
              }
              onCreate={() => navigate("/v3/competition?action=new")}
            />
            <WeekTrainingPanel
              sessionsThisWeek={sessionsThisWeek}
              minutesThisWeek={minutesThisWeek}
              streakDays={streakDays}
              onTraining={() => navigate("/v3/training")}
              onStats={() => navigate("/v3/stats")}
            />
          </section>

          {/* Senaste aktivitet + status */}
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ActivityTimeline entries={timeline} loading={dashLoading} />
            <StatusChecklistCard
              hasTimeline={hasTimeline}
              sessionsThisWeek={sessionsThisWeek}
              streakDays={streakDays}
              nextEvent={nextEvent}
              passedThisMonth={passedThisMonth}
            />
          </section>

          {/* Fler verktyg — sekundärt och komprimerat */}
          <MoreTools onNavigate={navigate} />
        </div>
      )}
      <V3AddDogSheet
        open={addDogOpen}
        onClose={() => setAddDogOpen(false)}
        onAdded={() => {
          setAddDogOpen(false);
          // Mjuk uppdatering istället för hård omladdning — behåller scroll,
          // state och ger omedelbar övergång till dashboard-läget.
          refetchDogs();
        }}
      />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Subkomponenter — inga påhittade procent eller status­etiketter.
 * ──────────────────────────────────────────────────────────────── */

function GreetingHeader({ userMetadata }: { userMetadata?: Record<string, unknown> }) {
  const displayName = (userMetadata as { display_name?: string } | undefined)?.display_name;
  const firstName = displayName?.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 11 ? "God morgon" : hour >= 11 && hour < 17 ? "God dag" : hour >= 17 && hour < 23 ? "God kväll" : "Sent ute";
  const dateStr = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="flex items-baseline justify-between gap-3">
      <p className="text-sm font-medium text-v3-text-secondary">
        {greeting}
        {firstName ? `, ${firstName}` : ""} 👋
      </p>
      <p className="text-xs text-v3-text-tertiary capitalize shrink-0">{dateStr}</p>
    </header>
  );
}

function FocusedIntroCard({
  eyebrow,
  title,
  body,
  primary,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  primary: { label: string; onClick: () => void; icon?: LucideIcon };
  secondary?: { label: string; onClick: () => void };
}) {
  const Icon = primary.icon;
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center py-10">
      <article className="w-full rounded-[2rem] border border-v3-canvas-sunken/60 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--v3-brand-500)/0.10),transparent_50%),linear-gradient(135deg,hsl(var(--v3-canvas-elevated))_0%,hsl(var(--v3-canvas))_100%)] p-8 shadow-v3-lg sm:p-10 text-center">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-v3-brand-700">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 font-v3-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] tracking-[-0.04em] text-v3-text-primary">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-v3-text-secondary">{body}</p>
        <button
          onClick={primary.onClick}
          className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-v3-brand-500 px-6 text-sm font-extrabold text-v3-text-inverse shadow-v3-brand transition hover:-translate-y-0.5 hover:bg-v3-brand-600"
        >
          {Icon && <Icon size={18} />} {primary.label} <ArrowRight size={16} />
        </button>
      </article>
      {secondary && (
        <button
          onClick={secondary.onClick}
          className="mt-5 min-h-11 text-sm font-semibold text-v3-text-secondary underline-offset-4 hover:text-v3-text-primary hover:underline"
        >
          {secondary.label}
        </button>
      )}
    </div>
  );
}

function FirstInsightCard({
  signals,
  onDismiss,
  onOpen,
}: {
  signals: import("@/hooks/v3/useV3Dashboard").DashboardSignals;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const { message, cta } = useMemo(() => {
    if (signals.bestPlacement !== null && signals.totalResults > 0) {
      return {
        message: `Bästa placering: ${signals.bestPlacement} — och ${signals.totalResults} resultat importerade. Här är er utveckling.`,
        cta: "Se statistik",
      };
    }
    if (signals.totalResults > 0) {
      return {
        message: `${signals.totalResults} resultat importerade — här är er utveckling.`,
        cta: "Se statistik",
      };
    }
    if (signals.totalTraining > 0) {
      return {
        message: `Första träningen loggad — bra jobbat. Bygg vidare på rytmen.`,
        cta: "Se statistik",
      };
    }
    return { message: "Din träningsbild börjar ta form.", cta: "Se statistik" };
  }, [signals]);

  return (
    <article className="relative rounded-[1.5rem] border border-v3-brand-500/25 bg-gradient-to-br from-v3-brand-500/10 to-v3-canvas-elevated p-5 shadow-v3-sm sm:p-6">
      <button
        onClick={onDismiss}
        aria-label="Dölj insikt"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/40 hover:text-v3-text-primary"
      >
        <X size={16} />
      </button>
      <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-v3-brand-500/15 text-v3-brand-700">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-brand-700">
              Första insikten
            </p>
            <p className="mt-1 text-base font-bold leading-6 text-v3-text-primary">{message}</p>
          </div>
        </div>
        <button
          onClick={onOpen}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-v3-text-primary px-4 text-sm font-black text-v3-text-inverse hover:bg-v3-brand-600"
        >
          {cta} <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}

function ActivationChecklist({
  dogAdded,
  starterPlanChosen,
  firstSessionLogged,
  hasInsight,
  onLog,
  onSeeInsight,
}: {
  dogAdded: boolean;
  starterPlanChosen: boolean;
  firstSessionLogged: boolean;
  hasInsight: boolean;
  onLog: () => void;
  onSeeInsight: () => void;
}) {
  const items: Array<{ label: string; done: boolean; action?: { label: string; onClick: () => void } }> = [
    { label: "Hund tillagd", done: dogAdded },
    { label: "Startpass valt", done: starterPlanChosen },
    {
      label: "Första riktiga passet loggat",
      done: firstSessionLogged,
      action: !firstSessionLogged ? { label: "Logga nu", onClick: onLog } : undefined,
    },
    {
      label: "Första insikten upplåst",
      done: hasInsight && firstSessionLogged,
      // Klickbar först när ett pass finns — annars ingen action.
      action:
        firstSessionLogged && hasInsight ? { label: "Öppna", onClick: onSeeInsight } : undefined,
    },
  ];
  const doneCount = items.filter((i) => i.done).length;
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-4 shadow-v3-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-brand-700">
            Kom igång
          </p>
          <h2 className="mt-1 text-lg font-black text-v3-text-primary sm:text-xl">
            {doneCount} av {items.length} klara
          </h2>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-v3-canvas-sunken/60">
          <div
            className="h-full rounded-full bg-v3-brand-500"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-3 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas/60 px-3 py-2.5"
          >
            {it.done ? (
              <CheckCircle2 size={18} className="shrink-0 text-v3-brand-600" />
            ) : (
              <Circle size={18} className="shrink-0 text-v3-text-tertiary" />
            )}
            <span
              className={cn(
                "flex-1 text-sm font-semibold",
                it.done ? "text-v3-text-secondary line-through" : "text-v3-text-primary",
              )}
            >
              {it.label}
            </span>
            {it.action && (
              <button
                onClick={it.action.onClick}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-v3-brand-500 px-3 text-xs font-black text-v3-text-inverse hover:bg-v3-brand-600"
              >
                {it.action.label} <ArrowRight size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

function SecondaryStartWays({
  hasResults,
  onFetchResults,
  onPlanCourse,
}: {
  hasResults: boolean;
  onFetchResults: () => void;
  onPlanCourse: () => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Sekundärt" title="Fler sätt att komma igång" icon={Sparkles} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {!hasResults && (
          <button
            onClick={onFetchResults}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-3 text-left transition hover:bg-v3-canvas-sunken/40"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-v3-brand-500/10 text-v3-brand-700">
              <Download size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-v3-text-primary">Hämta tävlingsresultat</p>
              <p className="text-xs text-v3-text-tertiary">Om ni redan tävlat</p>
            </div>
          </button>
        )}
        <button
          onClick={onPlanCourse}
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-3 text-left transition hover:bg-v3-canvas-sunken/40"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-v3-brand-500/10 text-v3-brand-700">
            <Pencil size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-v3-text-primary">Rita en bana</p>
            <p className="text-xs text-v3-text-tertiary">Banplaneraren</p>
          </div>
        </button>
      </div>
    </section>
  );
}

function NextEventPanel({
  loading,
  nextEvent,
  onOpen,
  onCreate,
}: {
  loading: boolean;
  nextEvent: NextEvent;
  onOpen: () => void;
  onCreate: () => void;
}) {
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Plan" title="Nästa upp" icon={CalendarDays} />
      {loading ? (
        <div className="mt-5 h-28 rounded-2xl v3-skeleton" />
      ) : nextEvent ? (
        <div className="mt-5 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-v3-brand-700">
                {nextEvent.kind === "competition" ? "Tävling" : "Träning"}
              </p>
              <h3 className="mt-1 text-xl font-black text-v3-text-primary">{nextEvent.title}</h3>
              <p className="mt-2 text-sm text-v3-text-secondary">
                {formatDate(nextEvent.date)} · {nextEvent.location || "Ingen plats angiven"}
              </p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-v3-accent-traning/12 text-v3-accent-traning">
              {nextEvent.kind === "competition" ? <Trophy size={21} /> : <Clock3 size={21} />}
            </div>
          </div>
          <button
            onClick={onOpen}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-v3-text-primary px-4 text-sm font-black text-v3-text-inverse hover:bg-v3-brand-600"
          >
            Öppna <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-v3-canvas-sunken bg-v3-canvas/60 p-4">
          <h3 className="text-lg font-black text-v3-text-primary">Inget planerat än</h3>
          <p className="mt-2 text-sm leading-6 text-v3-text-secondary">
            Lägg in en tävling eller ett planerat pass när det passar — det är inget krav för att börja träna.
          </p>
          <button
            onClick={onCreate}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-v3-brand-500 px-4 text-sm font-black text-v3-text-inverse hover:bg-v3-brand-600"
          >
            Planera tävling <ArrowRight size={15} />
          </button>
        </div>
      )}
    </article>
  );
}

function WeekTrainingPanel({
  sessionsThisWeek,
  minutesThisWeek,
  streakDays,
  onTraining,
  onStats,
}: {
  sessionsThisWeek: number;
  minutesThisWeek: number;
  streakDays: number;
  onTraining: () => void;
  onStats: () => void;
}) {
  const days = getCurrentWeekDays();
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Rytm" title="Veckans träning" icon={BarChart3} />
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <div
            key={`${day.d}-${day.n}`}
            className={cn(
              "rounded-xl border p-2 text-center",
              day.active
                ? "border-v3-brand-500 bg-v3-brand-500 text-v3-text-inverse"
                : i < sessionsThisWeek
                ? "border-v3-brand-500/30 bg-v3-brand-500/10 text-v3-brand-700"
                : "border-v3-canvas-sunken/60 bg-v3-canvas text-v3-text-secondary",
            )}
          >
            <p className="text-[10px] font-bold uppercase">{day.d}</p>
            <p className="mt-0.5 text-sm font-black">{day.n}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniFact label="Pass" value={String(sessionsThisWeek)} />
        <MiniFact label="Minuter" value={String(minutesThisWeek)} />
        <MiniFact label="Streak" value={`${streakDays} d`} />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onTraining}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-v3-canvas-sunken/70 bg-v3-canvas px-4 text-sm font-bold text-v3-text-primary hover:bg-v3-canvas-sunken/40"
        >
          Alla pass
        </button>
        <button
          onClick={onStats}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-v3-canvas-sunken/70 bg-v3-canvas px-4 text-sm font-bold text-v3-text-primary hover:bg-v3-canvas-sunken/40"
        >
          Statistik
        </button>
      </div>
    </article>
  );
}

function StatusChecklistCard({
  hasTimeline,
  sessionsThisWeek,
  streakDays,
  nextEvent,
  passedThisMonth,
}: {
  hasTimeline: boolean;
  sessionsThisWeek: number;
  streakDays: number;
  nextEvent: NextEvent;
  passedThisMonth: number;
}) {
  const checks = [
    { label: "Träningshistorik finns", done: hasTimeline },
    { label: "Loggat pass denna vecka", done: sessionsThisWeek > 0 },
    { label: "Streak igång", done: streakDays > 0 },
    { label: "Nästa aktivitet planerad", done: Boolean(nextEvent) },
    { label: "Godkänt lopp denna månad", done: passedThisMonth > 0 },
  ];
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Status" title="Så ligger ni till" icon={HeartPulse} />
      <ul className="mt-4 space-y-1.5">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-center gap-2.5 rounded-xl border border-v3-canvas-sunken/60 bg-v3-canvas/60 px-3 py-2 text-sm"
          >
            {c.done ? (
              <CheckCircle2 size={16} className="shrink-0 text-v3-brand-600" />
            ) : (
              <Circle size={16} className="shrink-0 text-v3-text-tertiary" />
            )}
            <span
              className={cn(
                "font-semibold",
                c.done ? "text-v3-text-secondary" : "text-v3-text-primary",
              )}
            >
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function MoreTools({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [open, setOpen] = useState(false);
  const tools: { label: string; hint: string; icon: LucideIcon; to: string }[] = [
    { label: "Starta stoppur", hint: "Ta tid direkt", icon: Timer, to: "/v3/stopwatch" },
    { label: "Lägg resultat", hint: "Efter tävling", icon: Trophy, to: "/v3/competition?action=result" },
    { label: "Sätt mål", hint: "Nästa nivå", icon: Target, to: "/v3/goals?action=new" },
    { label: "Hitta tävling", hint: "Agility & hoopers", icon: CalendarDays, to: "/v3/competition/kalender" },
    { label: "Rita bana", hint: "Banplaneraren", icon: Pencil, to: "/v3/course-planner-v2" },
  ];
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated shadow-v3-sm"
    >
      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-v3-text-primary min-h-14">
        <span>Fler verktyg</span>
        <span className="text-v3-text-tertiary">{open ? "Dölj" : "Visa"}</span>
      </summary>
      <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <button
            key={t.to}
            onClick={() => onNavigate(t.to)}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-3 text-left transition hover:bg-v3-canvas-sunken/40"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-v3-brand-500/10 text-v3-brand-700">
              <t.icon size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-v3-text-primary">{t.label}</p>
              <p className="text-xs text-v3-text-tertiary">{t.hint}</p>
            </div>
          </button>
        ))}
      </div>
    </details>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-text-tertiary">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-v3-text-primary">{title}</h2>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-v3-canvas text-v3-text-secondary border border-v3-canvas-sunken/60">
        <Icon size={20} />
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-v3-text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-v3-text-primary">{value}</p>
    </div>
  );
}
