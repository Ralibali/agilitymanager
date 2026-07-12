import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dog as DogIcon,
  Download,
  Flame,
  HeartPulse,
  Medal,
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
import { cn } from "@/lib/utils";

function getTimeGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 11) return "Godmorgon";
  if (h >= 11 && h < 17) return "Hej";
  if (h >= 17 && h < 22) return "God kväll";
  return "Sent uppe";
}

function formatDate(date?: string | null): string {
  if (!date) return "Inte planerat";
  try {
    return new Intl.DateTimeFormat("sv-SE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(date));
  } catch {
    return date;
  }
}

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  const target = new Date(date);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
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

function useGreeting(): { greeting: string; name: string } {
  const { user } = useAuth();
  const [name, setName] = useState<string>("vovvägare");
  const [greeting, setGreeting] = useState<string>(() => getTimeGreeting());

  useEffect(() => {
    const id = window.setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setName("vovvägare");
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      const raw = data?.display_name?.trim();
      const cleaned = raw && raw.includes("@") ? raw.split("@")[0] : raw;
      setName(cleaned && cleaned.length > 0 ? cleaned : "vovvägare");
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { greeting, name };
}

type HomeMode = "no-dog" | "no-data" | "full";

export default function V3HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { greeting, name } = useGreeting();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { stats, signals, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [addDogOpen, setAddDogOpen] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState<boolean>(() => {
    const meta = (user?.user_metadata ?? {}) as { home_insight_dismissed_at?: string };
    return Boolean(meta.home_insight_dismissed_at);
  });

  const sessionsThisWeek = stats?.sessionsThisWeek ?? 0;
  const minutesThisWeek = stats?.minutesThisWeek ?? 0;
  const streakDays = stats?.streakDays ?? 0;
  const passedThisMonth = stats?.passedThisMonth ?? 0;
  const hasTimeline = timeline.length > 0;
  const nextDays = daysUntil(nextEvent?.date);

  useEffect(() => {
    if (dogsLoading || !user) return;
    const meta = (user.user_metadata ?? {}) as { onboarding_complete?: boolean; onboarding_skipped?: boolean };
    const done = meta.onboarding_complete || meta.onboarding_skipped;
    if (!done && dogs.length === 0) setShowOnboarding(true);
  }, [user, dogs, dogsLoading]);

  const dailyBrief = useMemo(() => {
    if (!active) return "Lägg till en hund så bygger vi en smart startvy åt dig.";
    if (!hasTimeline) return `Börja med ett enkelt pass för ${active.name}. Efter några loggar får du smartare rekommendationer här.`;
    if (nextEvent?.kind === "competition") return `${active.name} har en tävling på gång. Håll träningen fokuserad och logga känslan efter varje pass.`;
    if (nextEvent?.kind === "training") return `${active.name} har ett planerat pass. Gör det enkelt: ett fokus, en känsla och ett nästa steg.`;
    if (streakDays > 0) return `${active.name} har momentum. Fortsätt med korta, tydliga pass och spara det viktigaste.`;
    return `Du har historik för ${active.name}. Logga nästa pass så blir utvecklingen lättare att följa.`;
  }, [active, hasTimeline, nextEvent?.kind, streakDays]);

  // Bestäm läge – vi väntar på både hundar och dashboard-signaler för att undvika layoutshift.
  const mode: HomeMode | null = useMemo(() => {
    if (dogsLoading) return null;
    if (dogs.length === 0) return "no-dog";
    if (dashLoading || !signals) return null;
    if (!signals.hasAnyTraining && !signals.hasAnyResults) return "no-data";
    return "full";
  }, [dogsLoading, dogs.length, dashLoading, signals]);

  const dismissInsight = async () => {
    setInsightDismissed(true);
    try {
      await supabase.auth.updateUser({ data: { home_insight_dismissed_at: new Date().toISOString() } });
    } catch {
      /* ignore */
    }
  };

  if (showOnboarding) {
    return <V3OnboardingWizard onComplete={() => { setShowOnboarding(false); window.location.reload(); }} />;
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1520px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8 animate-v3-fade-in">
      {mode === null ? (
        <div className="h-[520px] rounded-[2rem] v3-skeleton" />
      ) : mode === "no-dog" ? (
        <FocusedIntroCard
          eyebrow="Kom igång"
          title="Vem tränar du med?"
          body="Lägg till din hund så hämtar vi tävlingsresultat och bygger er profil."
          primary={{ label: "Lägg till hund", onClick: () => setAddDogOpen(true), icon: Plus }}
          secondary={{ label: "Utforska banplaneraren först →", onClick: () => navigate("/v3/course-planner-v2") }}
        />
      ) : mode === "no-data" ? (
        <NoDataMode
          dogs={dogs}
          active={active}
          activeId={activeId}
          onSelectDog={setActive}
          onAddDog={() => setAddDogOpen(true)}
          onFetchResults={() => navigate("/v3/competition?tab=find")}
          onLogTraining={openV3LogSheet}
          onPlanCourse={() => navigate("/v3/course-planner-v2")}
        />
      ) : (
        <div className="space-y-5 lg:space-y-6">
          {!insightDismissed && signals && (
            <FirstInsightCard
              signals={signals}
              onDismiss={dismissInsight}
              onOpen={() => navigate("/v3/stats")}
            />
          )}
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <CommandHero
              greeting={greeting}
              name={name}
              dogName={active?.name ?? "din hund"}
              dailyBrief={dailyBrief}
              nextEvent={nextEvent}
              nextDays={nextDays}
              onLog={openV3LogSheet}
              onPlan={() => navigate("/v3/course-planner-v2")}
              onCompetition={() => navigate("/v3/competition")}
            />
            <DogSwitcherPanel
              dogs={dogs as Array<{ id: string; name: string; breed?: string | null; photo_url?: string | null; image_url?: string | null }>}
              activeId={activeId}
              onSelect={setActive}
              onAdd={() => navigate("/v3/dogs")}
              sessionsThisWeek={sessionsThisWeek}
              minutesThisWeek={minutesThisWeek}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ActionTile icon={Plus} label="Logga pass" hint="30 sek" value="Träning" tone="brand" onClick={openV3LogSheet} />
            <ActionTile icon={Timer} label="Starta stoppur" hint="Ta tid direkt" value="Stoppur" tone="cyan" onClick={() => navigate("/v3/stopwatch")} />
            <ActionTile icon={Trophy} label="Lägg resultat" hint="Efter tävling" value="Resultat" tone="success" onClick={() => navigate("/v3/competition?action=result")} />
            <ActionTile icon={Target} label="Sätt mål" hint="Nästa nivå" value="Fokus" tone="warm" onClick={() => navigate("/v3/goals?action=new")} />
            <ActionTile icon={CalendarDays} label="Hitta tävling" hint="Agility & hoopers" value="Kalender" tone="cyan" onClick={() => navigate("/v3/competition/kalender")} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              <section className="grid gap-4 lg:grid-cols-3">
                <MissionCard
                  title="Dagens bästa nästa steg"
                  icon={Sparkles}
                  eyebrow="Rekommenderat"
                  body={buildMissionText({ hasTimeline, nextEvent, dogName: active?.name ?? "din hund", streakDays })}
                  action="Logga ett pass"
                  onClick={openV3LogSheet}
                  featured
                />
                <MetricPanel icon={Flame} label="Streak" value={String(streakDays)} unit={streakDays === 1 ? "dag" : "dagar"} note={streakDays > 0 ? "Rutinen lever. Håll den enkel." : "Startar när du loggar första passet."} />
                <MetricPanel icon={Medal} label="Godkända lopp" value={String(passedThisMonth)} unit="denna månad" note={passedThisMonth > 0 ? "Fint kvitto på utvecklingen." : "Resultaten visas här efter första loppet."} />
              </section>

              <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <NextEventPanel loading={dashLoading} nextEvent={nextEvent} onOpen={() => navigate(nextEvent?.kind === "training" ? "/v3/training" : "/v3/competition")} onCreate={() => navigate("/v3/competition?action=new")} />
                <TrainingFocusPanel sessionsThisWeek={sessionsThisWeek} minutesThisWeek={minutesThisWeek} hasTimeline={hasTimeline} onTraining={() => navigate("/v3/training")} onStats={() => navigate("/v3/stats")} />
              </section>

              <WeeklyRhythmPanel sessionsThisWeek={sessionsThisWeek} minutesThisWeek={minutesThisWeek} />
            </div>

            <aside className="space-y-5">
              <ReadinessPanel hasTimeline={hasTimeline} sessionsThisWeek={sessionsThisWeek} streakDays={streakDays} nextEvent={nextEvent} />
              <ActivityTimeline entries={timeline} loading={dashLoading} />
            </aside>
          </section>
        </div>
      )}
    </main>
  );
}

function CommandHero({
  greeting,
  name,
  dogName,
  dailyBrief,
  nextEvent,
  nextDays,
  onLog,
  onPlan,
  onCompetition,
}: {
  greeting: string;
  name: string;
  dogName: string;
  dailyBrief: string;
  nextEvent: NextEvent;
  nextDays: number | null;
  onLog: () => void;
  onPlan: () => void;
  onCompetition: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-v3-canvas-sunken/60 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--v3-brand-500)/0.10),transparent_30%),linear-gradient(135deg,hsl(var(--v3-canvas-elevated))_0%,hsl(var(--v3-canvas))_55%,hsl(var(--v3-canvas-secondary))_100%)] p-5 shadow-v3-lg sm:p-7 lg:p-8">
      <div className="absolute right-8 top-8 hidden h-32 w-32 rounded-full bg-v3-brand-500/10 blur-3xl lg:block" />
      <div className="relative z-10 grid min-h-[320px] gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="flex h-full flex-col justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-v3-brand-500/20 bg-v3-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-v3-brand-700">
              <Sparkles size={14} /> Command center
            </div>
            <h1 className="mt-5 max-w-3xl text-balance font-v3-display text-[clamp(2.25rem,5vw,4.9rem)] leading-[0.9] tracking-[-0.06em] text-v3-text-primary">
              {greeting}, {name}.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-v3-text-secondary sm:text-lg">
              {dailyBrief}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={onLog} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-v3-brand-500 px-5 text-sm font-extrabold text-v3-text-inverse shadow-v3-brand transition hover:-translate-y-0.5 hover:bg-v3-brand-600">
              <Plus size={18} /> Logga pass <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>
            <button onClick={onPlan} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas-elevated px-5 text-sm font-bold text-v3-text-primary transition hover:bg-v3-canvas-sunken/40">
              <Target size={17} /> Planera bana
            </button>
            <button onClick={onCompetition} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas-elevated px-5 text-sm font-bold text-v3-text-primary transition hover:bg-v3-canvas-sunken/40">
              <CalendarDays size={17} /> Tävlingar
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-4 shadow-v3-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-text-tertiary">Nästa signal</p>
              <h2 className="mt-1 text-xl font-bold text-v3-text-primary">{nextEvent ? nextEvent.title : `Träna med ${dogName}`}</h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-v3-accent-traning/12 text-v3-accent-traning">
              {nextEvent?.kind === "competition" ? <Trophy size={22} /> : <Clock3 size={22} />}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniFact label="När" value={nextEvent ? formatDate(nextEvent.date) : "Idag"} />
            <MiniFact label="Nedräkning" value={nextDays === null ? "Redo" : nextDays === 0 ? "Idag" : `${nextDays} dagar`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-v3-text-secondary">
            {nextEvent ? nextEvent.location || "Öppna planeringen och lägg till plats/detaljer." : "Ingen planering krävs för att börja. Logga ett kort pass och välj ett fokus."}
          </p>
        </div>
      </div>
    </div>
  );
}

function DogSwitcherPanel({
  dogs,
  activeId,
  onSelect,
  onAdd,
  sessionsThisWeek,
  minutesThisWeek,
}: {
  dogs: Array<{ id: string; name: string; breed?: string | null; photo_url?: string | null; image_url?: string | null }>;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  sessionsThisWeek: number;
  minutesThisWeek: number;
}) {
  const activeDog = dogs.find((dog) => dog.id === activeId) ?? dogs[0];
  const image = activeDog?.photo_url || activeDog?.image_url;

  return (
    <section className="rounded-[2rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-text-tertiary">Aktiv hund</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-v3-text-primary">{activeDog?.name ?? "Välj hund"}</h2>
          <p className="mt-1 text-sm text-v3-text-secondary">{activeDog?.breed || "Ditt träningsnav"}</p>
        </div>
        <button onClick={onAdd} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-v3-canvas-sunken/70 bg-v3-canvas text-v3-text-secondary hover:bg-v3-canvas-sunken/50" aria-label="Hantera hundar">
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-v3-canvas-sunken/60 bg-gradient-to-br from-v3-brand-500/15 to-v3-accent-traning/10">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <DogIcon className="text-v3-brand-600" size={34} />}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <MiniFact label="Veckan" value={`${sessionsThisWeek} pass`} />
          <MiniFact label="Tid" value={`${minutesThisWeek} min`} />
        </div>
      </div>

      {dogs.length > 1 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {dogs.map((dog) => (
            <button
              key={dog.id}
              onClick={() => onSelect(dog.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-sm font-bold transition",
                dog.id === activeId ? "border-v3-brand-500 bg-v3-brand-500 text-v3-text-inverse" : "border-v3-canvas-sunken/70 bg-v3-canvas text-v3-text-secondary hover:bg-v3-canvas-sunken/50",
              )}
            >
              {dog.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionTile({ icon: Icon, label, hint, value, tone, onClick }: { icon: LucideIcon; label: string; hint: string; value: string; tone: "brand" | "success" | "warm" | "cyan"; onClick: () => void }) {
  const toneClass = {
    brand: "from-v3-brand-500/18 to-v3-brand-500/5 text-v3-brand-700",
    success: "from-v3-brand-300/30 to-v3-brand-500/5 text-v3-brand-700",
    warm: "from-v3-accent-prestation/20 to-v3-accent-prestation/5 text-v3-accent-prestation-text",
    cyan: "from-v3-accent-traning/20 to-v3-accent-traning/5 text-v3-accent-traning-text",
  }[tone];

  return (
    <button onClick={onClick} className="group min-h-[124px] rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-4 text-left shadow-v3-sm transition hover:-translate-y-0.5 hover:border-v3-brand-500/30 hover:bg-v3-canvas">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br", toneClass)}>
          <Icon size={21} />
        </div>
        <ArrowRight size={17} className="text-v3-text-tertiary transition group-hover:translate-x-1 group-hover:text-v3-text-primary" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-text-tertiary">{hint}</p>
        <h3 className="mt-1 text-lg font-black tracking-tight text-v3-text-primary">{label}</h3>
        <p className="mt-1 text-sm text-v3-text-secondary">{value}</p>
      </div>
    </button>
  );
}

function MissionCard({ title, eyebrow, body, action, icon: Icon, onClick, featured }: { title: string; eyebrow: string; body: string; action: string; icon: LucideIcon; onClick: () => void; featured?: boolean }) {
  return (
    <article className={cn("rounded-[1.5rem] border p-5 shadow-v3-sm", featured ? "border-v3-brand-500/25 bg-gradient-to-br from-v3-brand-500/10 to-v3-canvas-elevated" : "border-v3-canvas-sunken/60 bg-v3-canvas-elevated") }>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-v3-brand-500/12 text-v3-brand-700">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-brand-700/80">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-v3-text-primary">{title}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-v3-text-secondary">{body}</p>
      <button onClick={onClick} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-v3-text-primary px-4 text-sm font-black text-v3-text-inverse hover:bg-v3-brand-600">
        {action} <ArrowRight size={15} />
      </button>
    </article>
  );
}

function MetricPanel({ icon: Icon, label, value, unit, note }: { icon: LucideIcon; label: string; value: string; unit: string; note: string }) {
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-text-tertiary">{label}</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-black tracking-[-0.06em] text-v3-text-primary">{value}</span>
            <span className="pb-1 text-sm font-bold text-v3-text-secondary">{unit}</span>
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-v3-brand-500/10 text-v3-brand-700">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-v3-text-secondary">{note}</p>
    </article>
  );
}

function NextEventPanel({ loading, nextEvent, onOpen, onCreate }: { loading: boolean; nextEvent: NextEvent; onOpen: () => void; onCreate: () => void }) {
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Plan" title="Nästa upp" icon={CalendarDays} />
      {loading ? (
        <div className="mt-5 h-28 rounded-2xl v3-skeleton" />
      ) : nextEvent ? (
        <div className="mt-5 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-v3-brand-700">{nextEvent.kind === "competition" ? "Tävling" : "Träning"}</p>
              <h3 className="mt-1 text-xl font-black text-v3-text-primary">{nextEvent.title}</h3>
              <p className="mt-2 text-sm text-v3-text-secondary">{formatDate(nextEvent.date)} · {nextEvent.location || "Ingen plats angiven"}</p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-v3-accent-traning/12 text-v3-accent-traning">
              {nextEvent.kind === "competition" ? <Trophy size={21} /> : <Clock3 size={21} />}
            </div>
          </div>
          <button onClick={onOpen} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-v3-text-primary px-4 text-sm font-black text-v3-text-inverse hover:bg-v3-brand-600">
            Öppna <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-v3-canvas-sunken bg-v3-canvas/60 p-4">
          <h3 className="text-lg font-black text-v3-text-primary">Inget planerat än</h3>
          <p className="mt-2 text-sm leading-6 text-v3-text-secondary">Lägg in nästa tävling eller träningsmål så blir dashboarden en riktig cockpit.</p>
          <button onClick={onCreate} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-v3-brand-500 px-4 text-sm font-black text-v3-text-inverse hover:bg-v3-brand-600">
            Planera tävling <ArrowRight size={15} />
          </button>
        </div>
      )}
    </article>
  );
}

function TrainingFocusPanel({ sessionsThisWeek, minutesThisWeek, hasTimeline, onTraining, onStats }: { sessionsThisWeek: number; minutesThisWeek: number; hasTimeline: boolean; onTraining: () => void; onStats: () => void }) {
  const score = Math.min(100, Math.round((sessionsThisWeek / 3) * 100));
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Fokus" title="Veckans träningspuls" icon={BarChart3} />
      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-black tracking-[-0.06em] text-v3-text-primary">{score}%</p>
            <p className="mt-1 text-sm text-v3-text-secondary">mot en stark träningsvecka</p>
          </div>
          <div className="text-right text-sm text-v3-text-secondary">
            <p><strong className="text-v3-text-primary">{sessionsThisWeek}</strong> pass</p>
            <p><strong className="text-v3-text-primary">{minutesThisWeek}</strong> min</p>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-v3-canvas-sunken/60">
          <div className="h-full rounded-full bg-gradient-to-r from-v3-brand-500 to-v3-accent-traning" style={{ width: `${Math.max(8, score)}%` }} />
        </div>
        <p className="mt-4 text-sm leading-6 text-v3-text-secondary">
          {hasTimeline ? "Du har data att bygga vidare på. Titta på statistik när du vill hitta mönster." : "Börja med ett pass. Dashboarden blir smartare när historiken växer."}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={onTraining} className="inline-flex h-10 items-center justify-center rounded-full border border-v3-canvas-sunken/70 bg-v3-canvas px-4 text-sm font-bold text-v3-text-primary hover:bg-v3-canvas-sunken/40">Träning</button>
          <button onClick={onStats} className="inline-flex h-10 items-center justify-center rounded-full border border-v3-canvas-sunken/70 bg-v3-canvas px-4 text-sm font-bold text-v3-text-primary hover:bg-v3-canvas-sunken/40">Statistik</button>
        </div>
      </div>
    </article>
  );
}

function WeeklyRhythmPanel({ sessionsThisWeek, minutesThisWeek }: { sessionsThisWeek: number; minutesThisWeek: number }) {
  const days = getCurrentWeekDays();
  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-v3-canvas-elevated p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Rytm" title="Veckans översikt" icon={CheckCircle2} />
      <div className="mt-5 grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={`${day.d}-${day.n}`} className={cn("rounded-2xl border p-3 text-center", day.active ? "border-v3-brand-500 bg-v3-brand-500 text-v3-text-inverse" : index < sessionsThisWeek ? "border-v3-accent-traning/30 bg-v3-accent-traning/10 text-v3-accent-traning-text" : "border-v3-canvas-sunken/60 bg-v3-canvas text-v3-text-secondary")}>
            <p className="text-[11px] font-bold uppercase tracking-wide">{day.d}</p>
            <p className="mt-1 text-lg font-black">{day.n}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniFact label="Pass" value={String(sessionsThisWeek)} />
        <MiniFact label="Minuter" value={String(minutesThisWeek)} />
        <MiniFact label="Mål" value="3 pass" />
      </div>
    </article>
  );
}

function ReadinessPanel({ hasTimeline, sessionsThisWeek, streakDays, nextEvent }: { hasTimeline: boolean; sessionsThisWeek: number; streakDays: number; nextEvent: NextEvent }) {
  const readiness = Math.min(100, Math.round((hasTimeline ? 35 : 0) + Math.min(30, sessionsThisWeek * 10) + Math.min(20, streakDays * 4) + (nextEvent ? 15 : 0)));
  const checks = [
    { label: "Träningshistorik", done: hasTimeline },
    { label: "Veckans aktivitet", done: sessionsThisWeek > 0 },
    { label: "Kontinuitet", done: streakDays > 0 },
    { label: "Nästa plan", done: Boolean(nextEvent) },
  ];

  return (
    <article className="rounded-[1.5rem] border border-v3-canvas-sunken/60 bg-gradient-to-br from-v3-canvas-elevated to-v3-canvas p-5 shadow-v3-sm">
      <SectionHeader eyebrow="Status" title="Team readiness" icon={HeartPulse} />
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-6xl font-black tracking-[-0.07em] text-v3-text-primary">{readiness}</p>
          <p className="text-sm font-bold text-v3-text-secondary">av 100</p>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-v3-brand-500/12 text-v3-brand-700">
          <HeartPulse size={30} />
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-v3-canvas-sunken/60">
        <div className="h-full rounded-full bg-gradient-to-r from-v3-brand-500 via-v3-accent-traning to-v3-accent-prestation" style={{ width: `${Math.max(6, readiness)}%` }} />
      </div>
      <div className="mt-5 space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between gap-3 rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas px-3 py-2">
            <span className="text-sm font-semibold text-v3-text-primary">{check.label}</span>
            <span className={cn("text-xs font-black uppercase tracking-wide", check.done ? "text-v3-brand-700" : "text-v3-text-tertiary")}>{check.done ? "Klar" : "Saknas"}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function SectionHeader({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-v3-text-tertiary">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-v3-text-primary">{title}</h2>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-v3-canvas text-v3-text-secondary border border-v3-canvas-sunken/60">
        <Icon size={20} />
      </div>
    </div>
  );
}

function MiniFact({ label, value, dark: _dark }: { label: string; value: ReactNode; dark?: boolean }) {
  return (
    <div className="rounded-2xl border border-v3-canvas-sunken/60 bg-v3-canvas p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-v3-text-tertiary">{label}</p>
      <p className="mt-1 text-sm font-black text-v3-text-primary">{value}</p>
    </div>
  );
}

function buildMissionText({ hasTimeline, nextEvent, dogName, streakDays }: { hasTimeline: boolean; nextEvent: NextEvent; dogName: string; streakDays: number }) {
  if (!hasTimeline) return `Logga första passet för ${dogName}. Välj ett fokus, skriv 1–2 rader och låt appen börja bygga er träningsbild.`;
  if (nextEvent?.kind === "competition") return `Ni har tävling på gång. Kör ett kort, tryggt pass med fokus på självförtroende och logga känslan efteråt.`;
  if (nextEvent?.kind === "training") return `Följ upp det planerade passet. Sätt ett enda fokus och avsluta med ett tydligt nästa steg.`;
  if (streakDays > 0) return `Behåll rytmen. Logga ett kort pass eller en reflektion innan dagen är slut.`;
  return `Välj ett träningsfokus för ${dogName} och skapa nästa datapunkt i utvecklingen.`;
}
