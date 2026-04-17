import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Plus, Trophy, Activity, CalendarDays, ArrowRight, Dog as DogIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/store";
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from "@/types";
import {
  PageHeader,
  MetricCard,
  DSCard,
  DSButton,
  DSEmptyState,
  HeroCard,
  Timeline,
  StatusBadge,
  PageSkeleton,
  type TimelineEvent,
} from "@/components/ds";
import { DogAvatar } from "@/components/DogAvatar";

const WEEKLY_GOAL = 5;

export default function HomePage() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      store.getDogs(),
      store.getTraining(),
      store.getCompetitions(),
      store.getPlanned(),
    ]).then(([d, t, c, p]) => {
      if (cancelled) return;
      setDogs(d);
      setTraining(t);
      setCompetitions(c);
      setPlanned(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name.split(" ")[0]);
      });
  }, [user?.id]);

  const stats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekTrainings = training.filter((t) => new Date(t.date) >= weekAgo);
    const totalMin =
      weekTrainings.reduce((s, t) => s + (t.duration_min || 0), 0) /
        Math.max(weekTrainings.length, 1) || 0;

    const passRate =
      competitions.length > 0
        ? Math.round(
            (competitions.filter((c) => c.passed).length / competitions.length) * 100,
          )
        : 0;

    // Streak (consecutive days with at least one training)
    const dates = [...new Set(training.map((t) => t.date))].sort().reverse();
    let streak = 0;
    if (dates.length) {
      streak = 1;
      const today = new Date().toISOString().split("T")[0];
      if (dates[0] !== today && differenceInDays(new Date(today), new Date(dates[0])) > 1) {
        streak = 0;
      } else {
        for (let i = 1; i < dates.length; i++) {
          if (differenceInDays(new Date(dates[i - 1]), new Date(dates[i])) === 1) streak++;
          else break;
        }
      }
    }

    const upcoming = planned
      .filter((p) => new Date(p.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      weekTrainings: weekTrainings.length,
      passRate,
      avgMin: Math.round(totalMin),
      streak,
      nextCompetition: upcoming[0] ?? null,
    };
  }, [training, competitions, planned]);

  const heading = useMemo(() => {
    const today = format(new Date(), "EEEE d MMMM", { locale: sv });
    return today.charAt(0).toUpperCase() + today.slice(1);
  }, []);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (stats.weekTrainings > 0) {
      parts.push(
        `${stats.weekTrainings} ${stats.weekTrainings === 1 ? "pass" : "pass"} senaste veckan.`,
      );
    } else {
      parts.push("Inga pass loggade senaste veckan.");
    }
    if (stats.nextCompetition) {
      const days = differenceInDays(new Date(stats.nextCompetition.date), new Date());
      if (days === 0) parts.push("Tävling idag.");
      else if (days === 1) parts.push("Nästa tävling imorgon.");
      else parts.push(`Nästa tävling om ${days} dagar.`);
    }
    return parts.join(" ");
  }, [stats]);

  const recentEvents = useMemo<TimelineEvent[]>(() => {
    type Item = { date: string; node: TimelineEvent };
    const items: Item[] = [];

    training.slice(0, 8).forEach((t) => {
      const dog = dogs.find((d) => d.id === t.dog_id);
      items.push({
        date: t.date,
        node: {
          id: `t-${t.id}`,
          icon: Activity,
          iconColor: "hsl(var(--brand-500))",
          title: (
            <>
              {t.type} med <span className="text-text-secondary">{dog?.name ?? "okänd hund"}</span>
            </>
          ),
          meta: `${t.duration_min} min · ${t.reps} rep`,
          timestamp: format(new Date(t.date), "d MMM", { locale: sv }),
        },
      });
    });

    competitions.slice(0, 5).forEach((c) => {
      const dog = dogs.find((d) => d.id === c.dog_id);
      items.push({
        date: c.date,
        node: {
          id: `c-${c.id}`,
          icon: Trophy,
          iconColor: "hsl(var(--accent-500-new))",
          title: (
            <>
              {c.event_name} ·{" "}
              <span className={c.passed ? "text-semantic-success" : "text-text-secondary"}>
                {c.passed ? "Godkänd" : c.disqualified ? "Disk" : `${c.faults} fel`}
              </span>
            </>
          ),
          meta: dog?.name,
          timestamp: format(new Date(c.date), "d MMM", { locale: sv }),
        },
      });
    });

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((i) => i.node);
  }, [training, competitions, dogs]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={heading}
        title={`Hej${displayName ? ` ${displayName}` : ""}`}
        subtitle={summary}
        actions={
          <>
            <DSButton variant="secondary" asChild>
              <Link to="/v2/competition">
                <Plus className="w-4 h-4" /> Logga tävling
              </Link>
            </DSButton>
            <DSButton variant="primary" asChild>
              <Link to="/v2/training">
                <Plus className="w-4 h-4" /> Logga träning
              </Link>
            </DSButton>
          </>
        }
      />

      {/* KPI-rad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Pass i veckan"
          value={stats.weekTrainings}
          hint={`av ${WEEKLY_GOAL} mål`}
        />
        <MetricCard
          label="Godkänd-ratio"
          value={
            <span className={stats.passRate >= 80 ? "text-semantic-success" : undefined}>
              {stats.passRate}%
            </span>
          }
          hint={`${competitions.length} starter`}
        />
        <MetricCard
          label="Min/pass"
          value={stats.avgMin}
          hint="senaste veckan"
        />
        <MetricCard
          label="Streak"
          value={`${stats.streak} d`}
          action={
            stats.streak === 0 ? (
              <Link
                to="/v2/training"
                className="text-small text-brand-600 hover:underline whitespace-nowrap"
              >
                Logga första →
              </Link>
            ) : undefined
          }
        />
      </div>

      {/* Tvåkolumns: Hundar | Aktivitet + Nästa tävling */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6">
        <DSCard>
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-h2 text-text-primary">Dina hundar</h2>
            <Link
              to="/v2/dogs"
              className="text-small text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
            >
              Alla hundar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </header>
          {dogs.length === 0 ? (
            <DSEmptyState
              icon={DogIcon}
              title="Inga hundar tillagda"
              description="Lägg till din första hund för att börja logga träning och tävling."
              action={
                <DSButton asChild>
                  <Link to="/v2/dogs">Lägg till hund</Link>
                </DSButton>
              }
            />
          ) : (
            <ul className="space-y-1.5">
              {dogs.map((dog) => {
                const passes = training.filter((t) => t.dog_id === dog.id).length;
                const compResults = competitions.filter((c) => c.dog_id === dog.id);
                const cleanRatio =
                  compResults.length > 0
                    ? Math.round(
                        (compResults.filter((c) => c.passed && c.faults === 0).length /
                          compResults.length) *
                          100,
                      )
                    : 0;
                return (
                  <li
                    key={dog.id}
                    className="flex items-center gap-3 py-2 px-1 rounded-ds-sm hover:bg-subtle transition-colors"
                  >
                    <DogAvatar dog={dog} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body text-text-primary truncate">{dog.name}</span>
                        {compResults.length === 0 && passes < 3 && (
                          <StatusBadge variant="info" label="Ny hund" />
                        )}
                        {cleanRatio === 100 && compResults.length >= 3 && (
                          <StatusBadge variant="success" label="100% nollrundor" />
                        )}
                      </div>
                      <p className="text-small text-text-tertiary truncate">
                        {dog.breed || "—"} · {dog.competition_level}
                      </p>
                    </div>
                    <span className="text-small text-text-tertiary tabular-nums">
                      {passes} pass
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DSCard>

        <div className="space-y-5">
          <DSCard>
            <header className="flex items-center justify-between mb-4">
              <h2 className="text-h2 text-text-primary">Senaste aktivitet</h2>
            </header>
            {recentEvents.length === 0 ? (
              <DSEmptyState
                icon={Activity}
                title="Inget loggat ännu"
                description="Loggade pass och tävlingar dyker upp här."
              />
            ) : (
              <Timeline events={recentEvents} />
            )}
          </DSCard>

          {stats.nextCompetition ? (
            <HeroCard
              eyebrow="Nästa tävling"
              icon={CalendarDays}
              title={stats.nextCompetition.event_name}
              description={
                <>
                  {format(new Date(stats.nextCompetition.date), "EEEE d MMMM", { locale: sv })}
                  {stats.nextCompetition.location ? ` · ${stats.nextCompetition.location}` : ""}
                </>
              }
              action={
                <DSButton variant="secondary" asChild className="bg-white/10 border-white/15 text-text-on-inverse hover:bg-white/15">
                  <Link to="/v2/competition">
                    Se tävling <ArrowRight className="w-4 h-4" />
                  </Link>
                </DSButton>
              }
            />
          ) : (
            <HeroCard
              variant="surface"
              eyebrow="Tävling"
              icon={Trophy}
              title="Inga kommande tävlingar"
              description="Anmäl dig till nästa tävling så syns den här."
              action={
                <DSButton variant="secondary" asChild>
                  <Link to="/v2/competition">
                    Hitta tävlingar <ArrowRight className="w-4 h-4" />
                  </Link>
                </DSButton>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
