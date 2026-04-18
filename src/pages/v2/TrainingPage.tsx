import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Activity, Filter, Timer, Download } from "lucide-react";
import { startOfWeek, subWeeks, format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  PageHeader,
  DSButton,
  DSCard,
  DSEmptyState,
  MetricCard,
  PageSkeleton,
  SessionCard,
  SegmentedControl,
} from "@/components/ds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store } from "@/lib/store";
import type { Dog, TrainingSession } from "@/types";
import { LogTrainingDialog } from "@/components/v2/LogTrainingDialog";
import { TrainingHeatmap } from "@/components/v2/TrainingHeatmap";
import CoachVideoAnalysis from "@/components/training/CoachVideoAnalysis";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

type Range = "7d" | "30d" | "3m" | "all";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 dgr",
  "30d": "30 dgr",
  "3m": "3 mån",
  all: "Allt",
};

function rangeCutoff(r: Range): Date | null {
  const now = new Date();
  switch (r) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "3m":
      return new Date(now.getTime() - 90 * 86400000);
    case "all":
      return null;
  }
}

export default function TrainingPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dogFilter, setDogFilter] = useState<string>("all");
  const [range, setRange] = useState<Range>("30d");
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = async () => {
    const [d, t] = await Promise.all([store.getDogs(), store.getTraining()]);
    setDogs(d);
    setSessions(t);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const cutoff = rangeCutoff(range);
    return sessions.filter(
      (s) =>
        (dogFilter === "all" || s.dog_id === dogFilter) &&
        (!cutoff || new Date(s.date) >= cutoff),
    );
  }, [sessions, dogFilter, range]);

  const stats = useMemo(() => {
    const totalMin = filtered.reduce((s, t) => s + (t.duration_min || 0), 0);
    const totalReps = filtered.reduce((s, t) => s + (t.reps || 0), 0);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const thisWeek = sessions.filter(
      (s) => new Date(s.date) >= weekStart,
    ).length;
    const lastWeek = sessions.filter((s) => {
      const d = new Date(s.date);
      return d >= lastWeekStart && d < weekStart;
    }).length;
    const trend =
      lastWeek > 0
        ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
        : thisWeek > 0
          ? 100
          : 0;

    return { totalMin, totalReps, count: filtered.length, thisWeek, trend };
  }, [filtered, sessions]);

  const grouped = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    filtered.forEach((s) => {
      const key = format(new Date(s.date), "yyyy-MM");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.info("Inga pass att exportera i vald period");
      return;
    }
    const dogName = (id: string) => dogs.find((d) => d.id === id)?.name || "—";
    const rows = filtered.map((s) => ({
      Datum: format(new Date(s.date), "yyyy-MM-dd"),
      Hund: dogName(s.dog_id),
      Sport: s.sport,
      Typ: s.type,
      "Tid (min)": s.duration_min || 0,
      Repetitioner: s.reps || 0,
      "Hund-energi": s.dog_energy || "",
      "Förar-energi": s.handler_energy || "",
      "Bra noteringar": (s.notes_good || "").replace(/\n/g, " "),
      "Att förbättra": (s.notes_improve || "").replace(/\n/g, " "),
    }));
    downloadCsv(rows, `traning-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success(`Exporterade ${rows.length} pass`);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Träning"
        title="Träningspass"
        subtitle="Logga, följ utveckling och hitta mönster i din träning."
        actions={
          <>
            <DSButton variant="ghost" onClick={handleExportCsv} disabled={filtered.length === 0}>
              <Download className="w-4 h-4" /> CSV
            </DSButton>
            <DSButton variant="secondary" asChild>
              <Link to="/stopwatch">
                <Timer className="w-4 h-4" /> Tidtagarur
              </Link>
            </DSButton>
            <DSButton onClick={() => setDialogOpen(true)} disabled={dogs.length === 0}>
              <Plus className="w-4 h-4" /> Logga pass
            </DSButton>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Pass i perioden" value={stats.count} hint={RANGE_LABEL[range]} />
        <MetricCard
          label="Pass i veckan"
          value={stats.thisWeek}
          trend={
            stats.trend !== 0
              ? {
                  label: `${stats.trend > 0 ? "+" : ""}${stats.trend}% mot förra veckan`,
                  direction: stats.trend > 0 ? "up" : "down",
                }
              : undefined
          }
        />
        <MetricCard
          label="Total tid"
          value={`${Math.round(stats.totalMin / 60)} h`}
          hint={`${stats.totalMin} min`}
        />
        <MetricCard label="Repetitioner" value={stats.totalReps} hint="totalt" />
      </div>

      <TrainingHeatmap sessions={sessions} weeks={12} />

      {/* Coach-videoanalys (Pro) */}
      <section aria-labelledby="coach-video-heading" className="space-y-3">
        <div>
          <p className="text-micro text-text-tertiary uppercase tracking-wide">
            Pro · Expertgranskning
          </p>
          <h2
            id="coach-video-heading"
            className="text-h3 text-text-primary tracking-tight"
          >
            Skicka in en video – få feedback från coach
          </h2>
          <p className="text-small text-text-secondary mt-0.5">
            Ladda upp ett pass, beskriv vad du vill ha hjälp med och få ett konkret svar inom 48 h.
          </p>
        </div>
        <DSCard className="p-0 overflow-hidden">
          <CoachVideoAnalysis dogs={dogs} />
        </DSCard>
      </section>

      {/* Filterrad */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 text-small text-text-tertiary">
          <Filter className="w-3.5 h-3.5" /> Filter
        </div>
        <Select value={dogFilter} onValueChange={setDogFilter}>
          <SelectTrigger className="h-8 w-[180px] rounded-ds-md border-border-default text-small bg-surface">
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
        <SegmentedControl<Range>
          value={range}
          onChange={setRange}
          options={(Object.keys(RANGE_LABEL) as Range[]).map((r) => ({
            value: r,
            label: RANGE_LABEL[r],
          }))}
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={Activity}
            title={dogs.length === 0 ? "Lägg till en hund först" : "Inga pass i perioden"}
            description={
              dogs.length === 0
                ? "Du behöver minst en hund för att kunna logga träning."
                : "Tryck på Logga pass för att börja."
            }
            action={
              dogs.length === 0 ? (
                <DSButton asChild>
                  <Link to="/dogs">Lägg till hund</Link>
                </DSButton>
              ) : (
                <DSButton onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4" /> Logga första passet
                </DSButton>
              )
            }
          />
        </DSCard>
      ) : (
        <div className="space-y-7">
          {grouped.map(([month, items]) => (
            <section key={month}>
              <h2 className="text-micro text-text-tertiary uppercase tracking-wide mb-3">
                {format(new Date(`${month}-01`), "MMMM yyyy", { locale: sv })}
                <span className="ml-2 text-text-tertiary">
                  · {items.length} {items.length === 1 ? "pass" : "pass"}
                </span>
              </h2>
              <div className="space-y-2">
                {items.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    dog={dogs.find((d) => d.id === s.dog_id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <LogTrainingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dogs={dogs}
        onSaved={refresh}
      />
    </div>
  );
}
