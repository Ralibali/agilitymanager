import { useEffect, useMemo, useState } from "react";
import { Trophy, Calendar, Star, ListChecks, Filter, ExternalLink, Plus } from "lucide-react";
import { startOfYear, format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  PageHeader,
  DSCard,
  DSButton,
  DSEmptyState,
  PageSkeleton,
  MetricCard,
  SegmentedControl,
  CompetitionCard,
  ResultRow,
} from "@/components/ds";
import { AgilityDataAttribution } from "@/components/competitions/AgilityDataAttribution";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { store } from "@/lib/store";
import type { Dog, CompetitionResult, PlannedCompetition } from "@/types";
import type { Competition } from "@/types/competitions";

type Tab = "calendar" | "mine" | "results" | "import";

const TABS: { value: Tab; label: string; icon: typeof Calendar }[] = [
  { value: "calendar", label: "Kalender", icon: Calendar },
  { value: "mine", label: "Mina", icon: Star },
  { value: "results", label: "Resultat", icon: Trophy },
  { value: "import", label: "Import", icon: ListChecks },
];

export default function CompetitionPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("calendar");
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dogFilter, setDogFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<"all" | "Agility" | "Hoopers">("all");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      store.getDogs(),
      store.getCompetitions(),
      store.getPlanned(),
      supabase
        .from("competitions")
        .select("*")
        .gte("date_start", new Date().toISOString().slice(0, 10))
        .order("date_start", { ascending: true })
        .limit(60),
    ]).then(([d, r, p, comp]) => {
      setDogs(d);
      setResults(r);
      setPlanned(p);
      setCompetitions((comp.data ?? []) as Competition[]);
      setLoading(false);
    });
  }, [user]);

  const filteredResults = useMemo(() => {
    return results.filter(
      (r) =>
        (dogFilter === "all" || r.dog_id === dogFilter) &&
        (sportFilter === "all" || r.sport === sportFilter),
    );
  }, [results, dogFilter, sportFilter]);

  const stats = useMemo(() => {
    const yearStart = startOfYear(new Date());
    const yearResults = results.filter((r) => new Date(r.date) >= yearStart);
    const passed = yearResults.filter((r) => r.passed).length;
    const podium = yearResults.filter(
      (r) => r.placement && r.placement <= 3 && !r.disqualified,
    ).length;
    const upcoming = planned.filter((p) => new Date(p.date) >= new Date()).length;
    return {
      yearTotal: yearResults.length,
      passed,
      podium,
      upcoming,
    };
  }, [results, planned]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tävling"
        title="Tävlingar"
        subtitle="Hitta tävlingar, planera ditt år och följ dina resultat över tid."
      />

      <AgilityDataAttribution />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Starter i år" value={stats.yearTotal} hint="alla discipliner" />
        <MetricCard
          label="Godkända"
          value={stats.passed}
          hint={stats.yearTotal > 0 ? `${Math.round((stats.passed / stats.yearTotal) * 100)}%` : "—"}
        />
        <MetricCard label="Pallplatser" value={stats.podium} hint="topp 3 i år" />
        <MetricCard label="Planerade" value={stats.upcoming} hint="kommande" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/40 pb-3">
        <div className="inline-flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-ds-sm text-small font-medium transition-colors " +
                  (active
                    ? "bg-subtle text-text-primary"
                    : "text-text-secondary hover:text-text-primary")
                }
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "results" && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-tertiary" />
            <Select value={dogFilter} onValueChange={setDogFilter}>
              <SelectTrigger className="h-8 w-[160px] rounded-ds-md border-border-default text-small bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla hundar</SelectItem>
                {dogs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedControl<"all" | "Agility" | "Hoopers">
              value={sportFilter}
              onChange={setSportFilter}
              options={[
                { value: "all", label: "Alla" },
                { value: "Agility", label: "Agility" },
                { value: "Hoopers", label: "Hoopers" },
              ]}
            />
          </div>
        )}
      </div>

      {tab === "calendar" && <CalendarTab competitions={competitions} />}
      {tab === "mine" && <MineTab planned={planned} dogs={dogs} />}
      {tab === "results" && <ResultsTab results={filteredResults} dogs={dogs} />}
      {tab === "import" && <ImportTab />}
    </div>
  );
}

/* ============ Tab: Kalender ============ */
function CalendarTab({ competitions }: { competitions: Competition[] }) {
  if (competitions.length === 0) {
    return (
      <DSCard>
        <DSEmptyState
          icon={Calendar}
          title="Inga kommande tävlingar"
          description="Vi hittar inga publicerade tävlingar i kalendern just nu. Kom tillbaka snart."
        />
      </DSCard>
    );
  }
  return (
    <div className="space-y-2">
      {competitions.map((c) => {
        const allClasses = [
          ...(c.classes_agility ?? []),
          ...(c.classes_hopp ?? []),
          ...(c.classes_other ?? []),
        ];
        return (
          <CompetitionCard
            key={c.id}
            title={c.competition_name ?? c.club_name ?? "Tävling"}
            club={c.club_name}
            location={c.location}
            dateStart={c.date_start}
            dateEnd={c.date_end}
            registrationDeadline={c.last_registration_date}
            classes={allClasses}
            sport="Agility"
            sourceUrl={c.source_url}
            rightSlot={
              c.source_url ? (
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label="Öppna källa"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}

/* ============ Tab: Mina ============ */
function MineTab({ planned, dogs }: { planned: PlannedCompetition[]; dogs: Dog[] }) {
  if (planned.length === 0) {
    return (
      <DSCard>
        <DSEmptyState
          icon={Star}
          title="Inga planerade tävlingar"
          description="Markera tävlingar som intressanta i kalendern – de hamnar här."
          action={
            <DSButton variant="secondary" disabled>
              <Plus className="w-4 h-4" /> Lägg till manuellt (kommer snart)
            </DSButton>
          }
        />
      </DSCard>
    );
  }
  const byMonth = new Map<string, PlannedCompetition[]>();
  planned
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((p) => {
      const k = format(new Date(p.date), "yyyy-MM");
      if (!byMonth.has(k)) byMonth.set(k, []);
      byMonth.get(k)!.push(p);
    });
  return (
    <div className="space-y-7">
      {Array.from(byMonth.entries()).map(([month, items]) => (
        <section key={month}>
          <h2 className="text-micro text-text-tertiary uppercase tracking-wide mb-3">
            {format(new Date(`${month}-01`), "MMMM yyyy", { locale: sv })}
          </h2>
          <div className="space-y-2">
            {items.map((p) => {
              const dog = dogs.find((d) => d.id === p.dog_id);
              return (
                <CompetitionCard
                  key={p.id}
                  title={p.event_name}
                  club={dog?.name ?? null}
                  location={p.location}
                  dateStart={p.date}
                  sport={dog?.sport === "Hoopers" ? "Hoopers" : "Agility"}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ============ Tab: Resultat ============ */
function ResultsTab({
  results,
  dogs,
}: {
  results: CompetitionResult[];
  dogs: Dog[];
}) {
  if (results.length === 0) {
    return (
      <DSCard>
        <DSEmptyState
          icon={Trophy}
          title="Inga resultat"
          description="Resultat dyker upp här när du loggar dem eller importerar från Agilitydata."
        />
      </DSCard>
    );
  }
  const byMonth = new Map<string, CompetitionResult[]>();
  results.forEach((r) => {
    const k = format(new Date(r.date), "yyyy-MM");
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k)!.push(r);
  });
  return (
    <div className="space-y-7">
      {Array.from(byMonth.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, items]) => (
          <section key={month}>
            <h2 className="text-micro text-text-tertiary uppercase tracking-wide mb-3">
              {format(new Date(`${month}-01`), "MMMM yyyy", { locale: sv })}
              <span className="ml-2 text-text-tertiary">
                · {items.length} {items.length === 1 ? "start" : "starter"}
              </span>
            </h2>
            <div className="space-y-2">
              {items.map((r) => (
                <ResultRow
                  key={r.id}
                  result={r}
                  dog={dogs.find((d) => d.id === r.dog_id)}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

/* ============ Tab: Import ============ */
function ImportTab() {
  return (
    <DSCard>
      <DSEmptyState
        icon={ListChecks}
        title="Importera resultat"
        description="Hämta dina officiella resultat automatiskt från Agilitydata. Den fullständiga import-vyn flyttas hit i nästa fas."
        action={
          <DSButton asChild variant="secondary">
            <a href="/app/competition?tab=import">Gå till klassisk import</a>
          </DSButton>
        }
      />
    </DSCard>
  );
}
