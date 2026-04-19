import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Dashboard } from "@/hooks/v3/useV3Dashboard";
import { DogHero } from "@/components/v3/DogHero";
import { StatRow } from "@/components/v3/StatRow";
import { NextUpCard } from "@/components/v3/NextUpCard";
import { ActivityTimeline } from "@/components/v3/ActivityTimeline";

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
  const [name, setName] = useState<string>("där");
  const [greeting, setGreeting] = useState<string>(() => getTimeGreeting());

  useEffect(() => {
    const id = window.setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setName("där");
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
      setName(cleaned && cleaned.length > 0 ? cleaned : "där");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { greeting, name };
}

/**
 * v3 Dashboard – Fas 3.
 * Greeting + dog-hero (med switcher) + Nästa upp + Stats + Timeline.
 * All data hämtas från Supabase per aktiv hund.
 */
export default function V3HomePage() {
  const navigate = useNavigate();
  const { greeting, name } = useGreeting();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const { stats, nextEvent, timeline, loading: dashLoading } = useV3Dashboard(activeId);

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 lg:space-y-10">
      {/* Greeting */}
      <header className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
          {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
          {greeting}, {name}.
        </h1>
      </header>

      {/* Dog hero */}
      {dogsLoading ? (
        <div className="h-28 rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse" />
      ) : (
        <DogHero
          dogs={dogs}
          active={active}
          activeId={activeId}
          onSelect={setActive}
          onAddDog={() => navigate("/v3/dogs")}
        />
      )}

      {active && (
        <>
          {/* Nästa upp + stats sida vid sida på desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
            <div className="lg:col-span-3">
              {dashLoading ? (
                <div className="h-44 rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse" />
              ) : (
                <NextUpCard next={nextEvent} />
              )}
            </div>
            <div className="lg:col-span-2 space-y-3">
              {dashLoading ? (
                <>
                  <div className="h-20 rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse" />
                  <div className="h-20 rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 animate-pulse" />
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
