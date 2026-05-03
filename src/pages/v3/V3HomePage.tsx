import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dog as DogIcon,
  Flame,
  HeartPulse,
  Medal,
  Plus,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard, type NextEvent } from "@/hooks/v3/useV3Dashboard";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { ActivityTimeline } from "@/components/v3/ActivityTimeline";
import { V3EmptyState } from "@/components/v3/V3EmptyState";
import { V3OnboardingWizard } from "@/components/v3/V3OnboardingWizard";
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

export default function V3HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { greeting, name } = useGreeting();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { stats, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  if (showOnboarding) {
    return <V3OnboardingWizard onComplete={() => { setShowOnboarding(false); window.location.reload(); }} />;
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1520px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8 animate-v3-fade-in">
      {dogsLoading ? (
        <div className="h-[520px] rounded-[2rem] v3-skeleton" />
      ) : dogs.length === 0 ? (
        <V3EmptyState
          icon={DogIcon}
          accent="brand"
          title="Lägg till din första hund"
          description="Dashboarden blir magisk när den vet vem du tränar med. Lägg till en hund och få en personlig översikt för träning, tävling och mål."
          actions={[
            { label: "Starta guiden", onClick: () => setShowOnboarding(true), icon: Plus },
            { label: "Lägg till manuellt", onClick: () => navigate("/v3/dogs"), variant: "secondary" },
          ]}
        />
      ) : (
        <div className="space-y-5 lg:space-y-6">
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

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionTile icon={Plus} label="Logga pass" hint="30 sek" value="Träning" tone="brand" onClick={openV3LogSheet} />
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
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(245,158,11,0.18),transparent_28%),linear-gradient(135deg,#111923_0%,#121c24_48%,#0d131a_100%)] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.28)] sm:p-7 lg:p-8">
      <div className="absolute right-8 top-8 hidden h-32 w-32 rounded-full bg-amber-400/10 blur-3xl lg:block" />
      <div className="relative z-10 grid min-h-[320px] gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="flex h-full flex-col justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
              <Sparkles size={14} /> Command center
            </div>
            <h1 className="mt-5 max-w-3xl text-balance font-v3-display text-[clamp(2.25rem,5vw,4.9rem)] leading-[0.9] tracking-[-0.06em] text-white">
              {greeting}, {name}.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {dailyBrief}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={onLog} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 text-sm font-extrabold text-slate-950 shadow-[0_14px_36px_rgba(245,158,11,0.28)] transition hover:-translate-y-0.5 hover:bg-amber-300">
              <Plus size={18} /> Logga pass <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>
            <button onClick={onPlan} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-bold text-white transition hover:bg-white/[0.1]">
              <Target size={17} /> Planera bana
            </button>
            <button onClick={onCompetition} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-bold text-white transition hover:bg-white/[0.1]">
              <CalendarDays size={17} /> Tävlingar
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Nästa signal</p>
              <h2 className="mt-1 text-xl font-bold text-white">{nextEvent ? nextEvent.title : `Träna med ${dogName}`}</h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-200">
              {nextEvent?.kind === "competition" ? <Trophy size={22} /> : <Clock3 size={22} />}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniFact label="När" value={nextEvent ? formatDate(nextEvent.date) : "Idag"} />
            <MiniFact label="Nedräkning" value={nextDays === null ? "Redo" : nextDays === 0 ? "Idag" : `${nextDays} dagar`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
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
    <section className="rounded-[2rem] border border-white/10 bg-[#121a22] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aktiv hund</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{activeDog?.name ?? "Välj hund"}</h2>
          <p className="mt-1 text-sm text-slate-400">{activeDog?.breed || "Ditt träningsnav"}</p>
        </div>
        <button onClick={onAdd} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]" aria-label="Hantera hundar">
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-white/10 bg-gradient-to-br from-amber-300/25 to-cyan-300/15">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <DogIcon className="text-amber-200" size={34} />}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <MiniFact label="Veckan" value={`${sessionsThisWeek} pass`} dark />
          <MiniFact label="Tid" value={`${minutesThisWeek} min`} dark />
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
                dog.id === activeId ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
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
    brand: "from-amber-300/20 to-amber-500/5 text-amber-200",
    success: "from-emerald-300/18 to-emerald-500/5 text-emerald-200",
    warm: "from-rose-300/18 to-orange-500/5 text-orange-200",
    cyan: "from-cyan-300/18 to-blue-500/5 text-cyan-200",
  }[tone];

  return (
    <button onClick={onClick} className="group min-h-[124px] rounded-[1.5rem] border border-white/10 bg-[#121a22] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#151f29]">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br", toneClass)}>
          <Icon size={21} />
        </div>
        <ArrowRight size={17} className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-slate-200" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{hint}</p>
        <h3 className="mt-1 text-lg font-black tracking-tight text-white">{label}</h3>
        <p className="mt-1 text-sm text-slate-400">{value}</p>
      </div>
    </button>
  );
}

function MissionCard({ title, eyebrow, body, action, icon: Icon, onClick, featured }: { title: string; eyebrow: string; body: string; action: string; icon: LucideIcon; onClick: () => void; featured?: boolean }) {
  return (
    <article className={cn("rounded-[1.5rem] border p-5", featured ? "border-amber-300/25 bg-gradient-to-br from-amber-300/14 to-[#121a22]" : "border-white/10 bg-[#121a22]") }>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-300/15 text-amber-200">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">{title}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{body}</p>
      <button onClick={onClick} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-950 hover:bg-amber-100">
        {action} <ArrowRight size={15} />
      </button>
    </article>
  );
}

function MetricPanel({ icon: Icon, label, value, unit, note }: { icon: LucideIcon; label: string; value: string; unit: string; note: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#121a22] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-black tracking-[-0.06em] text-white">{value}</span>
            <span className="pb-1 text-sm font-bold text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-amber-200">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{note}</p>
    </article>
  );
}

function NextEventPanel({ loading, nextEvent, onOpen, onCreate }: { loading: boolean; nextEvent: NextEvent; onOpen: () => void; onCreate: () => void }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#121a22] p-5">
      <SectionHeader eyebrow="Plan" title="Nästa upp" icon={CalendarDays} />
      {loading ? (
        <div className="mt-5 h-28 rounded-2xl v3-skeleton" />
      ) : nextEvent ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-amber-200">{nextEvent.kind === "competition" ? "Tävling" : "Träning"}</p>
              <h3 className="mt-1 text-xl font-black text-white">{nextEvent.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{formatDate(nextEvent.date)} · {nextEvent.location || "Ingen plats angiven"}</p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-200">
              {nextEvent.kind === "competition" ? <Trophy size={21} /> : <Clock3 size={21} />}
            </div>
          </div>
          <button onClick={onOpen} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-200">
            Öppna <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4">
          <h3 className="text-lg font-black text-white">Inget planerat än</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Lägg in nästa tävling eller träningsmål så blir dashboarden en riktig cockpit.</p>
          <button onClick={onCreate} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-amber-300 px-4 text-sm font-black text-slate-950 hover:bg-amber-200">
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
    <article className="rounded-[1.5rem] border border-white/10 bg-[#121a22] p-5">
      <SectionHeader eyebrow="Fokus" title="Veckans träningspuls" icon={BarChart3} />
      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-black tracking-[-0.06em] text-white">{score}%</p>
            <p className="mt-1 text-sm text-slate-400">mot en stark träningsvecka</p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p><strong className="text-white">{sessionsThisWeek}</strong> pass</p>
            <p><strong className="text-white">{minutesThisWeek}</strong> min</p>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300" style={{ width: `${Math.max(8, score)}%` }} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          {hasTimeline ? "Du har data att bygga vidare på. Titta på statistik när du vill hitta mönster." : "Börja med ett pass. Dashboarden blir smartare när historiken växer."}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={onTraining} className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-bold text-white hover:bg-white/[0.06]">Träning</button>
          <button onClick={onStats} className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-bold text-white hover:bg-white/[0.06]">Statistik</button>
        </div>
      </div>
    </article>
  );
}

function WeeklyRhythmPanel({ sessionsThisWeek, minutesThisWeek }: { sessionsThisWeek: number; minutesThisWeek: number }) {
  const days = getCurrentWeekDays();
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#121a22] p-5">
      <SectionHeader eyebrow="Rytm" title="Veckans översikt" icon={CheckCircle2} />
      <div className="mt-5 grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={`${day.d}-${day.n}`} className={cn("rounded-2xl border p-3 text-center", day.active ? "border-amber-300 bg-amber-300 text-slate-950" : index < sessionsThisWeek ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-400")}>
            <p className="text-[11px] font-bold uppercase tracking-wide">{day.d}</p>
            <p className="mt-1 text-lg font-black">{day.n}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniFact label="Pass" value={String(sessionsThisWeek)} dark />
        <MiniFact label="Minuter" value={String(minutesThisWeek)} dark />
        <MiniFact label="Mål" value="3 pass" dark />
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
    <article className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.025] p-5">
      <SectionHeader eyebrow="Status" title="Team readiness" icon={HeartPulse} />
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-6xl font-black tracking-[-0.07em] text-white">{readiness}</p>
          <p className="text-sm font-bold text-slate-400">av 100</p>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-emerald-300/15 text-emerald-200">
          <HeartPulse size={30} />
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300" style={{ width: `${Math.max(6, readiness)}%` }} />
      </div>
      <div className="mt-5 space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-sm font-semibold text-slate-300">{check.label}</span>
            <span className={cn("text-xs font-black uppercase tracking-wide", check.done ? "text-emerald-200" : "text-slate-500")}>{check.done ? "Klar" : "Saknas"}</span>
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h2>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-slate-200">
        <Icon size={20} />
      </div>
    </div>
  );
}

function MiniFact({ label, value, dark }: { label: string; value: ReactNode; dark?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/[0.04]" : "border-white/10 bg-white/[0.06]") }>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
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
