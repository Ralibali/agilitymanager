import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import AITrainingInsights from '@/components/competitions/AITrainingInsights';
import { PageContainer } from '@/components/PageContainer';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import { DogAvatar } from '@/components/DogAvatar';
import { Trophy, Dumbbell, TrendingUp, Zap, Target, BarChart3, Gauge, XCircle, CheckCircle, Award, Star } from 'lucide-react';
import { format, startOfWeek, subWeeks, eachWeekOfInterval, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const DOG_COLORS = ['hsl(221, 79%, 48%)', 'hsl(16, 100%, 55%)', 'hsl(142, 60%, 40%)', 'hsl(280, 60%, 50%)', 'hsl(45, 90%, 50%)'];

// --- PIN REQUIREMENTS (Swedish agility) ---
const PIN_REQUIREMENTS: Record<string, { agility: number; hopp: number }> = {
  'K1': { agility: 3, hopp: 3 },   // K1 → K2
  'K2': { agility: 3, hopp: 3 },   // K2 → K3
  'K3': { agility: 10, hopp: 3 },  // K3 → Champion
};

// --- OVERVIEW CARDS ---
function OverviewCards({ training, competitions }: { training: TrainingSession[]; competitions: CompetitionResult[] }) {
  const now = new Date();
  const thisMonth = training.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalMin = training.reduce((s, t) => s + t.duration_min, 0);
  const passRate = competitions.length > 0
    ? Math.round(competitions.filter(c => c.passed).length / competitions.length * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      <div className="bg-card p-3 rounded-xl shadow-card text-center">
        <Dumbbell size={18} className="text-primary mx-auto mb-1" />
        <div className="text-xl font-bold font-display text-foreground">{thisMonth.length}</div>
        <div className="text-[10px] text-muted-foreground">Träningar/mån</div>
      </div>
      <div className="bg-card p-3 rounded-xl shadow-card text-center">
        <Trophy size={18} className="text-accent mx-auto mb-1" />
        <div className="text-xl font-bold font-display text-foreground">{passRate}%</div>
        <div className="text-[10px] text-muted-foreground">Pinnar</div>
      </div>
      <div className="bg-card p-3 rounded-xl shadow-card text-center">
        <TrendingUp size={18} className="text-success mx-auto mb-1" />
        <div className="text-xl font-bold font-display text-foreground">{Math.round(totalMin / 60)}h</div>
        <div className="text-[10px] text-muted-foreground">Total träning</div>
      </div>
    </div>
  );
}

// --- TRAINING FREQUENCY CHART ---
function TrainingFrequencyChart({ training, dogs }: { training: TrainingSession[]; dogs: Dog[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11);
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });
    const dogIds = [...new Set(training.map(t => t.dog_id))];

    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const label = format(weekStart, 'd/M', { locale: sv });
      const entry: Record<string, any> = { week: label };

      dogIds.forEach(id => {
        entry[id] = training.filter(t => {
          const d = parseISO(t.date);
          return t.dog_id === id && d >= weekStart && d < weekEnd;
        }).length;
      });
      entry.total = training.filter(t => {
        const d = parseISO(t.date);
        return d >= weekStart && d < weekEnd;
      }).length;

      return entry;
    });
  }, [training]);

  const dogIds = useMemo(() => [...new Set(training.map(t => t.dog_id))], [training]);

  if (training.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Dumbbell size={16} className="text-primary" /> Träningsfrekvens (12 veckor)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          {dogIds.length <= 1 ? (
            <Bar dataKey="total" name="Pass" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          ) : (
            dogIds.map((id, i) => {
              const dog = dogs.find(d => d.id === id);
              return (
                <Bar
                  key={id}
                  dataKey={id}
                  name={dog?.name || '?'}
                  fill={dog?.theme_color || DOG_COLORS[i % DOG_COLORS.length]}
                  stackId="a"
                  radius={i === dogIds.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              );
            })
          )}
          {dogIds.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- COMPETITION TREND CHARTS ---
function CompTrendCharts({ competitions, dogs }: { competitions: CompetitionResult[]; dogs: Dog[] }) {
  const dogIds = useMemo(() => [...new Set(competitions.map(c => c.dog_id))], [competitions]);

  const trendData = useMemo(() => {
    const sorted = [...competitions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const byDate = new Map<string, Record<string, any>>();
    sorted.forEach(c => {
      const dateLabel = format(new Date(c.date), 'd/M', { locale: sv });
      const existing = byDate.get(dateLabel) || { date: dateLabel };
      existing[`time_${c.dog_id}`] = Number(c.time_sec);
      existing[`faults_${c.dog_id}`] = c.faults;
      if (c.course_length_m && c.course_length_m > 0 && Number(c.time_sec) > 0) {
        existing[`speed_${c.dog_id}`] = +(c.course_length_m / Number(c.time_sec)).toFixed(2);
      }
      byDate.set(dateLabel, existing);
    });
    return Array.from(byDate.values());
  }, [competitions]);

  // Rolling pass rate (last N competitions)
  const rollingData = useMemo(() => {
    const sorted = [...competitions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const windowSize = Math.min(5, Math.ceil(sorted.length / 3));
    return sorted.map((c, i) => {
      const window = sorted.slice(Math.max(0, i - windowSize + 1), i + 1);
      const passRate = Math.round(window.filter(w => w.passed).length / window.length * 100);
      const cleanRate = Math.round(window.filter(w => w.faults === 0 && !w.disqualified).length / window.length * 100);
      return {
        date: format(new Date(c.date), 'd/M', { locale: sv }),
        'Pinnfrekvens': passRate,
        'Nollfrekvens': cleanRate,
      };
    });
  }, [competitions]);

  const hasSpeed = competitions.some(c => c.course_length_m && c.course_length_m > 0 && Number(c.time_sec) > 0);

  const chartStyle = { fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };

  const renderLineChart = (title: string, icon: React.ReactNode, prefix: string, unit: string) => (
    <div className="bg-card rounded-xl p-4 shadow-card">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        {icon} {title}
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit={unit} />
          <Tooltip contentStyle={chartStyle} />
          {dogIds.map((id, i) => {
            const dog = dogs.find(d => d.id === id);
            return (
              <Line key={id} type="monotone" dataKey={`${prefix}_${id}`} name={dog?.name || '?'}
                stroke={dog?.theme_color || DOG_COLORS[i % DOG_COLORS.length]}
                strokeWidth={2} dot={{ r: 3 }} connectNulls />
            );
          })}
          {dogIds.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  if (competitions.length < 2) return null;

  return (
    <div className="space-y-4 mb-4">
      {/* Rolling success rate */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
          <TrendingUp size={16} className="text-success" /> Trendanalys (rullande)
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rollingData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={chartStyle} />
            <Line type="monotone" dataKey="Pinnfrekvens" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Nollfrekvens" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {renderLineChart('Tid över tid', <TrendingUp size={16} className="text-primary" />, 'time', 's')}
      {renderLineChart('Fel över tid', <Target size={16} className="text-destructive" />, 'faults', '')}
      {hasSpeed && renderLineChart('Hastighet (m/s)', <Gauge size={16} className="text-warning" />, 'speed', '')}
    </div>
  );
}

// --- DOG COMPARISON ---
function DogComparison({ competitions, dogs }: { competitions: CompetitionResult[]; dogs: Dog[] }) {
  const dogIds = [...new Set(competitions.map(c => c.dog_id))];
  if (dogIds.length < 2) return null;

  const radarData = useMemo(() => {
    const metrics = dogIds.map(id => {
      const dc = competitions.filter(c => c.dog_id === id);
      const total = dc.length || 1;
      const cleanRate = Math.round(dc.filter(c => c.faults === 0 && !c.disqualified).length / total * 100);
      const passRate = Math.round(dc.filter(c => c.passed).length / total * 100);
      const diskRate = 100 - Math.round(dc.filter(c => c.disqualified).length / total * 100);
      const withSpeed = dc.filter(c => c.course_length_m && c.course_length_m > 0 && Number(c.time_sec) > 0);
      const speed = withSpeed.length > 0
        ? Math.round(withSpeed.reduce((s, c) => s + (c.course_length_m! / Number(c.time_sec)), 0) / withSpeed.length * 20)
        : 50;
      return { id, cleanRate, passRate, diskRate, speed: Math.min(speed, 100) };
    });

    return [
      { metric: 'Nollade %', ...Object.fromEntries(metrics.map(m => [m.id, m.cleanRate])) },
      { metric: 'Pinnar %', ...Object.fromEntries(metrics.map(m => [m.id, m.passRate])) },
      { metric: 'Ej disk %', ...Object.fromEntries(metrics.map(m => [m.id, m.diskRate])) },
      { metric: 'Hastighet', ...Object.fromEntries(metrics.map(m => [m.id, m.speed])) },
    ];
  }, [competitions, dogIds]);

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <BarChart3 size={16} className="text-accent" /> Hundjämförelse
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
          {dogIds.map((id, i) => {
            const dog = dogs.find(d => d.id === id);
            return (
              <Radar key={id} name={dog?.name || '?'} dataKey={id}
                stroke={dog?.theme_color || DOG_COLORS[i % DOG_COLORS.length]}
                fill={dog?.theme_color || DOG_COLORS[i % DOG_COLORS.length]}
                fillOpacity={0.15} strokeWidth={2} />
            );
          })}
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- PIN COUNTER & CLASS JOURNEY ---
function PinCounter({ competitions, dogs }: { competitions: CompetitionResult[]; dogs: Dog[] }) {
  const dogData = useMemo(() => {
    return dogs.filter(d => d.is_active_competition_dog).map(dog => {
      const dc = competitions.filter(c => c.dog_id === dog.id);

      // Count pins per class and discipline
      const agilityPins = dc.filter(c => c.passed && c.discipline === 'Agility' && c.competition_level === dog.competition_level).length;
      const hoppPins = dc.filter(c => c.passed && c.discipline === 'Jumping' && c.competition_level === dog.jumping_level).length;

      const agilityReq = PIN_REQUIREMENTS[dog.competition_level];
      const hoppReq = PIN_REQUIREMENTS[dog.jumping_level];

      // History: how many pins in each class
      const classHistory = (['Nollklass', 'K1', 'K2', 'K3'] as const).map(level => ({
        level,
        agility: dc.filter(c => c.passed && c.discipline === 'Agility' && c.competition_level === level).length,
        hopp: dc.filter(c => c.passed && c.discipline === 'Jumping' && c.competition_level === level).length,
        total: dc.filter(c => c.competition_level === level).length,
      }));

      return { dog, agilityPins, hoppPins, agilityReq, hoppReq, classHistory };
    });
  }, [dogs, competitions]);

  if (dogData.length === 0) return null;

  const nextClass = (level: string) => {
    const map: Record<string, string> = { 'Nollklass': 'K1', 'K1': 'K2', 'K2': 'K3', 'K3': 'Champion' };
    return map[level] || level;
  };

  return (
    <div className="space-y-4 mb-4">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
        <Award size={18} className="text-accent" /> Pinnräknare & klassresa
      </h3>
      {dogData.map(({ dog, agilityPins, hoppPins, agilityReq, hoppReq, classHistory }) => (
        <div key={dog.id} className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <DogAvatar dog={dog} size="sm" />
            <div>
              <div className="font-medium text-foreground text-sm">{dog.name}</div>
              <div className="text-[10px] text-muted-foreground">
                Agility: {dog.competition_level} · Hopp: {dog.jumping_level}
              </div>
            </div>
          </div>

          {/* Agility progress */}
          {agilityReq && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Agility {dog.competition_level} → {nextClass(dog.competition_level)}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {agilityPins}/{agilityReq.agility} pinnar
                </span>
              </div>
              <Progress value={Math.min((agilityPins / agilityReq.agility) * 100, 100)} className="h-2" />
            </div>
          )}

          {/* Hopp progress */}
          {hoppReq && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Hopp {dog.jumping_level} → {nextClass(dog.jumping_level)}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {hoppPins}/{hoppReq.hopp} pinnar
                </span>
              </div>
              <Progress value={Math.min((hoppPins / hoppReq.hopp) * 100, 100)} className="h-2" />
            </div>
          )}

          {dog.competition_level === 'K3' && agilityPins >= 10 && hoppPins >= 3 && (
            <div className="text-center py-2">
              <Star size={24} className="text-accent mx-auto mb-1 fill-accent" />
              <span className="text-xs font-semibold text-accent">Championkrav uppfyllda! 🎉</span>
            </div>
          )}

          {/* Class journey timeline */}
          <div className="flex items-center gap-1 mt-2">
            {classHistory.map((ch, i) => {
              const isActive = ch.level === dog.competition_level;
              const hasPins = ch.agility > 0 || ch.hopp > 0;
              return (
                <div key={ch.level} className="flex items-center">
                  <div className={`flex flex-col items-center ${isActive ? 'opacity-100' : hasPins ? 'opacity-70' : 'opacity-30'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold
                      ${isActive ? 'bg-primary text-primary-foreground' : hasPins ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {ch.level === 'Nollklass' ? '0' : ch.level}
                    </div>
                    {hasPins && (
                      <span className="text-[8px] text-muted-foreground mt-0.5">
                        {ch.agility}a/{ch.hopp}h
                      </span>
                    )}
                  </div>
                  {i < classHistory.length - 1 && (
                    <div className={`w-4 h-0.5 mx-0.5 ${hasPins ? 'bg-primary/50' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- COMP STATS SUMMARY ---
function CompStatsSummary({ competitions }: { competitions: CompetitionResult[] }) {
  if (competitions.length === 0) return null;

  const total = competitions.length;
  const disqualified = competitions.filter(c => c.disqualified).length;
  const approved = total - disqualified;
  const passed = competitions.filter(c => c.passed).length;
  const cleanRuns = competitions.filter(c => c.faults === 0 && !c.disqualified).length;
  const avgFaults = competitions.reduce((s, c) => s + c.faults, 0) / total;
  const avgTime = competitions.reduce((s, c) => s + Number(c.time_sec), 0) / total;
  const withSpeed = competitions.filter(c => c.course_length_m && c.course_length_m > 0 && Number(c.time_sec) > 0);
  const avgSpeed = withSpeed.length > 0
    ? withSpeed.reduce((s, c) => s + (c.course_length_m! / Number(c.time_sec)), 0) / withSpeed.length : null;

  const stats = [
    { icon: <CheckCircle size={16} className="text-success" />, label: 'Godkända', value: `${Math.round(approved / total * 100)}%`, sub: `${approved}/${total}` },
    { icon: <Target size={16} className="text-primary" />, label: 'Nollade', value: `${Math.round(cleanRuns / total * 100)}%`, sub: `${cleanRuns}/${total}` },
    { icon: <Trophy size={16} className="text-accent" />, label: 'Pinnar', value: `${passed}`, sub: `${Math.round(passed / total * 100)}%` },
    { icon: <XCircle size={16} className="text-destructive" />, label: 'Disk', value: `${disqualified}`, sub: `${Math.round(disqualified / total * 100)}%` },
    { icon: <BarChart3 size={16} className="text-muted-foreground" />, label: 'Snitt fel', value: avgFaults.toFixed(1), sub: `${avgTime.toFixed(1)}s snitt` },
    { icon: <Gauge size={16} className="text-warning" />, label: 'm/s', value: avgSpeed ? avgSpeed.toFixed(2) : '–', sub: avgSpeed ? `${withSpeed.length} lopp` : 'Ange banlängd' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {stats.map((s, i) => (
        <div key={i} className="bg-card p-3 rounded-xl shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            {s.icon}
            <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
          </div>
          <div className="text-lg font-bold font-display text-foreground">{s.value}</div>
          <div className="text-[10px] text-muted-foreground">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// --- MAIN PAGE ---
export default function StatsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([store.getDogs(), store.getTraining(), store.getCompetitions()]).then(([d, t, c]) => {
      setDogs(d); setTraining(t); setCompetitions(c); setLoading(false);
    });
  }, []);

  if (loading) return <PageContainer title="Statistik"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <>
      <Helmet>
        <title>Statistik & Trendanalys | AgilityManager</title>
        <meta name="description" content="Avancerad statistik med trendanalys, hundjämförelse och pinnräknare för din agilitykarriär." />
      </Helmet>
      <PageContainer title="Statistik">
        <OverviewCards training={training} competitions={competitions} />

        <Tabs defaultValue="overview" className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 text-xs">Översikt</TabsTrigger>
            <TabsTrigger value="training" className="flex-1 text-xs">Träning</TabsTrigger>
            <TabsTrigger value="competitions" className="flex-1 text-xs">Tävling</TabsTrigger>
            <TabsTrigger value="journey" className="flex-1 text-xs">Klassresa</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-4">
            <AITrainingInsights dogs={dogs} sessions={training} results={competitions} />
            <CompStatsSummary competitions={competitions} />
            <TrainingFrequencyChart training={training} dogs={dogs} />
            {competitions.length >= 2 && (
              <CompTrendCharts competitions={competitions} dogs={dogs} />
            )}
          </TabsContent>

          <TabsContent value="training" className="mt-3">
            <TrainingFrequencyChart training={training} dogs={dogs} />
            {training.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga träningspass loggade ännu.</p>
            )}
          </TabsContent>

          <TabsContent value="competitions" className="mt-3">
            <CompStatsSummary competitions={competitions} />
            <DogComparison competitions={competitions} dogs={dogs} />
            {competitions.length >= 2 && (
              <CompTrendCharts competitions={competitions} dogs={dogs} />
            )}
            {competitions.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga tävlingsresultat loggade ännu.</p>
            )}
          </TabsContent>

          <TabsContent value="journey" className="mt-3">
            <PinCounter competitions={competitions} dogs={dogs} />
            {dogs.filter(d => d.is_active_competition_dog).length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga aktiva tävlingshundar.</p>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
