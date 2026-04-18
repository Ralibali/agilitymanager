import { useEffect, useMemo, useState } from "react";
import { startOfWeek, subWeeks, format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Trophy, Target, Award, TrendingUp, Calendar as CalIcon } from "lucide-react";
import { store } from "@/lib/store";
import type { Dog, TrainingSession, CompetitionResult } from "@/types";
import {
  PageHeader,
  MetricCard,
  DSCard,
  AIInsightCard,
  PageSkeleton,
} from "@/components/ds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Range = "30d" | "3m" | "year" | "all";

const RANGE_LABEL: Record<Range, string> = {
  "30d": "30 dagar",
  "3m": "3 månader",
  year: "I år",
  all: "Allt",
};

function rangeCutoff(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "3m":
      return new Date(now.getTime() - 90 * 86400000);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export default function StatsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<string>("all");
  const [range, setRange] = useState<Range>("3m");

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.getDogs(), store.getTraining(), store.getCompetitions()]).then(
      ([d, t, c]) => {
        if (cancelled) return;
        setDogs(d);
        setTraining(t);
        setCompetitions(c);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const cutoff = rangeCutoff(range);
    const dogFilter = (id: string) => selectedDog === "all" || id === selectedDog;
    const dateFilter = (date: string) => !cutoff || new Date(date) >= cutoff;
    return {
      training: training.filter((t) => dogFilter(t.dog_id) && dateFilter(t.date)),
      competitions: competitions.filter(
        (c) => dogFilter(c.dog_id) && dateFilter(c.date),
      ),
    };
  }, [training, competitions, selectedDog, range]);

  const metrics = useMemo(() => {
    const tCount = filtered.training.length;
    const totalMin = filtered.training.reduce((s, t) => s + (t.duration_min || 0), 0);
    const cCount = filtered.competitions.length;
    const passed = filtered.competitions.filter((c) => c.passed).length;
    const passRate = cCount > 0 ? Math.round((passed / cCount) * 100) : 0;
    const cleanRuns = filtered.competitions.filter((c) => c.passed && c.faults === 0).length;
    const dq = filtered.competitions.filter((c) => c.disqualified).length;
    const placements = filtered.competitions
      .filter((c) => c.placement && c.placement <= 3)
      .length;
    const avgFaults =
      cCount > 0
        ? (
            filtered.competitions.reduce((s, c) => s + (c.faults || 0), 0) / cCount
          ).toFixed(1)
        : "0";
    const speeds = filtered.competitions
      .filter((c) => c.course_length_m && c.time_sec > 0)
      .map((c) => Number(c.course_length_m) / c.time_sec);
    const avgSpeed =
      speeds.length > 0
        ? (speeds.reduce((s, v) => s + v, 0) / speeds.length).toFixed(2)
        : "—";

    return {
      tCount,
      totalMin,
      passRate,
      passed,
      cleanRuns,
      dq,
      placements,
      avgFaults,
      avgSpeed,
    };
  }, [filtered]);

  // 12-veckors träningsfrekvens
  const weeklyData = useMemo(() => {
    const weeks: { label: string; pass: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const end = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
      const count = filtered.training.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d < end;
      }).length;
      weeks.push({ label: format(start, "d/M", { locale: sv }), pass: count });
    }
    return weeks;
  }, [filtered.training]);

  // ---- Träningsflik-data ----
  const trainingTypeData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.training.forEach((t) => {
      const key = t.type || "Annan";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered.training]);

  const energyTrend = useMemo(() => {
    const sorted = [...filtered.training].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    // Gruppera per vecka för att inte få brus
    const map = new Map<string, { sumDog: number; sumHandler: number; n: number }>();
    sorted.forEach((t) => {
      const wk = format(startOfWeek(new Date(t.date), { weekStartsOn: 1 }), "yyyy-'v'II");
      const cur = map.get(wk) || { sumDog: 0, sumHandler: 0, n: 0 };
      cur.sumDog += t.dog_energy || 0;
      cur.sumHandler += t.handler_energy || 0;
      cur.n += 1;
      map.set(wk, cur);
    });
    return Array.from(map.entries()).map(([label, v]) => ({
      label,
      hund: +(v.sumDog / v.n).toFixed(1),
      forare: +(v.sumHandler / v.n).toFixed(1),
    }));
  }, [filtered.training]);

  const topObstacles = useMemo(() => {
    const map = new Map<string, number>();
    filtered.training.forEach((t) => {
      (t.obstacles_trained || []).forEach((o) => {
        map.set(o, (map.get(o) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered.training]);

  // ---- Tävlingsflik-data ----
  const cleanRunsTrend = useMemo(() => {
    const sorted = [...filtered.competitions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const map = new Map<string, { clean: number; total: number }>();
    sorted.forEach((c) => {
      const m = format(new Date(c.date), "yyyy-MM");
      const cur = map.get(m) || { clean: 0, total: 0 };
      cur.total += 1;
      if (c.passed && c.faults === 0 && !c.disqualified) cur.clean += 1;
      map.set(m, cur);
    });
    return Array.from(map.entries()).map(([label, v]) => ({
      label: format(new Date(`${label}-01`), "MMM yy", { locale: sv }),
      noll: v.clean,
      starter: v.total,
    }));
  }, [filtered.competitions]);

  const faultDistribution = useMemo(() => {
    const buckets = { "0 fel": 0, "1–5 fel": 0, "6–10 fel": 0, "11+ fel": 0, Diskad: 0 };
    filtered.competitions.forEach((c) => {
      if (c.disqualified) buckets["Diskad"]++;
      else if (c.faults === 0) buckets["0 fel"]++;
      else if (c.faults <= 5) buckets["1–5 fel"]++;
      else if (c.faults <= 10) buckets["6–10 fel"]++;
      else buckets["11+ fel"]++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [filtered.competitions]);

  const placementBreakdown = useMemo(() => {
    const buckets = { "1:a": 0, "2:a": 0, "3:a": 0, "4–10": 0, "11+": 0, "Ej placerad": 0 };
    filtered.competitions.forEach((c) => {
      if (!c.placement) buckets["Ej placerad"]++;
      else if (c.placement === 1) buckets["1:a"]++;
      else if (c.placement === 2) buckets["2:a"]++;
      else if (c.placement === 3) buckets["3:a"]++;
      else if (c.placement <= 10) buckets["4–10"]++;
      else buckets["11+"]++;
    });
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtered.competitions]);

  const speedTrend = useMemo(() => {
    const points = [...filtered.competitions]
      .filter((c) => c.course_length_m && c.time_sec > 0 && !c.disqualified)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((c) => ({
        label: format(new Date(c.date), "d/M", { locale: sv }),
        speed: +(Number(c.course_length_m) / c.time_sec).toFixed(2),
      }));
    return points.slice(-30);
  }, [filtered.competitions]);

  // ---- Milstolpar ----
  const milestones = useMemo(() => {
    const list: { icon: typeof Trophy; title: string; date: string; subtitle: string }[] = [];
    const sortedComps = [...competitions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const firstClean = sortedComps.find((c) => c.passed && c.faults === 0 && !c.disqualified);
    if (firstClean) {
      list.push({
        icon: Award,
        title: "Första nollrundan",
        date: format(new Date(firstClean.date), "d MMM yyyy", { locale: sv }),
        subtitle: `${firstClean.event_name} · ${firstClean.discipline}`,
      });
    }
    const firstWin = sortedComps.find((c) => c.placement === 1);
    if (firstWin) {
      list.push({
        icon: Trophy,
        title: "Första segern",
        date: format(new Date(firstWin.date), "d MMM yyyy", { locale: sv }),
        subtitle: `${firstWin.event_name} · ${firstWin.discipline}`,
      });
    }
    const totalCleanRuns = sortedComps.filter(
      (c) => c.passed && c.faults === 0 && !c.disqualified,
    ).length;
    [10, 25, 50, 100].forEach((threshold) => {
      if (totalCleanRuns >= threshold) {
        list.push({
          icon: Target,
          title: `${threshold} nollrundor`,
          date: "Uppnått",
          subtitle: "Konsekvens lönar sig",
        });
      }
    });
    [10, 50, 100, 250, 500].forEach((threshold) => {
      if (training.length >= threshold) {
        list.push({
          icon: TrendingUp,
          title: `${threshold} träningspass`,
          date: "Uppnått",
          subtitle: "Disciplin = utveckling",
        });
      }
    });
    const totalKm = sortedComps
      .filter((c) => c.course_length_m)
      .reduce((s, c) => s + Number(c.course_length_m), 0) / 1000;
    if (totalKm >= 1) {
      list.push({
        icon: CalIcon,
        title: `${totalKm.toFixed(1)} km i tävling`,
        date: "Total banlängd",
        subtitle: "Varje meter räknas",
      });
    }
    return list;
  }, [competitions, training]);

  const insightText = useMemo(() => {
    if (metrics.tCount === 0)
      return "Logga några pass så får du insikter här.";
    if (metrics.passRate >= 80)
      return `Stark godkänd-ratio på ${metrics.passRate}%. Du presterar konsekvent – fokusera på snitthastighet för att klättra i klass.`;
    if (metrics.cleanRuns >= 5)
      return `${metrics.cleanRuns} nollrundor i perioden – fortsätt med samma rutiner och bygg vidare på kontaktzoner.`;
    return `${metrics.tCount} pass och ${metrics.passed} godkända starter i perioden ${RANGE_LABEL[range].toLowerCase()}. Snittfel: ${metrics.avgFaults}.`;
  }, [metrics, range]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Översikt"
        title="Statistik"
        subtitle="Djupdyk i din och hundarnas utveckling över tid."
      />

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={selectedDog} onValueChange={setSelectedDog}>
          <SelectTrigger className="h-9 w-[180px] rounded-ds-md border-border-default bg-surface text-body">
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
        <div className="flex gap-1 bg-subtle p-0.5 rounded-ds-md">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 h-8 rounded-ds-sm text-small font-medium transition-colors ${
                range === r
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Stora MetricCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Träningar" value={metrics.tCount} hint={RANGE_LABEL[range]} />
        <MetricCard
          label="Godkänd-ratio"
          value={
            <span className={metrics.passRate >= 80 ? "text-semantic-success" : undefined}>
              {metrics.passRate}%
            </span>
          }
          hint={`${metrics.passed} av ${filtered.competitions.length} starter`}
        />
        <MetricCard
          label="Total träningstid"
          value={`${Math.round(metrics.totalMin / 60)} h`}
          hint={`${metrics.totalMin} min`}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-transparent border-b-[0.5px] border-border-subtle rounded-none p-0 h-auto w-full justify-start gap-5">
          {[
            ["overview", "Översikt"],
            ["training", "Träning"],
            ["competition", "Tävling"],
            ["milestones", "Milstolpar"],
          ].map(([key, label]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="bg-transparent rounded-none px-0 h-10 text-body data-[state=active]:text-brand-600 data-[state=active]:border-b-2 data-[state=active]:border-brand-500 data-[state=active]:shadow-none border-b-2 border-transparent text-text-secondary"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <AIInsightCard body={insightText} />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard label="Godkända" value={metrics.passed} />
            <MetricCard label="Nollrundor" value={metrics.cleanRuns} />
            <MetricCard label="Pallplatser" value={metrics.placements} />
            <MetricCard label="Diskade" value={metrics.dq} />
            <MetricCard label="Snittfel" value={metrics.avgFaults} />
            <MetricCard label="Snitthastighet" value={`${metrics.avgSpeed} m/s`} />
          </div>

          <DSCard>
            <header className="mb-4">
              <h2 className="text-h2 text-text-primary">Träningsfrekvens</h2>
              <p className="text-small text-text-tertiary mt-0.5">
                Antal pass per vecka, senaste 12 veckorna
              </p>
            </header>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="hsl(var(--ds-border-subtle) / 0.15)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--text-tertiary))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--text-tertiary))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--bg-subtle))" }}
                    contentStyle={{
                      background: "hsl(var(--bg-surface))",
                      border: "0.5px solid hsl(var(--ds-border-subtle) / 0.15)",
                      borderRadius: "10px",
                      fontSize: 12,
                      color: "hsl(var(--text-primary))",
                    }}
                  />
                  <Bar dataKey="pass" fill="hsl(var(--brand-500))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DSCard>
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <DSCard>
            <p className="text-body text-text-secondary">
              Detaljerad träningsanalys byggs in i kommande iteration.
            </p>
          </DSCard>
        </TabsContent>
        <TabsContent value="competition" className="mt-6">
          <DSCard>
            <p className="text-body text-text-secondary">
              Tävlingsanalys flyttas hit från befintlig statistiksida i nästa iteration.
            </p>
          </DSCard>
        </TabsContent>
        <TabsContent value="milestones" className="mt-6">
          <DSCard>
            <p className="text-body text-text-secondary">
              Klassresa & milstolpar visualiseras här i nästa iteration.
            </p>
          </DSCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
