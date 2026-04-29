import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Award, BarChart3, Clock, HeartPulse, Minus, Sparkles, Target, Trophy, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { useV3Stats, useV3DogCompare, type RangeKey, type V3Stats, type WeeklyBucket } from "@/hooks/v3/useV3Stats";
import { useV3Milestones } from "@/hooks/v3/useV3Milestones";
import { DogHero } from "@/components/v3/DogHero";
import { NextMilestoneCard } from "@/components/v3/NextMilestoneCard";
import { V3Page, V3PageHero, V3PrimaryButton, V3SecondaryButton } from "@/components/v3/V3Page";
import { cn } from "@/lib/utils";

type Tab = "overview" | "trends" | "patterns" | "milestones";
const TABS: { value: Tab; label: string }[] = [{ value: "overview", label: "Översikt" }, { value: "trends", label: "Trender" }, { value: "patterns", label: "Mönster" }, { value: "milestones", label: "Milstolpar" }];
const RANGES: { value: RangeKey; label: string; long: string }[] = [{ value: "30d", label: "30 d", long: "senaste 30 dagarna" }, { value: "90d", label: "90 d", long: "senaste 90 dagarna" }, { value: "365d", label: "1 år", long: "senaste året" }, { value: "all", label: "Allt", long: "all historik" }];

const minutes = (min: number) => min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
const time = (sec: number | null) => sec == null ? "—" : Math.floor(sec / 60) > 0 ? `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, "0")}` : `${sec.toFixed(2)} s`;
const rangeText = (range: RangeKey) => RANGES.find((item) => item.value === range)?.long ?? "valt intervall";

export default function V3StatsPage() {
  const navigate = useNavigate();
  const { dogs, active, activeId, setActive, loading: dogsLoading } = useV3Dogs();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<RangeKey>("90d");
  const { stats, loading } = useV3Stats(activeId, range);
  const { rows: compareRows, loading: compareLoading } = useV3DogCompare(range);
  const activeCompare = compareRows.find((row) => row.dogId === activeId);
  const otherDogs = compareRows.filter((row) => row.dogId !== activeId && (row.totalSessions > 0 || row.starts > 0));
  const hasNoData = !loading && stats.totals.sessions === 0 && stats.totals.starts === 0;

  return <V3Page>
    <V3PageHero eyebrow="Stats & insights" title="Förstå utvecklingen." description={active ? `Se träningsvolym, tävlingsstarter, mönster och milstolpar för ${active.name}.` : "Se träningsvolym, tävlingsstarter, mönster och milstolpar för vald hund."} icon={BarChart3}>
      {active && <><V3SecondaryButton onClick={() => navigate("/v3/training")} icon={Activity}>Träning</V3SecondaryButton><V3PrimaryButton onClick={() => navigate("/v3/competition")} icon={Trophy}>Tävlingar</V3PrimaryButton></>}
    </V3PageHero>

    {dogsLoading ? <div className="h-28 rounded-v3-2xl v3-skeleton" /> : <DogHero dogs={dogs} active={active} activeId={activeId} onSelect={setActive} onAddDog={() => navigate("/v3/dogs")} />}

    {active && <>
      <StatsContextCard dogName={active.name} range={range} sessions={activeCompare?.totalSessions ?? stats.totals.sessions} starts={activeCompare?.starts ?? stats.totals.starts} otherDogs={otherDogs.map((row) => row.dogName)} onGoTraining={() => navigate("/v3/training")} onGoDogs={() => navigate("/v3/dogs")} />
      <StatsNav tab={tab} setTab={setTab} range={range} setRange={setRange} />
      {loading ? <StatsSkeleton /> : hasNoData && tab === "overview" ? <EmptyStats dogName={active.name} hasOtherDogData={otherDogs.length > 0} onGoTraining={() => navigate("/v3/training")} onShowPatterns={() => setTab("patterns")} /> : tab === "overview" ? <OverviewTab stats={stats} range={range} /> : tab === "trends" ? <TrendsTab stats={stats} /> : tab === "patterns" ? <PatternsTab stats={stats} compareRows={compareRows} compareLoading={compareLoading} activeDogId={activeId} /> : <MilestonesTab dogId={activeId} />}
    </>}
  </V3Page>;
}

function StatsNav({ tab, setTab, range, setRange }: { tab: Tab; setTab: (tab: Tab) => void; range: RangeKey; setRange: (range: RangeKey) => void }) {
  return <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between border-b border-v3-canvas-sunken/40">
    <div className="flex gap-1.5 -mb-px overflow-x-auto">{TABS.map(({ value, label }) => <button key={value} type="button" onClick={() => setTab(value)} className={cn("h-11 px-4 border-b-2 text-v3-sm font-medium whitespace-nowrap transition-colors", tab === value ? "border-v3-text-primary text-v3-text-primary" : "border-transparent text-v3-text-tertiary hover:text-v3-text-secondary")}>{label}</button>)}</div>
    <div className="flex gap-1 p-1 rounded-v3-base bg-v3-canvas-secondary mb-2 w-fit">{RANGES.map(({ value, label }) => <button key={value} type="button" onClick={() => setRange(value)} className={cn("h-8 px-3 rounded-v3-sm text-[12px] font-medium transition-colors", range === value ? "bg-v3-canvas-elevated text-v3-text-primary shadow-v3-sm" : "text-v3-text-tertiary hover:text-v3-text-secondary")}>{label}</button>)}</div>
  </div>;
}

function StatsContextCard({ dogName, range, sessions, starts, otherDogs, onGoTraining, onGoDogs }: { dogName: string; range: RangeKey; sessions: number; starts: number; otherDogs: string[]; onGoTraining: () => void; onGoDogs: () => void }) {
  const hasData = sessions > 0 || starts > 0;
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 lg:p-5 shadow-v3-xs"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">Aktiv statistik</div><h2 className="font-v3-display text-v3-2xl text-v3-text-primary mt-1">{dogName} · {rangeText(range)}</h2><p className="text-v3-sm text-v3-text-secondary mt-1">{hasData ? `${sessions} pass och ${starts} starter i valt intervall.` : otherDogs.length > 0 ? `Ingen data för ${dogName} i intervallet, men ${otherDogs.slice(0, 2).join(" och ")} har aktivitet.` : `Ingen tränings- eller tävlingsdata för ${dogName} i valt intervall ännu.`}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={onGoTraining} className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors">Gå till träning <ArrowRight size={14} /></button><button type="button" onClick={onGoDogs} className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base border border-v3-canvas-sunken/60 text-v3-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-sunken transition-colors">Byt hund</button></div></div></section>;
}

function OverviewTab({ stats, range }: { stats: V3Stats; range: RangeKey }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Metric icon={Activity} label="Träningspass" value={String(stats.totals.sessions)} sub={minutes(stats.totals.minutes)} tone="green" /><Metric icon={Trophy} label="Starter" value={String(stats.totals.starts)} sub={`${stats.totals.passed} godkända`} tone="neutral" /><Metric icon={Target} label="Pass-rate" value={stats.totals.starts > 0 ? `${Math.round(stats.totals.passRate * 100)}%` : "—"} sub="av starter" tone="green" /><Metric icon={Clock} label="Bästa tid" value={time(stats.totals.bestTime)} sub="snabbaste lopp" tone="warm" /></div><div className="grid grid-cols-1 xl:grid-cols-[1.55fr_0.95fr] gap-5 items-start"><WeeklyChart weekly={stats.weekly} range={range} /><Insights stats={stats} /></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><TypeDist dist={stats.typeDist} /><TopTags tags={stats.topTags} /></div></div>;
}

function TrendsTab({ stats }: { stats: V3Stats }) {
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start"><LineCard title="Träningsminuter" subtitle="Volym per vecka" values={stats.weekly.map((w) => w.minutes)} labels={stats.weekly.map((w) => w.label)} max={Math.max(1, ...stats.weekly.map((w) => w.minutes))} empty="Inga pass i intervallet." /><LineCard title="Känsla över tid" subtitle="Snitt per vecka, skala 0–5" values={stats.scoreTrend.filter((s) => s.mood != null).map((s) => s.mood ?? 0)} labels={stats.scoreTrend.filter((s) => s.mood != null).map((s) => s.date.slice(5))} max={5} empty="Sätt känsla i dina pass för att se utvecklingen." /><PassRate weekly={stats.weekly} /><WeeklyChart weekly={stats.weekly} range="90d" compact /></div>;
}

function PatternsTab({ stats, compareRows, compareLoading, activeDogId }: { stats: V3Stats; compareRows: ReturnType<typeof useV3DogCompare>["rows"]; compareLoading: boolean; activeDogId: string | null }) {
  return <div className="space-y-5"><div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><TypeDist dist={stats.typeDist} /><TopTags tags={stats.topTags} /></div>{compareRows.length > 1 && <section className="space-y-3"><Header title="Hund-jämförelse" subtitle="Aktivitet i samma intervall" />{compareLoading ? <div className="h-40 rounded-v3-2xl v3-skeleton" /> : <DogCompare rows={compareRows} activeId={activeDogId} />}</section>}</div>;
}

function Metric({ icon: Icon, label, value, sub, tone }: { icon: LucideIcon; label: string; value: string; sub: string; tone: "green" | "warm" | "neutral" }) {
  const toneClass = tone === "green" ? "bg-v3-brand-500/10 text-v3-brand-700" : tone === "warm" ? "bg-orange-100 text-orange-700" : "bg-v3-canvas-sunken/70 text-v3-text-secondary";
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs min-h-[150px]"><div className="flex items-start justify-between gap-3"><div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">{label}</div><div className={cn("h-9 w-9 rounded-full grid place-items-center", toneClass)}><Icon size={16} strokeWidth={1.8} /></div></div><div className="font-v3-display text-[34px] leading-none mt-5 text-v3-text-primary tabular-nums truncate">{value}</div><div className="text-v3-sm text-v3-text-tertiary mt-1">{sub}</div></section>;
}

function WeeklyChart({ weekly, range, compact = false }: { weekly: WeeklyBucket[]; range: RangeKey; compact?: boolean }) {
  const totalSessions = weekly.reduce((sum, week) => sum + week.sessions, 0);
  const totalStarts = weekly.reduce((sum, week) => sum + week.starts, 0);
  const max = Math.max(1, ...weekly.map((week) => Math.max(week.sessions, week.starts)));
  const height = compact ? "h-[210px]" : "h-[270px]";
  if (weekly.length === 0) return <EmptyHint text="Inga data än för det här intervallet." />;
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 lg:p-6 shadow-v3-xs"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5"><div><Header title="Aktivitet per vecka" subtitle={`Pass och starter över ${rangeText(range)}`} /><p className="text-v3-sm text-v3-text-secondary mt-2">{totalSessions} pass · {totalStarts} starter</p></div><div className="flex items-center gap-4 text-v3-xs text-v3-text-secondary"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-v3-brand-500" />Pass</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-v3-text-tertiary" />Starter</span></div></div><div className="grid grid-cols-[34px_1fr] gap-3"><div className={cn("flex flex-col justify-between text-[11px] text-v3-text-tertiary pb-8", height)}><span>{max}</span><span>{Math.ceil(max / 2)}</span><span>0</span></div><div className={cn("relative", height)}><div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8"><div className="border-t border-v3-canvas-sunken/70" /><div className="border-t border-dashed border-v3-canvas-sunken/60" /><div className="border-t border-v3-canvas-sunken/70" /></div><div className="absolute inset-0 flex items-end gap-2 pb-8">{weekly.map((week) => { const passHeight = week.sessions > 0 ? Math.max((week.sessions / max) * 100, 10) : 0; const startHeight = week.starts > 0 ? Math.max((week.starts / max) * 100, 10) : 0; return <div key={week.weekStart} className="flex-1 min-w-0 h-full flex flex-col justify-end" title={`${week.label}: ${week.sessions} pass, ${week.starts} starter`}><div className="flex-1 flex items-end justify-center gap-1.5"><div className="w-full max-w-[22px] h-full flex items-end"><div className={cn("w-full rounded-t-md transition-all", week.sessions > 0 ? "bg-v3-brand-500 hover:bg-v3-brand-600" : "bg-v3-canvas-sunken/35")} style={{ height: `${passHeight}%` }} /></div><div className="w-full max-w-[16px] h-full flex items-end"><div className={cn("w-full rounded-t-md transition-all", week.starts > 0 ? "bg-v3-text-tertiary hover:bg-v3-text-secondary" : "bg-v3-canvas-sunken/25")} style={{ height: `${startHeight}%` }} /></div></div><div className="text-center text-[11px] text-v3-text-tertiary tabular-nums truncate mt-2">{week.label}</div></div>; })}</div></div></div></section>;
}

function Insights({ stats }: { stats: V3Stats }) {
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 lg:p-6 shadow-v3-xs"><Header title="AI-insikter" subtitle="Mönster vi hittat i din data" /><div className="space-y-3 mt-4">{stats.insights.map((insight) => <article key={insight.id} className={cn("rounded-v3-xl border p-4", insight.tone === "positive" && "bg-v3-brand-50 border-v3-brand-100", insight.tone === "warning" && "bg-amber-50 border-amber-100", insight.tone === "neutral" && "bg-v3-canvas border-v3-canvas-sunken/50")}><div className="flex items-start gap-3"><span className="h-9 w-9 rounded-full bg-white border border-v3-canvas-sunken/40 grid place-items-center text-v3-brand-600 shrink-0"><Sparkles size={15} /></span><div><h3 className="text-v3-base font-medium text-v3-text-primary">{insight.title}</h3><p className="text-v3-sm text-v3-text-secondary mt-1 leading-relaxed">{insight.body}</p></div></div></article>)}</div></section>;
}

function LineCard({ title, subtitle, values, labels, max, empty }: { title: string; subtitle: string; values: number[]; labels: string[]; max: number; empty: string }) {
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs"><Header title={title} subtitle={subtitle} />{values.length === 0 ? <div className="mt-5"><EmptyHint text={empty} /></div> : <div className="mt-5"><Line values={values} labels={labels} max={max} /></div>}</section>;
}

function Line({ values, labels, max }: { values: number[]; labels: string[]; max: number }) {
  const width = 640, height = 180, pad = 14;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({ x: pad + i * step, y: height - pad - (v / Math.max(max, 1)) * (height - pad * 2) }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = pts.length ? `${path} L ${pts[pts.length - 1].x} ${height - pad} L ${pts[0].x} ${height - pad} Z` : "";
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[190px]" preserveAspectRatio="none"><defs><linearGradient id="stats-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--v3-brand-500))" stopOpacity="0.22" /><stop offset="100%" stopColor="hsl(var(--v3-brand-500))" stopOpacity="0" /></linearGradient></defs><path d={area} fill="url(#stats-area)" /><path d={path} fill="none" stroke="hsl(var(--v3-brand-500))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />{pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="hsl(var(--v3-brand-600))" />)}</svg><div className="flex justify-between text-[11px] text-v3-text-tertiary tabular-nums mt-2"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span></div></div>;
}

function PassRate({ weekly }: { weekly: WeeklyBucket[] }) {
  const rows = weekly.filter((week) => week.starts > 0);
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs"><Header title="Pass-rate" subtitle="Andel godkända lopp per vecka" />{rows.length === 0 ? <div className="mt-5"><EmptyHint text="Inga tävlingsstarter i intervallet." /></div> : <div className="space-y-4 mt-5">{rows.map((week) => { const rate = week.passed / week.starts; return <div key={week.weekStart} className="grid grid-cols-[44px_1fr_74px] items-center gap-3"><div className="text-v3-xs text-v3-text-tertiary tabular-nums">{week.label}</div><div className="h-2.5 rounded-full bg-v3-canvas-secondary overflow-hidden"><div className="h-full rounded-full bg-v3-brand-500" style={{ width: `${rate * 100}%` }} /></div><div className="text-right text-v3-xs text-v3-text-secondary tabular-nums">{week.passed}/{week.starts} · {Math.round(rate * 100)}%</div></div>; })}</div>}</section>;
}

function TypeDist({ dist }: { dist: V3Stats["typeDist"] }) {
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs"><Header title="Träningsmix" subtitle="Fördelning av passtyper" /><div className="mt-5">{dist.length === 0 ? <EmptyHint text="Inga pass loggade i intervallet." /> : <div className="space-y-4">{dist.map((item) => <div key={item.type}><div className="flex items-baseline justify-between mb-1.5"><span className="text-v3-sm text-v3-text-primary">{item.type}</span><span className="text-v3-xs text-v3-text-tertiary tabular-nums">{item.count} · {Math.round(item.percent * 100)}%</span></div><div className="h-2 rounded-full bg-v3-canvas-secondary overflow-hidden"><div className="h-full rounded-full bg-v3-brand-500" style={{ width: `${item.percent * 100}%` }} /></div></div>)}</div>}</div></section>;
}

function TopTags({ tags }: { tags: V3Stats["topTags"] }) {
  return <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs"><Header title="Vanligaste taggar" subtitle="Fokusområden i passen" /><div className="mt-5">{tags.length === 0 ? <EmptyHint text="Lägg till taggar i dina pass för att se mönster här." /> : <div className="flex flex-wrap gap-2">{tags.map((tag) => <span key={tag.tag} className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-secondary">#{tag.tag}<span className="text-v3-xs text-v3-text-tertiary">{tag.count}</span></span>)}</div>}</div></section>;
}

function DogCompare({ rows, activeId }: { rows: ReturnType<typeof useV3DogCompare>["rows"]; activeId: string | null }) {
  return <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 overflow-hidden shadow-v3-xs"><div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-v3-canvas-sunken/40 text-[10px] tracking-[0.04em] text-v3-text-tertiary"><div>Hund</div><div>Pass</div><div>Starter</div><div>Pass-rate</div></div>{rows.map((row) => <div key={row.dogId} className={cn("grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-v3-canvas-sunken/30 last:border-0 items-center", row.dogId === activeId && "bg-v3-brand-50/50")}><div className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.themeColor }} /><span className="text-v3-sm text-v3-text-primary truncate">{row.dogName}</span></div><div className="text-v3-sm text-v3-text-secondary tabular-nums text-right">{row.totalSessions}</div><div className="text-v3-sm text-v3-text-secondary tabular-nums text-right">{row.starts}</div><div className="text-v3-sm text-v3-text-primary tabular-nums text-right">{row.starts > 0 ? `${Math.round(row.passRate * 100)}%` : "—"}</div></div>)}</div>;
}

function MilestonesTab({ dogId }: { dogId: string | null }) {
  const { milestones, nextMilestones, loading } = useV3Milestones(dogId);
  if (loading) return <StatsSkeleton />;
  if (milestones.length === 0 && nextMilestones.length === 0) return <EmptyHint text="Milstolpar dyker upp här när du loggat pass och tävlat." />;
  return <div className="space-y-5">{nextMilestones.length > 0 && <NextMilestoneCard primary={nextMilestones[0]} others={nextMilestones.slice(1)} />}{milestones.length > 0 && <section className="space-y-3"><Header title={`${milestones.length} ${milestones.length === 1 ? "bedrift" : "bedrifter"}`} subtitle="Allt du och din hund uppnått" /><ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{milestones.map((m) => <li key={m.id} className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 flex items-start gap-4 shadow-v3-xs"><span className="text-[30px] leading-none shrink-0" aria-hidden>{m.emoji}</span><div><h3 className="font-v3-display text-v3-lg text-v3-text-primary leading-tight">{m.title}</h3><p className="text-v3-sm text-v3-text-secondary mt-1 line-clamp-2">{m.meta}</p></div></li>)}</ul></section>}</div>;
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) { return <div><h2 className="font-v3-display text-v3-2xl text-v3-text-primary leading-tight">{title}</h2>{subtitle && <p className="text-v3-sm text-v3-text-tertiary mt-1">{subtitle}</p>}</div>; }
function EmptyStats({ dogName, onGoTraining, onShowPatterns, hasOtherDogData }: { dogName: string; onGoTraining: () => void; onShowPatterns: () => void; hasOtherDogData: boolean }) { return <div className="rounded-v3-2xl border border-dashed border-v3-canvas-sunken/60 bg-v3-canvas-elevated/55 p-8 lg:p-10 text-center"><div className="mx-auto h-14 w-14 rounded-v3-xl bg-v3-brand-500/10 grid place-items-center mb-4"><HeartPulse size={24} className="text-v3-brand-600" /></div><h2 className="font-v3-display text-[28px] text-v3-text-primary">Ingen statistik för {dogName} än</h2><p className="text-v3-base text-v3-text-secondary mt-2 max-w-lg mx-auto">{hasOtherDogData ? "Det finns aktivitet på annan hund. Byt hund eller logga ett pass på den här hunden för att bygga statistik här." : "Logga ett träningspass eller ett tävlingsresultat så börjar översikten fyllas med riktiga siffror."}</p><div className="mt-5 flex flex-wrap items-center justify-center gap-2"><button type="button" onClick={onGoTraining} className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors shadow-v3-sm">Logga eller se pass <ArrowRight size={15} /></button>{hasOtherDogData && <button type="button" onClick={onShowPatterns} className="inline-flex items-center gap-2 h-11 px-5 rounded-v3-base border border-v3-canvas-sunken/60 text-v3-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-sunken transition-colors">Visa hund-jämförelse</button>}</div></div>; }
function EmptyHint({ text }: { text: string }) { return <div className="rounded-v3-2xl border border-dashed border-v3-canvas-sunken/60 p-8 text-center text-v3-sm text-v3-text-tertiary">{text}</div>; }
function StatsSkeleton() { return <div className="space-y-5"><div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-v3-2xl v3-skeleton" />)}</div><div className="grid grid-cols-1 xl:grid-cols-[1.55fr_0.95fr] gap-5"><div className="h-[340px] rounded-v3-2xl v3-skeleton" /><div className="h-[340px] rounded-v3-2xl v3-skeleton" /></div></div>; }
