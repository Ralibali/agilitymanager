import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Dog as DogIcon,
  Trophy,
  Target,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard } from "@/hooks/v3/useV3Dashboard";
import { openV3LogSheet } from "@/hooks/v3/useV3LogSheet";
import { V3DogStrip } from "@/components/v3/V3DogStrip";
import { NextUpCard } from "@/components/v3/NextUpCard";
import { ActivityTimeline } from "@/components/v3/ActivityTimeline";
import { V3EmptyState } from "@/components/v3/V3EmptyState";
import { V3OnboardingWizard } from "@/components/v3/V3OnboardingWizard";
import { HeroPawIllustration } from "@/components/v3/HeroPawIllustration";
import { cn } from "@/lib/utils";

/**
 * Tidsanpassad hälsning.
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
 * v3 Dashboard – Soft UI, lugn premium-känsla.
 * Layout enligt spec:
 *   1. Hero (datum, hälsning, kort beskrivning, primär CTA, illustration)
 *   2. Kompakt hundkort
 *   3. 4 quick-action cards i en rad
 *   4. Nästa upp (vänster) + 2 KPI-kort (höger)
 *   5. Veckans översikt + Senaste aktiviteter
 */
export default function V3HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { greeting, name } = useGreeting();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { stats, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (dogsLoading || !user) return;
    const meta = (user.user_metadata ?? {}) as {
      onboarding_complete?: boolean;
      onboarding_skipped?: boolean;
    };
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

  const today = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 lg:space-y-10 animate-v3-fade-in">
      {/* 1. HERO */}
      <header className="relative overflow-hidden rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 shadow-v3-xs">
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6 p-6 lg:p-9">
          <div className="space-y-3 max-w-2xl">
            <div className="text-[10px] uppercase tracking-[0.1em] font-medium text-v3-text-tertiary">
              {today}
            </div>
            <h1 className="font-v3-display text-[30px] lg:text-[42px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
              {greeting}, {name} <span aria-hidden>👋</span>
            </h1>
            <p className="text-v3-base text-v3-text-secondary max-w-xl leading-relaxed">
              {active?.name
                ? `Liten dag, stort steg. Logga dagens pass med ${active.name} eller planera nästa tävling.`
                : "Liten dag, stort steg. Lägg till din första hund så börjar resan här."}
            </p>
            {active && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={openV3LogSheet}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm"
                >
                  <Plus size={16} strokeWidth={1.8} />
                  Logga pass
                </button>
              </div>
            )}
          </div>
          <div className="hidden md:block w-[220px] h-[180px] shrink-0">
            <HeroPawIllustration className="w-full h-full" />
          </div>
        </div>
      </header>

      {/* 2. KOMPAKT HUNDKORT */}
      {dogsLoading ? (
        <div className="h-24 rounded-v3-2xl v3-skeleton" />
      ) : dogs.length === 0 ? (
        <V3EmptyState
          icon={DogIcon}
          accent="brand"
          title="Lägg till din första hund"
          description="Allt i AgilityManager kretsar kring dina hundar – träning, tävlingar och mål. Ta 30 sekunder och kom igång."
          actions={[
            { label: "Starta guiden", onClick: () => setShowOnboarding(true), icon: Plus },
            {
              label: "Lägg till manuellt",
              onClick: () => navigate("/v3/dogs"),
              variant: "secondary",
            },
          ]}
        />
      ) : active ? (
        <V3DogStrip
          dog={active}
          dogs={dogs}
          activeId={activeId}
          onSelect={setActive}
        />
      ) : null}

      {active && (
        <>
          {/* 3. QUICK ACTIONS – 4 jämna kort */}
          <section aria-label="Snabbåtgärder">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <ActionCard
                icon={Plus}
                title="Logga pass"
                accent="brand"
                onClick={openV3LogSheet}
              />
              <ActionCard
                icon={Trophy}
                title="Planera tävling"
                accent="tavling"
                onClick={() => navigate("/v3/competition?action=new")}
              />
              <ActionCard
                icon={Target}
                title="Sätt mål"
                accent="prestation"
                onClick={() => navigate("/v3/goals?action=new")}
              />
              <ActionCard
                icon={BarChart3}
                title="Se statistik"
                accent="neutral"
                onClick={() => navigate("/v3/stats")}
              />
            </div>
          </section>

          {/* 4. NÄSTA UPP + 2 KPI:er */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
            <div className="lg:col-span-3">
              {dashLoading ? (
                <div className="h-44 rounded-v3-2xl v3-skeleton" />
              ) : (
                <NextUpCard next={nextEvent} />
              )}
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 lg:gap-4">
              {dashLoading ? (
                <>
                  <div className="rounded-v3-2xl v3-skeleton" />
                  <div className="rounded-v3-2xl v3-skeleton" />
                </>
              ) : (
                <>
                  <KpiCard
                    label="Streak"
                    value={String(stats?.streakDays ?? 0)}
                    sub={(stats?.streakDays ?? 0) === 1 ? "dag" : "dagar"}
                  />
                  <KpiCard
                    label="Klarade lopp"
                    value={String(stats?.passedThisMonth ?? 0)}
                    sub="denna månad"
                  />
                </>
              )}
            </div>
          </div>

          {/* 5. VECKANS ÖVERSIKT + SENASTE AKTIVITETER */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
            <section
              aria-label="Veckans översikt"
              className="lg:col-span-3 rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 p-5 lg:p-6 shadow-v3-xs"
            >
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] font-medium text-v3-text-tertiary">
                    Översikt
                  </div>
                  <h2 className="font-v3-display text-[22px] text-v3-text-primary mt-0.5">
                    Veckans översikt
                  </h2>
                </div>
                <span className="text-v3-xs text-v3-text-tertiary">
                  {new Date().toLocaleDateString("sv-SE", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <WeekStat
                  label="Pass"
                  value={String(stats?.sessionsThisWeek ?? 0)}
                  sub="denna vecka"
                />
                <WeekStat
                  label="Minuter"
                  value={String(stats?.minutesThisWeek ?? 0)}
                  sub="aktiv tid"
                />
              </div>
            </section>

            <div className="lg:col-span-2">
              <section
                aria-label="Senaste aktiviteter"
                className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 p-5 lg:p-6 shadow-v3-xs"
              >
                <ActivityTimeline entries={timeline} loading={dashLoading} />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  accent,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  accent: "brand" | "tavling" | "prestation" | "neutral";
  onClick: () => void;
}) {
  const accentClass = {
    brand: "bg-v3-brand-500/10 text-v3-brand-700",
    tavling: "bg-v3-accent-tavlings/10 text-v3-accent-tavlings-text",
    prestation: "bg-v3-accent-prestation/10 text-v3-accent-prestation-text",
    neutral: "bg-v3-canvas-secondary text-v3-text-secondary",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-3 text-left rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 p-4 lg:p-5 hover:border-v3-brand-500/40 hover:shadow-v3-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-v3-brand-500/20"
    >
      <div className={cn("h-10 w-10 rounded-v3-lg grid place-items-center", accentClass)}>
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <h3 className="font-v3-display text-[16px] lg:text-[17px] text-v3-text-primary leading-snug">
        {title}
      </h3>
    </button>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/50 p-4 lg:p-5 shadow-v3-xs flex flex-col justify-between min-h-[120px]">
      <div className="text-[10px] uppercase tracking-[0.1em] font-medium text-v3-text-tertiary">
        {label}
      </div>
      <div>
        <div className="font-v3-display text-[36px] lg:text-[40px] leading-none text-v3-text-primary tabular-nums">
          {value}
        </div>
        <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
      </div>
    </div>
  );
}

function WeekStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-v3-xl bg-v3-canvas-secondary/60 p-4">
      <div className="text-[10px] uppercase tracking-[0.1em] font-medium text-v3-text-tertiary">
        {label}
      </div>
      <div className="font-v3-display text-[32px] leading-none text-v3-text-primary tabular-nums mt-1.5">
        {value}
      </div>
      <div className="text-v3-xs text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}
