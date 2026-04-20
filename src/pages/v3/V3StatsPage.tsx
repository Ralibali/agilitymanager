import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Sparkles, Activity, Trophy, Clock, Target, Award } from "lucide-react";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Stats, useV3DogCompare, type RangeKey, type WeeklyBucket, type V3Stats } from "@/hooks/v3/useV3Stats";
import { useV3Milestones } from "@/hooks/v3/useV3Milestones";
import { DogHero } from "@/components/v3/DogHero";
import { NextMilestoneCard } from "@/components/v3/NextMilestoneCard";
import { cn } from "@/lib/utils";

type Tab = "overview" | "trends" | "patterns" | "milestones";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Översikt" },
  { value: "trends", label: "Trender" },
  { value: "patterns", label: "Mönster" },
  { value: "milestones", label: "Milstolpar" },
];

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "30d", label: "30 d" },
  { value: "90d", label: "90 d" },
  { value: "365d", label: "1 år" },
  { value: "all", label: "Allt" },
];

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatTime(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)} s`;
}

export default function V3StatsPage() {
  const navigate = useNavigate();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<RangeKey>("90d");
  const { stats, loading } = useV3Stats(activeId, range);
  const { rows: compareRows, loading: compareLoading } = useV3DogCompare(range);

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      {/* Header */}
      <header className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
          Stats & insights
        </div>
        <h1 className="font-v3-display text-[32px] lg:text-[44px] leading-[1.05] tracking-[-0.02em] text-v3-text-primary">
          Förstå utvecklingen.
        </h1>
        <p className="text-v3-text-secondary text-v3-sm max-w-xl">
          Trender, mönster och AI-insikter baserade på dina pass och tävlingar.
        </p>
      </header>

      {/* Hund-switcher */}
      {dogsLoading ? (
        <div className="h-28 rounded-v3-2xl  v3-skeleton" />
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
          {/* Range + tabs */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-v3-canvas-sunken/40">
            <div className="flex gap-1.5 -mb-px">
              {TABS.map(({ value, label }) => {
                const isActive = tab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={cn(
                      "h-11 px-4 text-v3-sm font-medium transition-colors border-b-2",
                      isActive
                        ? "text-v3-text-primary border-v3-text-primary"
                        : "text-v3-text-tertiary border-transparent hover:text-v3-text-secondary",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1 p-1 rounded-v3-base bg-v3-canvas-secondary mb-2">
              {RANGES.map(({ value, label }) => {
                const isActive = range === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    className={cn(
                      "h-8 px-3 rounded-v3-sm text-[12px] font-medium transition-colors",
                      isActive
                        ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-sm"
                        : "text-v3-text-tertiary hover:text-v3-text-secondary",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <StatsSkeleton />
          ) : tab === "overview" ? (
            <OverviewTab stats={stats} />
          ) : tab === "trends" ? (
            <TrendsTab stats={stats} />
          ) : tab === "patterns" ? (
            <PatternsTab stats={stats} compareRows={compareRows} compareLoading={compareLoading} activeDogId={activeId} />
          ) : (
            <MilestonesTab dogId={activeId} />
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
 * Overview tab
 * ============================================================ */
function OverviewTab({ stats }: { stats: V3Stats }) {
  return (
    <div className="space-y-8">
      {/* Big stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStatTile
          icon={Activity}
          label="Träningspass"
          value={String(stats.totals.sessions)}
          sub={formatMinutes(stats.totals.minutes)}
        />
        <BigStatTile
          icon={Trophy}
          label="Starter"
          value={String(stats.totals.starts)}
          sub={`${stats.totals.passed} godkända`}
        />
        <BigStatTile
          icon={Target}
          label="Pass-rate"
          value={stats.totals.starts > 0 ? `${Math.round(stats.totals.passRate * 100)}%` : "—"}
          sub="av starter"
        />
        <BigStatTile
          icon={Clock}
          label="Bästa tid"
          value={formatTime(stats.totals.bestTime)}
          sub="snabbaste lopp"
        />
      </div>

      {/* AI-insikter */}
      <section className="space-y-3">
        <SectionHeader title="AI-insikter" subtitle="Mönster vi hittat i dina data" />
        <div className="grid gap-3 lg:grid-cols-2">
          {stats.insights.map((insight) => (
            <article
              key={insight.id}
              className={cn(
                "rounded-v3-2xl border p-5",
                insight.tone === "positive" && "bg-v3-brand-50 border-v3-brand-100",
                insight.tone === "warning" && "bg-amber-50 border-amber-100",
                insight.tone === "neutral" && "bg-v3-canvas-elevated border-v3-canvas-sunken/40",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-v3-canvas-elevated border border-v3-canvas-sunken/40 flex items-center justify-center shrink-0 text-v3-brand-600">
                  <Sparkles size={14} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-v3-base font-medium text-v3-text-primary mb-1">{insight.title}</h3>
                  <p className="text-v3-sm text-v3-text-secondary leading-relaxed">{insight.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Veckogrid */}
      <section className="space-y-3">
        <SectionHeader title="Aktivitet per vecka" subtitle="Pass och starter över tid" />
        <WeeklyBars weekly={stats.weekly} />
      </section>
    </div>
  );
}

/* ============================================================
 * Trends tab
 * ============================================================ */
function TrendsTab({ stats }: { stats: V3Stats }) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader title="Träningsminuter" subtitle="Volym per vecka" />
        <MinutesLineChart weekly={stats.weekly} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Score-utveckling" subtitle="Banflyt, dirigering och humör" />
        <ScoreTrendChart trend={stats.scoreTrend} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Pass-rate" subtitle="Andel godkända lopp per vecka" />
        <PassRateChart weekly={stats.weekly} />
      </section>
    </div>
  );
}

/* ============================================================
 * Patterns tab
 * ============================================================ */
function PatternsTab({
  stats,
  compareRows,
  compareLoading,
  activeDogId,
}: {
  stats: V3Stats;
  compareRows: ReturnType<typeof useV3DogCompare>["rows"];
  compareLoading: boolean;
  activeDogId: string | null;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader title="Träningsmix" subtitle="Fördelning av passtyper" />
        <TypeDistribution dist={stats.typeDist} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Vanligaste taggar" subtitle="Det du fokuserar på" />
        {stats.topTags.length === 0 ? (
          <EmptyHint text="Lägg till taggar i dina pass för att se mönster här." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-v3-canvas-elevated border border-v3-canvas-sunken/40 text-v3-sm text-v3-text-secondary"
              >
                {t.tag}
                <span className="text-v3-text-tertiary text-[12px]">{t.count}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {compareRows.length > 1 && (
        <section className="space-y-3">
          <SectionHeader title="Hund-jämförelse" subtitle="Aktivitet i samma intervall" />
          {compareLoading ? (
            <div className="h-32 rounded-v3-2xl  v3-skeleton" />
          ) : (
            <DogCompareTable rows={compareRows} activeId={activeDogId} />
          )}
        </section>
      )}
    </div>
  );
}

/* ============================================================
 * Building blocks
 * ============================================================ */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-v3-display text-[22px] leading-tight text-v3-text-primary">{title}</h2>
      {subtitle && <p className="text-v3-sm text-v3-text-tertiary mt-1">{subtitle}</p>}
    </div>
  );
}

function BigStatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-v3-canvas-secondary flex items-center justify-center text-v3-text-tertiary">
          <Icon size={14} strokeWidth={1.75} />
        </span>
        <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
          {label}
        </div>
      </div>
      <div className="font-v3-display text-[32px] leading-none text-v3-text-primary tabular-nums">
        {value}
      </div>
      <div className="text-v3-sm text-v3-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

function WeeklyBars({ weekly }: { weekly: WeeklyBucket[] }) {
  if (weekly.length === 0) {
    return <EmptyHint text="Inga data än för det här intervallet." />;
  }
  const max = Math.max(1, ...weekly.map((w) => w.sessions));
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5">
      <div className="flex items-end gap-2 h-40">
        {weekly.map((w) => {
          const h = (w.sessions / max) * 100;
          return (
            <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <div className="w-full h-full flex items-end justify-center">
                <div
                  className="w-full max-w-[28px] rounded-t-sm bg-v3-brand-500/80 transition-colors hover:bg-v3-brand-600"
                  style={{ height: `${Math.max(h, 4)}%` }}
                  title={`${w.label}: ${w.sessions} pass · ${w.starts} starter`}
                />
              </div>
              <div className="text-[10px] text-v3-text-tertiary tabular-nums truncate w-full text-center">
                {w.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MinutesLineChart({ weekly }: { weekly: WeeklyBucket[] }) {
  if (weekly.length === 0) return <EmptyHint text="Inga pass i intervallet." />;
  const max = Math.max(1, ...weekly.map((w) => w.minutes));
  const W = 600;
  const H = 160;
  const stepX = W / Math.max(weekly.length - 1, 1);
  const points = weekly
    .map((w, i) => {
      const x = i * stepX;
      const y = H - (w.minutes / max) * (H - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = weekly[weekly.length - 1];
  const prev = weekly[weekly.length - 2];
  const delta = prev ? last.minutes - prev.minutes : 0;

  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="font-v3-display text-[28px] text-v3-text-primary tabular-nums">
            {formatMinutes(last.minutes)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-v3-text-tertiary mt-1">
            Senaste vecka
          </div>
        </div>
        {prev && (
          <DeltaBadge delta={delta} unit="min" />
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--v3-brand-500))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {weekly.map((w, i) => {
          const x = i * stepX;
          const y = H - (w.minutes / max) * (H - 20) - 10;
          return <circle key={w.weekStart} cx={x} cy={y} r={2.5} fill="hsl(var(--v3-brand-600))" />;
        })}
      </svg>
    </div>
  );
}

function ScoreTrendChart({ trend }: { trend: V3Stats["scoreTrend"] }) {
  const valid = trend.filter((t) => t.banflyt != null || t.dirigering != null || t.mood != null);
  if (valid.length === 0) {
    return <EmptyHint text="Sätt scores i dina pass för att se utvecklingen." />;
  }
  const W = 600;
  const H = 160;
  const stepX = W / Math.max(valid.length - 1, 1);
  const yFor = (v: number | null) => (v == null ? null : H - (v / 5) * (H - 20) - 10);

  const lineFor = (key: "banflyt" | "dirigering" | "mood") => {
    const pts: string[] = [];
    valid.forEach((t, i) => {
      const y = yFor(t[key]);
      if (y != null) pts.push(`${(i * stepX).toFixed(1)},${y.toFixed(1)}`);
    });
    return pts.join(" ");
  };

  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5">
      <div className="flex flex-wrap gap-4 mb-4 text-[12px] text-v3-text-secondary">
        <LegendDot color="hsl(var(--v3-brand-500))" label="Banflyt" />
        <LegendDot color="hsl(22 75% 45%)" label="Dirigering" />
        <LegendDot color="hsl(var(--v3-text-tertiary))" label="Humör" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
        <polyline points={lineFor("banflyt")} fill="none" stroke="hsl(var(--v3-brand-500))" strokeWidth={2} strokeLinejoin="round" />
        <polyline points={lineFor("dirigering")} fill="none" stroke="hsl(22 75% 45%)" strokeWidth={2} strokeLinejoin="round" />
        <polyline points={lineFor("mood")} fill="none" stroke="hsl(var(--v3-text-tertiary))" strokeWidth={1.5} strokeDasharray="3,3" strokeLinejoin="round" />
      </svg>
      <div className="text-[11px] text-v3-text-tertiary mt-2">Skala 0–5, snitt per vecka</div>
    </div>
  );
}

function PassRateChart({ weekly }: { weekly: WeeklyBucket[] }) {
  const withStarts = weekly.filter((w) => w.starts > 0);
  if (withStarts.length === 0) {
    return <EmptyHint text="Inga tävlingsstarter i intervallet." />;
  }
  const max = Math.max(...withStarts.map((w) => w.starts));
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 space-y-3">
      {withStarts.map((w) => {
        const rate = w.starts > 0 ? w.passed / w.starts : 0;
        return (
          <div key={w.weekStart} className="flex items-center gap-3">
            <div className="w-12 text-[11px] text-v3-text-tertiary tabular-nums shrink-0">{w.label}</div>
            <div className="flex-1 h-2 rounded-full bg-v3-canvas-secondary overflow-hidden">
              <div
                className="h-full bg-v3-brand-500"
                style={{ width: `${rate * 100}%` }}
              />
            </div>
            <div className="w-20 text-right text-[11px] text-v3-text-secondary tabular-nums shrink-0">
              {w.passed}/{w.starts} · {Math.round(rate * 100)}%
            </div>
            <div className="w-10 text-right">
              <div
                className="inline-block h-1.5 rounded-full bg-v3-text-tertiary/40"
                style={{ width: `${(w.starts / max) * 32}px`, maxWidth: 32 }}
                title={`${w.starts} starter`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TypeDistribution({ dist }: { dist: V3Stats["typeDist"] }) {
  if (dist.length === 0) return <EmptyHint text="Inga pass loggade i intervallet." />;
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 space-y-3">
      {dist.map((d) => (
        <div key={d.type}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-v3-sm text-v3-text-primary">{d.type}</span>
            <span className="text-[11px] text-v3-text-tertiary tabular-nums">
              {d.count} · {Math.round(d.percent * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-v3-canvas-secondary overflow-hidden">
            <div
              className="h-full bg-v3-brand-500"
              style={{ width: `${d.percent * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DogCompareTable({
  rows,
  activeId,
}: {
  rows: ReturnType<typeof useV3DogCompare>["rows"];
  activeId: string | null;
}) {
  return (
    <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-v3-canvas-sunken/40 text-[10px] uppercase tracking-[0.08em] text-v3-text-tertiary">
        <div>Hund</div>
        <div className="text-right">Pass</div>
        <div className="text-right">Starter</div>
        <div className="text-right">Pass-rate</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.dogId}
          className={cn(
            "grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-v3-canvas-sunken/30 last:border-0 items-center",
            r.dogId === activeId && "bg-v3-brand-50/40",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: r.themeColor }}
            />
            <span className="text-v3-sm text-v3-text-primary truncate">{r.dogName}</span>
          </div>
          <div className="text-v3-sm text-v3-text-secondary tabular-nums text-right">{r.totalSessions}</div>
          <div className="text-v3-sm text-v3-text-secondary tabular-nums text-right">{r.starts}</div>
          <div className="text-v3-sm text-v3-text-primary tabular-nums text-right">
            {r.starts > 0 ? `${Math.round(r.passRate * 100)}%` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeltaBadge({ delta, unit }: { delta: number; unit: string }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone = delta > 0 ? "text-v3-brand-600" : delta < 0 ? "text-amber-600" : "text-v3-text-tertiary";
  return (
    <span className={cn("inline-flex items-center gap-1 text-v3-sm tabular-nums", tone)}>
      <Icon size={14} strokeWidth={2} />
      {delta > 0 ? "+" : ""}
      {delta} {unit}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-v3-2xl border border-dashed border-v3-canvas-sunken/60 p-8 text-center text-v3-sm text-v3-text-tertiary">
      {text}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-v3-2xl  v3-skeleton" />
        ))}
      </div>
      <div className="h-48 rounded-v3-2xl  v3-skeleton" />
      <div className="h-40 rounded-v3-2xl  v3-skeleton" />
    </div>
  );
}

/* ============================================================
 * Milestones tab – speglar V2:s "Milstolpar" med all-time bedrifter
 * ============================================================ */
function MilestonesTab({ dogId }: { dogId: string | null }) {
  const { milestones, nextMilestones, loading } = useV3Milestones(dogId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-v3-2xl v3-skeleton" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-v3-2xl v3-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const hasNext = nextMilestones.length > 0;

  if (milestones.length === 0 && !hasNext) {
    return (
      <div className="rounded-v3-2xl border border-dashed border-v3-canvas-sunken/60 p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-v3-brand-500/10 grid place-items-center mb-4">
          <Award size={20} strokeWidth={1.6} className="text-v3-brand-500" />
        </div>
        <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">Inga milstolpar än</h3>
        <p className="text-v3-sm text-v3-text-secondary mt-2 max-w-md mx-auto">
          Bedrifter dyker upp här när du loggat pass och tävlat – första nollrundan, första segern,
          milstolpar för antal pass m.m.
        </p>
      </div>
    );
  }

  const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const fmt = (iso: string | null) => {
    if (!iso) return "Uppnått";
    const d = new Date(iso);
    return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      {hasNext && (
        <NextMilestoneCard
          primary={nextMilestones[0]}
          others={nextMilestones.slice(1)}
        />
      )}

      {milestones.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title={`${milestones.length} ${milestones.length === 1 ? "bedrift" : "bedrifter"}`}
            subtitle="Allt du och din hund uppnått"
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {milestones.map((m) => (
              <li
                key={m.id}
                className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 flex items-start gap-4"
              >
                <span className="text-[28px] leading-none shrink-0" aria-hidden>
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-v3-display text-v3-lg text-v3-text-primary leading-tight">
                    {m.title}
                  </h3>
                  <p className="text-v3-sm text-v3-text-secondary mt-1 line-clamp-2">{m.meta}</p>
                  <p className="text-v3-xs text-v3-text-tertiary mt-2 tabular-nums">{fmt(m.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
