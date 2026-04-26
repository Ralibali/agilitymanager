import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Dog as DogIcon, Trophy, Target, BarChart3, Heart, CalendarDays, Flame, Medal, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard } from "@/hooks/v3/useV3Dashboard";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { DogHero } from "@/components/v3/DogHero";
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

  const streakDays = stats?.streakDays ?? 0;
  const passedThisMonth = stats?.passedThisMonth ?? 0;
  const hasTimeline = timeline.length > 0;

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (dogsLoading || !user) return;
    const meta = (user.user_metadata ?? {}) as { onboarding_complete?: boolean; onboarding_skipped?: boolean };
    const done = meta.onboarding_complete || meta.onboarding_skipped;
    if (!done && dogs.length === 0) setShowOnboarding(true);
  }, [user, dogs, dogsLoading]);

  if (showOnboarding) {
    return (
      <V3OnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="max-w-[1180px] mx-auto px-5 lg:px-10 py-6 lg:py-9 space-y-4 lg:space-y-5 animate-v3-fade-in">
      <DashboardHero greeting={greeting} name={name} dogName={active?.name} hasActivity={hasTimeline} />

      {dogsLoading ? (
        <div className="h-28 rounded-v3-2xl v3-skeleton" />
      ) : dogs.length === 0 ? (
        <V3EmptyState
          icon={DogIcon}
          accent="brand"
          title="Lägg till din första hund"
          description="Allt i AgilityManager kretsar kring dina hundar – träning, tävlingar och mål. Ta 30 sekunder och kom igång."
          actions={[
            { label: "Starta guiden", onClick: () => setShowOnboarding(true), icon: Plus },
            { label: "Lägg till manuellt", onClick: () => navigate("/v3/dogs"), variant: "secondary" },
          ]}
        />
      ) : (
        <DogHero dogs={dogs} active={active} activeId={activeId} onSelect={setActive} onAddDog={() => navigate("/v3/dogs")} />
      )}

      {active && (
        <>
          <section aria-label="Snabbstart" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <ActionCard icon={Plus} title="Logga pass" description="Registrera ett träningspass" accent="brand" onClick={openV3LogSheet} />
            <ActionCard icon={CalendarDays} title="Planera tävling" description="Se och anmäl till tävlingar" accent="tavling" onClick={() => navigate("/v3/competition?action=new")} />
            <ActionCard icon={Target} title="Sätt mål" description="Fokusera och följ din plan" accent="prestation" onClick={() => navigate("/v3/goals?action=new")} />
            <ActionCard icon={BarChart3} title="Se statistik" description="Följ utveckling och resultat" accent="neutral" onClick={() => navigate("/v3/stats")} />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
            <NextUpSoftCard loading={dashLoading} hasNext={Boolean(nextEvent)} hasActivity={hasTimeline} onOpen={() => navigate("/v3/competition")} onLog={openV3LogSheet} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard
                icon={Flame}
                label="Streak"
                value={String(streakDays)}
                suffix={streakDays === 1 ? "dag" : "dagar i rad"}
                note={streakDays > 0 ? "Fortsätt bygga rutinen." : "Logga första passet för att starta en streak."}
                tone="warm"
              />
              <MetricCard
                icon={Medal}
                label="Klarade lopp denna månad"
                value={String(passedThisMonth)}
                suffix="lopp"
                note={passedThisMonth > 0 ? "Bra jobbat, ni är på väg." : "När du loggar resultat visas framstegen här."}
                tone="green"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-4">
            <WeeklyOverviewCard hasActivity={hasTimeline} />
            <ActivityTimeline entries={timeline} loading={dashLoading} />
          </div>
        </>
      )}
    </div>
  );
}

function DashboardHero({ greeting, name, dogName, hasActivity }: { greeting: string; name: string; dogName?: string; hasActivity: boolean }) {
  return (
    <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-v3-canvas-elevated via-v3-canvas-elevated to-[#f5ead7] border border-v3-canvas-sunken/50 p-6 lg:p-8 shadow-v3-sm min-h-[220px]">
      <div className="absolute inset-y-0 right-0 hidden md:block w-[42%] pointer-events-none" aria-hidden="true">
        <div className="absolute right-10 top-10 h-14 w-14 rounded-full bg-[#f0cf82]/70" />
        <div className="absolute right-0 bottom-0 h-32 w-[420px] rounded-tl-full bg-v3-brand-500/10" />
        <div className="absolute right-28 bottom-10 h-16 w-32 rounded-full bg-v3-brand-500/10 blur-sm" />
        <div className="absolute right-44 bottom-16 h-16 w-1.5 rounded-full bg-v3-brand-500/35" />
        <div className="absolute right-24 bottom-16 h-20 w-1.5 rounded-full bg-v3-brand-500/30" />
        <div className="absolute right-44 bottom-[118px] h-1.5 w-32 rounded-full bg-v3-brand-500/35" />
        <div className="absolute right-24 bottom-[102px] h-1.5 w-32 rounded-full bg-v3-brand-500/25" />
        <div className="absolute right-8 bottom-8 h-20 w-20 rounded-[28px] bg-white/70 border border-white/80 shadow-v3-sm grid place-items-center">
          <DogIcon size={34} strokeWidth={1.5} className="text-v3-brand-700" />
        </div>
      </div>
      <div className="relative max-w-2xl">
        <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
          {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="font-v3-display text-[38px] lg:text-[52px] leading-[1.02] tracking-[-0.035em] text-v3-text-primary mt-4">
          {greeting === "Hej" ? "Hej" : greeting}, {name}
        </h1>
        <p className="text-v3-base lg:text-v3-lg text-v3-text-secondary max-w-xl mt-3 leading-relaxed">
          {dogName
            ? hasActivity
              ? `Fortsätt bygga rutinen tillsammans med ${dogName}. Små steg varje dag skapar tryggare träning.`
              : `Kom igång med ${dogName} genom att logga första passet, sätta ett mål eller planera nästa tävling.`
            : "Kom igång genom att lägga till hund, logga pass och samla utvecklingen på ett ställe."}
        </p>
        <button type="button" onClick={openV3LogSheet} className="mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-v3-base bg-v3-text-primary text-white text-v3-sm font-medium hover:bg-v3-brand-700 transition-colors shadow-v3-sm">
          <Plus size={17} /> Logga pass
        </button>
      </div>
    </header>
  );
}

function ActionCard({ icon: Icon, title, description, accent, onClick }: { icon: LucideIcon; title: string; description: string; accent: "brand" | "tavling" | "prestation" | "neutral"; onClick: () => void }) {
  const accentClass = {
    brand: "bg-v3-brand-500/10 text-v3-brand-700",
    tavling: "bg-v3-accent-tavlings/12 text-v3-accent-tavlings",
    prestation: "bg-v3-accent-prestation/12 text-v3-accent-prestation",
    neutral: "bg-v3-canvas-sunken/70 text-v3-text-secondary",
  }[accent];
  return (
    <button type="button" onClick={onClick} className="group text-left rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-brand-500/30 hover:shadow-v3-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-v3-brand-500/20">
      <div className="flex items-center gap-3">
        <div className={cn("h-11 w-11 rounded-full grid place-items-center shrink-0", accentClass)}><Icon size={18} strokeWidth={1.8} /></div>
        <div className="min-w-0">
          <h3 className="font-v3-display text-v3-lg text-v3-text-primary leading-tight">{title}</h3>
          <p className="text-v3-sm text-v3-text-secondary mt-0.5 truncate">{description}</p>
        </div>
      </div>
    </button>
  );
}

function NextUpSoftCard({ loading, hasNext, hasActivity, onOpen, onLog }: { loading: boolean; hasNext: boolean; hasActivity: boolean; onOpen: () => void; onLog: () => void }) {
  if (loading) return <div className="h-[164px] rounded-v3-2xl v3-skeleton" />;
  return (
    <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs min-h-[164px]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Nästa upp</h2>
        <button type="button" onClick={onOpen} className="h-8 px-3 rounded-v3-base border border-v3-canvas-sunken/60 text-v3-xs font-medium text-v3-text-secondary hover:bg-v3-canvas-sunken/60 transition-colors">Visa kalender</button>
      </div>
      <div className="flex items-start gap-4">
        <div className="w-16 rounded-v3-lg bg-v3-canvas-sunken/60 p-2 text-center shrink-0">
          <div className="text-[10px] uppercase tracking-[0.08em] text-v3-text-tertiary">Nästa</div>
          <div className="font-v3-display text-[28px] leading-none text-v3-text-primary mt-1">+</div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-v3-text-tertiary mt-1">Steg</div>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-v3-brand-500/10 px-2.5 py-1 text-v3-xs font-medium text-v3-brand-700">{hasNext ? "Tävling" : hasActivity ? "Träning" : "Kom igång"}</span>
          <h3 className="font-v3-display text-v3-xl text-v3-text-primary mt-2">{hasNext ? "Kommande aktivitet" : hasActivity ? "Planera nästa pass" : "Logga första passet"}</h3>
          <p className="text-v3-sm text-v3-text-secondary mt-1">{hasNext ? "Du har något på gång. Planera nästa pass runt kommande aktivitet." : hasActivity ? "Följ upp känslan från senaste passet och välj ett tydligt fokus." : "Börja med ett enkelt pass. När historiken växer får du bättre överblick här."}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-v3-xs text-v3-text-tertiary"><span>Träning</span><span>Mål</span><span>Tävling</span></div>
        </div>
      </div>
      {!hasNext && <button type="button" onClick={onLog} className="mt-4 text-v3-sm font-medium text-v3-brand-700 hover:text-v3-brand-900">Logga ett pass →</button>}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, suffix, note, tone }: { icon: LucideIcon; label: string; value: string; suffix: string; note: string; tone: "warm" | "green" }) {
  const toneClass = tone === "warm" ? "bg-orange-100 text-orange-700" : "bg-v3-brand-500/10 text-v3-brand-700";
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs min-h-[164px]">
      <div className="flex items-start justify-between gap-3"><h2 className="font-v3-display text-v3-xl text-v3-text-primary leading-tight">{label}</h2><div className={cn("h-12 w-12 rounded-full grid place-items-center shrink-0", toneClass)}><Icon size={20} strokeWidth={1.7} /></div></div>
      <div className="mt-5 flex items-end gap-2"><div className="font-v3-display text-[40px] leading-none text-v3-text-primary tabular-nums">{value}</div><div className="text-v3-sm text-v3-text-secondary pb-1">{suffix}</div></div>
      <p className="text-v3-sm text-v3-text-secondary mt-4">{note}</p>
    </div>
  );
}

function WeeklyOverviewCard({ hasActivity }: { hasActivity: boolean }) {
  const days = [{ d: "Mån", n: "28", done: false }, { d: "Tis", n: "29", done: false }, { d: "Ons", n: "30", done: false }, { d: "Tors", n: "1", done: false }, { d: "Fre", n: "2", done: false }, { d: "Lör", n: "3", active: true }, { d: "Sön", n: "4", done: false }];
  return (
    <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs">
      <div className="flex items-center justify-between mb-5"><h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Veckans översikt</h2><button type="button" className="h-8 px-3 rounded-v3-base border border-v3-canvas-sunken/60 text-v3-xs font-medium text-v3-text-secondary hover:bg-v3-canvas-sunken/60 transition-colors">Visa vecka</button></div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => <div key={`${day.d}-${day.n}`} className={cn("rounded-v3-lg px-2 py-3 text-center border", day.active ? "border-v3-brand-500 bg-v3-brand-500/5" : "border-transparent bg-v3-canvas-sunken/30")}><div className="text-[10px] uppercase tracking-[0.08em] text-v3-text-tertiary">{day.d}</div><div className="font-v3-display text-v3-xl text-v3-text-primary mt-1">{day.n}</div><div className="text-v3-brand-600 text-v3-sm mt-1">{day.done ? "✓" : "•"}</div></div>)}
      </div>
      <div className="mt-5"><div className="flex justify-between text-v3-sm text-v3-text-secondary mb-2"><span>{hasActivity ? "Följ veckans pass här" : "Inga pass loggade denna vecka"}</span><span>{hasActivity ? "—" : "0%"}</span></div><div className="h-2 rounded-full bg-v3-canvas-sunken overflow-hidden"><div className={cn("h-full rounded-full bg-v3-brand-500", hasActivity ? "w-[20%]" : "w-0")} /></div></div>
    </section>
  );
}
