import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Dog as DogIcon, Trophy, Target, BarChart3, Heart, Sparkles, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard } from "@/hooks/v3/useV3Dashboard";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { DogHero } from "@/components/v3/DogHero";
import { StatRow } from "@/components/v3/StatRow";
import { NextUpCard } from "@/components/v3/NextUpCard";
import { ActivityTimeline } from "@/components/v3/ActivityTimeline";
import { V3EmptyState } from "@/components/v3/V3EmptyState";
import { V3OnboardingWizard } from "@/components/v3/V3OnboardingWizard";
import { cn } from "@/lib/utils";

/**
 * Tidsanpassad hälsning. Synk med /design-demo.
 */
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
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
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

/**
 * v3 Dashboard.
 * Fokus: action-first + relation. Användaren ska snabbt förstå vad nästa steg är
 * och känna att appen följer teamets resa över tid.
 */
export default function V3HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { greeting, name } = useGreeting();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { stats, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);

  // Onboarding-trigger: visa wizarden för nya användare som saknar hund och inte
  // tidigare slutfört eller hoppat över guiden.
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
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 lg:space-y-10 animate-v3-fade-in">
      {/* Greeting */}
      <header className="relative overflow-hidden rounded-v3-2xl bg-gradient-to-br from-v3-canvas-elevated via-v3-canvas-elevated to-v3-brand-500/10 border border-v3-canvas-sunken/40 p-6 lg:p-8 shadow-v3-sm">
        <div className="absolute right-[-48px] top-[-48px] h-40 w-40 rounded-full bg-v3-brand-500/10 blur-2xl" />
        <div className="absolute left-[-60px] bottom-[-70px] h-44 w-44 rounded-full bg-v3-accent-prestation/10 blur-2xl" />
        <div className="relative space-y-3 max-w-3xl">
          <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
            {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="font-v3-display text-[34px] lg:text-[50px] leading-[1.02] tracking-[-0.035em] text-v3-text-primary">
            {greeting}, {name}.
          </h1>
          <p className="text-v3-base lg:text-v3-lg text-v3-text-secondary max-w-2xl">
            Idag handlar det inte bara om pass och resultat. Det handlar om att förstå {active?.name ? active.name : "din hund"}, bygga självförtroende och ta nästa lilla steg tillsammans.
          </p>
          {active && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 border border-v3-canvas-sunken/50 px-3 py-1.5 text-v3-xs font-medium text-v3-text-secondary">
                <Heart size={13} className="text-v3-brand-600" /> Team {active.name}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 border border-v3-canvas-sunken/50 px-3 py-1.5 text-v3-xs font-medium text-v3-text-secondary">
                <Sparkles size={13} className="text-v3-accent-prestation" /> Varje pass räknas
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Dog hero / empty-state */}
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
        <div className="space-y-4">
          <DogHero
            dogs={dogs}
            active={active}
            activeId={activeId}
            onSelect={setActive}
            onAddDog={() => navigate("/v3/dogs")}
          />
        </div>
      )}

      {active && (
        <>
          <section className="rounded-v3-2xl bg-v3-text-primary text-v3-text-inverse overflow-hidden shadow-v3-xl">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-0">
              <div className="p-6 lg:p-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-medium text-white/75">
                  <Sparkles size={13} /> Dagens teamkänsla
                </div>
                <h2 className="font-v3-display text-[28px] lg:text-[36px] leading-tight tracking-[-0.02em]">
                  Vad vill du att {active.name} ska känna efter dagens pass?
                </h2>
                <p className="text-v3-base text-white/70 max-w-xl">
                  Välj ett mjukt fokus innan du loggar. Appen ska inte bara mäta prestation – den ska hjälpa dig skapa trygghet, riktning och bättre träning över tid.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Självförtroende', 'Fokus', 'Glädje', 'Fart', 'Trygghet'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={openV3LogSheet}
                      className="rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 text-v3-sm text-white/85 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.06] p-6 lg:p-7 flex flex-col justify-between gap-5 border-t lg:border-t-0 lg:border-l border-white/10">
                <div className="space-y-3">
                  <MiniRelationStat label="Pass i streak" value={String(stats?.streakDays ?? 0)} />
                  <MiniRelationStat label="Klarade lopp denna månad" value={String(stats?.passedThisMonth ?? 0)} />
                </div>
                <button
                  type="button"
                  onClick={openV3LogSheet}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-v3-base bg-white text-v3-text-primary text-v3-sm font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus size={16} /> Logga med känsla
                </button>
              </div>
            </div>
          </section>

          <section aria-label="Snabbstart" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Vad vill du göra nu?</h2>
                <p className="text-v3-sm text-v3-text-secondary mt-1">
                  De vanligaste flödena samlade på ett ställe.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ActionCard
                icon={Plus}
                title="Logga pass"
                description="Spara dagens träning på några sekunder."
                cta="Öppna loggning"
                accent="brand"
                onClick={openV3LogSheet}
              />
              <ActionCard
                icon={Trophy}
                title="Tävling"
                description="Lägg in planerad start eller resultat."
                cta="Till tävlingar"
                accent="tavling"
                onClick={() => navigate("/v3/competition?action=new")}
              />
              <ActionCard
                icon={Target}
                title="Nytt mål"
                description="Sätt fokus för veckan eller säsongen."
                cta="Skapa mål"
                accent="prestation"
                onClick={() => navigate("/v3/goals?action=new")}
              />
              <ActionCard
                icon={BarChart3}
                title="Se utveckling"
                description="Följ statistik och trend för aktiv hund."
                cta="Visa statistik"
                accent="neutral"
                onClick={() => navigate("/v3/stats")}
              />
            </div>
          </section>

          <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-v3-lg bg-v3-accent-halsa/12 text-v3-accent-halsa grid place-items-center shrink-0">
                <Heart size={18} strokeWidth={1.7} />
              </div>
              <div>
                <h2 className="font-v3-display text-v3-xl text-v3-text-primary">Nästa bästa steg</h2>
                <p className="text-v3-sm text-v3-text-secondary mt-1">
                  {nextEvent
                    ? "Du har något på gång. Se nästa aktivitet och planera träningen runt den."
                    : "Logga ett pass eller sätt ett mål så börjar dashboarden ge mer relevanta insikter."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={nextEvent ? () => navigate("/v3/competition") : openV3LogSheet}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
            >
              {nextEvent ? "Se nästa upp" : "Logga första steget"}
            </button>
          </section>

          {/* Nästa upp + stats sida vid sida på desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
            <div className="lg:col-span-3">
              {dashLoading ? (
                <div className="h-44 rounded-v3-2xl  v3-skeleton" />
              ) : (
                <NextUpCard next={nextEvent} />
              )}
            </div>
            <div className="lg:col-span-2 space-y-3">
              {dashLoading ? (
                <>
                  <div className="h-20 rounded-v3-xl  v3-skeleton" />
                  <div className="h-20 rounded-v3-xl  v3-skeleton" />
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <CompactStat
                    label="Streak"
                    value={String(stats?.streakDays ?? 0)}
                    sub={(stats?.streakDays ?? 0) === 1 ? "dag" : "dagar"}
                  />
                  <CompactStat
                    label="Klarade lopp"
                    value={String(stats?.passedThisMonth ?? 0)}
                    sub="denna månad"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Vecko-stats */}
          <section aria-label="Veckans översikt" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Veckan</h2>
              <span className="text-v3-xs text-v3-text-tertiary">
                {new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
              </span>
            </div>
            <StatRow stats={stats} />
          </section>

          {/* Timeline */}
          <ActivityTimeline entries={timeline} loading={dashLoading} />
        </>
      )}
    </div>
  );
}

function MiniRelationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-v3-xl bg-white/10 border border-white/10 p-4">
      <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-white/55">{label}</div>
      <div className="font-v3-display text-[34px] leading-none mt-2 text-white tabular-nums">{value}</div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  cta,
  accent,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  accent: "brand" | "tavling" | "prestation" | "neutral";
  onClick: () => void;
}) {
  const accentClass = {
    brand: "bg-v3-brand-500/10 text-v3-brand-700",
    tavling: "bg-v3-accent-tavlings/12 text-v3-accent-tavlings",
    prestation: "bg-v3-accent-prestation/12 text-v3-accent-prestation",
    neutral: "bg-v3-canvas-sunken/70 text-v3-text-secondary",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 hover:border-v3-brand-500/35 hover:shadow-v3-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-v3-brand-500/20"
    >
      <div className={cn("h-10 w-10 rounded-v3-lg grid place-items-center", accentClass)}>
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <h3 className="font-v3-display text-v3-xl text-v3-text-primary mt-4">{title}</h3>
      <p className="text-v3-sm text-v3-text-secondary mt-1 min-h-[40px]">{description}</p>
      <div className="text-v3-sm font-medium text-v3-brand-700 mt-4 group-hover:translate-x-0.5 transition-transform">
        {cta} →
      </div>
    </button>
  );
}

function CompactStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
        {label}
      </div>
      <div className="font-v3-display text-[32px] leading-none mt-1.5 text-v3-text-primary tabular-nums">
        {value}
      </div>
      <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}
