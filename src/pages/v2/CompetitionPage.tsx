import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Trophy,
  Calendar,
  Star,
  ListChecks,
  Filter,
  ExternalLink,
  Plus,
  Download,
  FileText,
  Send,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { startOfYear, format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
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
import { AddCompetitionDialog } from "@/components/AddCompetitionDialog";
import { MinaTavlingar } from "@/components/competitions/MinaTavlingar";
import { HoopersKalendar } from "@/components/competitions/HoopersKalendar";
import { AgilityKalendar } from "@/components/competitions/AgilityKalendar";
import { ResultsImporter } from "@/components/competitions/ResultsImporter";
import ImportResultsFromUrl from "@/components/competitions/ImportResultsFromUrl";
import ClassPromotionTracker from "@/components/competitions/ClassPromotionTracker";
import HoopersPointsTracker from "@/components/competitions/HoopersPointsTracker";
import { CleanRunTrendChart } from "@/components/competitions/CleanRunTrendChart";
import { PerformanceTrendChart } from "@/components/competitions/PerformanceTrendChart";
import ShareToFriendDialog from "@/components/ShareToFriendDialog";
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
import { downloadCsv } from "@/lib/csv";
import { downloadPdf } from "@/lib/pdf";
import type { Dog, CompetitionResult, PlannedCompetition } from "@/types";
import type { Competition } from "@/types/competitions";

type Tab = "calendar" | "mine" | "results" | "analysis" | "import";

const TABS: { value: Tab; label: string; icon: typeof Calendar }[] = [
  { value: "calendar", label: "Kalender", icon: Calendar },
  { value: "mine", label: "Mina", icon: Star },
  { value: "results", label: "Resultat", icon: Trophy },
  { value: "analysis", label: "Analys", icon: TrendingUp },
  { value: "import", label: "Import", icon: ListChecks },
];

export default function CompetitionPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("calendar");
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [agilityComps, setAgilityComps] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dogFilter, setDogFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<"all" | "Agility" | "Hoopers">("all");
  const [sportTab, setSportTab] = useState<"agility" | "hoopers">("agility");
  const [shareResult, setShareResult] = useState<CompetitionResult | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [d, r, p, comp] = await Promise.all([
      store.getDogs(),
      store.getCompetitions(),
      store.getPlanned(),
      supabase
        .from("competitions")
        .select("*")
        .gte("date_start", new Date().toISOString().slice(0, 10))
        .order("date_start", { ascending: true })
        .limit(80),
    ]);
    setDogs(d);
    setResults(r);
    setPlanned(p);
    setAgilityComps((comp.data ?? []) as Competition[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredResults = useMemo(
    () =>
      results.filter(
        (r) =>
          (dogFilter === "all" || r.dog_id === dogFilter) &&
          (sportFilter === "all" || r.sport === sportFilter),
      ),
    [results, dogFilter, sportFilter],
  );

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

  const handleDelete = async (id: string) => {
    if (!confirm("Ta bort detta resultat?")) return;
    const { error } = await supabase
      .from("competition_results")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort");
      return;
    }
    toast.success("Resultat borttaget");
    refresh();
  };

  const handleExportCsv = () => {
    const rows = filteredResults.map((r) => {
      const dog = dogs.find((d) => d.id === r.dog_id);
      return {
        Datum: r.date,
        Hund: dog?.name ?? "",
        Sport: r.sport,
        Disciplin: r.discipline,
        Klass: r.competition_level,
        Tävling: r.event_name,
        Arrangör: r.organizer ?? "",
        Fel: r.faults,
        Tid: r.time_sec,
        Plats: r.placement ?? "",
        Godkänd: r.passed ? "Ja" : "Nej",
        Diskad: r.disqualified ? "Ja" : "Nej",
      };
    });
    downloadCsv(rows, "tavlingar.csv");
  };

  const handleExportPdf = () => {
    const rows = filteredResults.map((r) => {
      const dog = dogs.find((d) => d.id === r.dog_id);
      return [
        format(new Date(r.date), "yyyy-MM-dd"),
        dog?.name ?? "",
        r.event_name,
        r.competition_level,
        r.faults.toString(),
        r.time_sec.toString(),
        r.placement?.toString() ?? "",
      ];
    });
    downloadPdf({
      title: "Tävlingsresultat",
      headers: ["Datum", "Hund", "Tävling", "Klass", "Fel", "Tid", "Plats"],
      rows,
      filename: "tavlingar.pdf",
    });
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tävling"
        title="Tävlingar"
        subtitle="Hitta tävlingar, planera ditt år och följ dina resultat över tid."
        actions={
          <AddCompetitionDialog
            dogs={dogs}
            onAdded={refresh}
            trigger={
              <DSButton>
                <Plus className="w-4 h-4" /> Lägg till resultat
              </DSButton>
            }
          />
        }
      />

      <AgilityDataAttribution />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Starter i år" value={stats.yearTotal} hint="alla discipliner" />
        <MetricCard
          label="Godkända"
          value={stats.passed}
          hint={
            stats.yearTotal > 0
              ? `${Math.round((stats.passed / stats.yearTotal) * 100)}%`
              : "—"
          }
        />
        <MetricCard label="Pallplatser" value={stats.podium} hint="topp 3 i år" />
        <MetricCard label="Planerade" value={stats.upcoming} hint="kommande" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/40 pb-3">
        <div className="inline-flex gap-1 flex-wrap">
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

        {tab === "results" && filteredResults.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <DSButton variant="secondary" onClick={handleExportCsv} className="h-8">
              <Download className="w-3.5 h-3.5" /> CSV
            </DSButton>
            <DSButton variant="secondary" onClick={handleExportPdf} className="h-8">
              <FileText className="w-3.5 h-3.5" /> PDF
            </DSButton>
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

      {tab === "calendar" && (
        <CalendarTab
          agilityComps={agilityComps}
          dogs={dogs}
          sportTab={sportTab}
          setSportTab={setSportTab}
        />
      )}
      {tab === "mine" && <MinaTavlingar />}
      {tab === "results" && (
        <ResultsTab
          results={filteredResults}
          dogs={dogs}
          onDelete={handleDelete}
          onShare={setShareResult}
        />
      )}
      {tab === "analysis" && <AnalysisTab dogs={dogs} results={results} />}
      {tab === "import" && (
        <ImportTab dogs={dogs} userId={user?.id ?? ""} onDone={refresh} />
      )}

      {shareResult && (
        <ShareToFriendDialog
          open={!!shareResult}
          onOpenChange={(o) => !o && setShareResult(null)}
          sharedType="result"
          sharedId={shareResult.id}
          sharedData={{
            event_name: shareResult.event_name,
            date: shareResult.date,
            faults: shareResult.faults,
            time_sec: shareResult.time_sec,
            placement: shareResult.placement,
          }}
        />
      )}
    </div>
  );
}

/* ============ Tab: Kalender (Agility + Hoopers) ============ */
function CalendarTab({
  agilityComps,
  dogs,
  sportTab,
  setSportTab,
}: {
  agilityComps: Competition[];
  dogs: Dog[];
  sportTab: "agility" | "hoopers";
  setSportTab: (s: "agility" | "hoopers") => void;
}) {
  const hoopersDogs = useMemo(
    () => dogs.filter((d) => d.sport === "Hoopers" || d.sport === "Båda"),
    [dogs],
  );

  return (
    <div className="space-y-4">
      <SegmentedControl<"agility" | "hoopers">
        value={sportTab}
        onChange={setSportTab}
        options={[
          { value: "agility", label: "Agility" },
          { value: "hoopers", label: "Hoopers" },
        ]}
      />

      {sportTab === "agility" ? (
        agilityComps.length === 0 ? (
          <DSCard>
            <DSEmptyState
              icon={Calendar}
              title="Inga kommande tävlingar"
              description="Vi hittar inga publicerade agility-tävlingar i kalendern just nu."
            />
          </DSCard>
        ) : (
          <div className="space-y-2">
            {agilityComps.map((c) => {
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
        )
      ) : (
        <HoopersKalendar dogs={hoopersDogs} selectedDogId={hoopersDogs[0]?.id ?? null} />
      )}
    </div>
  );
}

/* ============ Tab: Resultat ============ */
function ResultsTab({
  results,
  dogs,
  onDelete,
  onShare,
}: {
  results: CompetitionResult[];
  dogs: Dog[];
  onDelete: (id: string) => void;
  onShare: (r: CompetitionResult) => void;
}) {
  if (results.length === 0) {
    return (
      <DSCard>
        <DSEmptyState
          icon={Trophy}
          title="Inga resultat"
          description="Resultat dyker upp här när du loggar dem manuellt eller importerar från Agilitydata."
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
                <div key={r.id} className="group relative">
                  <ResultRow
                    result={r}
                    dog={dogs.find((d) => d.id === r.dog_id)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => onShare(r)}
                      className="p-1.5 rounded-md hover:bg-subtle text-text-tertiary hover:text-text-primary"
                      aria-label="Dela till vän"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-1.5 rounded-md hover:bg-semantic-danger/10 text-text-tertiary hover:text-semantic-danger"
                      aria-label="Ta bort resultat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

/* ============ Tab: Analys ============ */
function AnalysisTab({
  dogs,
  results,
}: {
  dogs: Dog[];
  results: CompetitionResult[];
}) {
  const [analysisDog, setAnalysisDog] = useState<string>(dogs[0]?.id ?? "");
  const dog = dogs.find((d) => d.id === analysisDog);
  const dogResults = useMemo(
    () => results.filter((r) => r.dog_id === analysisDog),
    [results, analysisDog],
  );
  const hasHoopers = dog?.sport === "Hoopers" || dog?.sport === "Båda";
  const hasAgility = dog?.sport === "Agility" || dog?.sport === "Båda";

  if (dogs.length === 0) {
    return (
      <DSCard>
        <DSEmptyState
          icon={TrendingUp}
          title="Inga hundar"
          description="Lägg till en hund för att kunna se analyser."
        />
      </DSCard>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-small text-text-secondary">Analysera:</label>
        <Select value={analysisDog} onValueChange={setAnalysisDog}>
          <SelectTrigger className="h-9 w-[200px] rounded-ds-md border-border-default bg-surface text-body">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dogs.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dog && dogResults.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={TrendingUp}
            title="Inga resultat för analys"
            description={`${dog.name} saknar loggade tävlingar. Importera eller logga några för att se trender.`}
          />
        </DSCard>
      ) : dog ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {hasAgility && (
            <ClassPromotionTracker results={dogResults} dogs={[dog]} />
          )}
          {hasHoopers && (
            <DSCard>
              <HoopersPointsTracker dogs={[dog]} />
            </DSCard>
          )}
          <CleanRunTrendChart results={dogResults} />
          <PerformanceTrendChart results={dogResults} dogs={[dog]} />
        </div>
      ) : null}
    </div>
  );
}

/* ============ Tab: Import ============ */
function ImportTab({
  dogs,
  userId,
  onDone,
}: {
  dogs: Dog[];
  userId: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <DSCard>
        <header className="mb-4">
          <h2 className="text-h2 text-text-primary">Importera från URL</h2>
          <p className="text-small text-text-tertiary mt-1">
            Klistra in en länk till en specifik tävlings resultatsida på agilitydata.se.
          </p>
        </header>
        <ImportResultsFromUrl dogs={dogs} userId={userId} onImported={onDone} />
      </DSCard>

      <DSCard>
        <header className="mb-4">
          <h2 className="text-h2 text-text-primary">Bulkimport från handlare</h2>
          <p className="text-small text-text-tertiary mt-1">
            Hämta alla dina officiella resultat från agilitydata.se på en gång.
          </p>
        </header>
        <ResultsImporter dogs={dogs} onImported={onDone} />
      </DSCard>
    </div>
  );
}
