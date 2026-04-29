import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import AITrainingInsights from '@/components/competitions/AITrainingInsights';
import { PageContainer } from '@/components/PageContainer';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import { DogAvatar } from '@/components/DogAvatar';
import { Trophy, Dumbbell, TrendingUp, Zap, Target, BarChart3, Gauge, XCircle, CheckCircle, Award, Star, Clock, Flag, Medal, Milestone } from 'lucide-react';
import { format, startOfWeek, subWeeks, subDays, eachWeekOfInterval, parseISO, startOfYear, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DOG_COLORS = ['hsl(221, 79%, 48%)', 'hsl(16, 100%, 55%)', 'hsl(142, 60%, 40%)', 'hsl(280, 60%, 50%)', 'hsl(45, 90%, 50%)'];

const PIN_REQUIREMENTS: Record<string, { agility: number; hopp: number }> = {
  'K1': { agility: 3, hopp: 3 },
  'K2': { agility: 3, hopp: 3 },
  'K3': { agility: 10, hopp: 3 },
};

type DateRange = '30d' | '3m' | 'year' | 'all';

function getDateCutoff(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '30d': return subDays(now, 30);
    case '3m': return subDays(now, 90);
    case 'year': return startOfYear(now);
    case 'all': return null;
  }
}

// --- FILTERS BAR ---
function FiltersBar({
  dogs, selectedDog, onSelectDog, dateRange, onDateRange,
}: {
  dogs: Dog[]; selectedDog: string; onSelectDog: (v: string) => void;
  dateRange: DateRange; onDateRange: (v: DateRange) => void;
}) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <Select value={selectedDog} onValueChange={onSelectDog}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Alla hundar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla hundar</SelectItem>
          {dogs.map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        {([['30d', '30 dagar'], ['3m', '3 mån'], ['year', 'I år'], ['all', 'Allt']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onDateRange(key)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
              dateRange === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
        <div className="text-[10px] text-muted-foreground">Godkänd</div>
      </div>
      <div className="bg-card p-3 rounded-xl shadow-card text-center">
        <TrendingUp size={18} className="text-success mx-auto mb-1" />
        <div className="text-xl font-bold font-display text-foreground">{Math.round(totalMin / 60)}h</div>
        <div className="text-[10px] text-muted-foreground">Total träning</div>
      </div>
    </div>
  );
}

// --- 1. TRAINING FREQUENCY CHART (green bars) ---
function TrainingFrequencyChart({ training }: { training: TrainingSession[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11);
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });

    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const sessions = training.filter(t => {
        const d = parseISO(t.date);
        return d >= weekStart && d < weekEnd;
      });
      return {
        week: format(weekStart, 'd/M', { locale: sv }),
        count: sessions.length,
        minutes: sessions.reduce((s, t) => s + t.duration_min, 0),
      };
    });
  }, [training]);

  if (training.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <Dumbbell size={16} className="text-success" /> Träningsfrekvens (12 veckor)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'Pass') return [`${value} pass (${props.payload.minutes} min)`, 'Träning'];
              return [value, name];
            }}
          />
          <Bar dataKey="count" name="Pass" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- 2. COMPETITION PERFORMANCE CHART (per class, colored dots) ---
function CompetitionPerformanceChart({ competitions }: { competitions: CompetitionResult[] }) {
  const data = useMemo(() => {
    return [...competitions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(c => Number(c.time_sec) > 0)
      .map(c => {
        const classLabel = c.discipline === 'Jumping'
          ? `Hopp ${c.competition_level.replace('K', '')}`
          : `Klass ${c.competition_level.replace('K', '')}`;
        return {
          date: format(new Date(c.date), 'd/M-yy', { locale: sv }),
          time: Number(c.time_sec),
          class: classLabel,
          faults: c.faults,
          passed: c.passed,
          disqualified: c.disqualified,
          event: c.event_name,
          dotColor: c.disqualified
            ? 'hsl(var(--destructive))'
            : c.faults > 0
            ? 'hsl(var(--warning))'
            : 'hsl(var(--success))',
        };
      });
  }, [competitions]);

  if (data.length < 2) return null;

  const classes = [...new Set(data.map(d => d.class))];

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <TrendingUp size={16} className="text-primary" /> Tävlingstid per klass
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="s" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            formatter={(value: number, name: string) => [`${value}s`, name]}
            labelFormatter={(label) => {
              const item = data.find(d => d.date === label);
              return item ? `${label} — ${item.event}` : label;
            }}
          />
          {classes.map((cls, i) => {
            const isHopp = cls.startsWith('Hopp');
            const classNum = cls.match(/\d/)?.[0] || '1';
            const strokeWidth = classNum === '3' ? 3 : 2;
            const strokeDash = classNum === '1' ? '5 3' : undefined;
            const color = isHopp
              ? DOG_COLORS[(i + 2) % DOG_COLORS.length]
              : DOG_COLORS[i % DOG_COLORS.length];

            const classData = data.filter(d => d.class === cls).map(d => ({
              ...d,
              [`time_${cls}`]: d.time,
            }));

            return (
              <Line
                key={cls}
                data={classData}
                type="monotone"
                dataKey={`time_${cls}`}
                name={cls}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                dot={(props: any) => {
                  const item = classData.find(d => d.date === props.payload?.date);
                  const fillColor = item?.dotColor || color;
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={fillColor}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  );
                }}
                connectNulls
              />
            );
          })}
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-2 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> Nollrunda
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" /> Fel
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" /> Diskad
        </span>
      </div>
    </div>
  );
}

// --- 3. OBSTACLE FOCUS BREAKDOWN ---
function ObstacleFocusChart({ training }: { training: TrainingSession[] }) {
  const data = useMemo(() => {
    const categories: Record<string, { keywords: string[]; count: number }> = {
      'Slalom': { keywords: ['slalom', 'weave'], count: 0 },
      'Kontaktfält': { keywords: ['kontakt', 'a-ramp', 'vipp', 'brygga', 'dogwalk', 'gangbro'], count: 0 },
      'Hopp': { keywords: ['hopp', 'hinder', 'jump', 'språng'], count: 0 },
      'Tunnel': { keywords: ['tunnel', 'tub'], count: 0 },
      'Bord': { keywords: ['bord', 'table', 'stopp'], count: 0 },
      'Allmänt': { keywords: ['bana', 'sekvens', 'övning', 'distans', 'vändning', 'dirigering', 'handling'], count: 0 },
    };

    training.forEach(t => {
      const text = `${t.notes_good} ${t.notes_improve} ${(t.obstacles_trained || []).join(' ')} ${t.type}`.toLowerCase();
      for (const [cat, cfg] of Object.entries(categories)) {
        if (cfg.keywords.some(kw => text.includes(kw))) {
          cfg.count++;
        }
      }
    });

    return Object.entries(categories)
      .map(([name, cfg]) => ({ name, count: cfg.count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [training]);

  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <Target size={16} className="text-accent" /> Hinderfokus i träning
      </h3>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">{d.name}</span>
            <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full flex items-center justify-end pr-2 transition-all"
                style={{ width: `${(d.count / maxCount) * 100}%`, minWidth: 24 }}
              >
                <span className="text-[10px] font-bold text-accent-foreground">{d.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Baserat på nyckelordsmatchning i träningsanteckningar.</p>
    </div>
  );
}

// --- 4. MILESTONES TIMELINE ---
function MilestonesTimeline({ training, competitions, dogs }: { training: TrainingSession[]; competitions: CompetitionResult[]; dogs: Dog[] }) {
  const milestones = useMemo(() => {
    const items: { date: Date; icon: string; title: string; desc: string }[] = [];

    // First training session
    const sorted = [...training].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length > 0) {
      const first = sorted[0];
      const dog = dogs.find(d => d.id === first.dog_id);
      items.push({
        date: new Date(first.date),
        icon: '🏁',
        title: 'Första träningen',
        desc: dog ? `${dog.name} — ${first.type}` : first.type,
      });
    }

    // First nollrunda
    const compsSorted = [...competitions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstClean = compsSorted.find(c => c.faults === 0 && !c.disqualified && c.passed);
    if (firstClean) {
      const dog = dogs.find(d => d.id === firstClean.dog_id);
      items.push({
        date: new Date(firstClean.date),
        icon: '🎯',
        title: 'Första nollrundan',
        desc: `${dog?.name || ''} — ${firstClean.event_name}`,
      });
    }

    // Class promotions (detect when class changed based on results sequence)
    const dogGroups = new Map<string, CompetitionResult[]>();
    compsSorted.forEach(c => {
      const arr = dogGroups.get(c.dog_id) || [];
      arr.push(c);
      dogGroups.set(c.dog_id, arr);
    });

    dogGroups.forEach((results, dogId) => {
      const dog = dogs.find(d => d.id === dogId);
      let prevLevel = '';
      results.forEach(r => {
        if (prevLevel && r.competition_level !== prevLevel) {
          items.push({
            date: new Date(r.date),
            icon: '⬆️',
            title: `Uppflyttad till ${r.competition_level}`,
            desc: `${dog?.name || ''} — ${r.discipline}`,
          });
        }
        prevLevel = r.competition_level;
      });
    });

    // Personal best time per class
    const bestTimes = new Map<string, { time: number; comp: CompetitionResult }>();
    compsSorted.forEach(c => {
      const t = Number(c.time_sec);
      if (t <= 0) return;
      const key = `${c.dog_id}_${c.competition_level}_${c.discipline}`;
      const existing = bestTimes.get(key);
      if (!existing || t < existing.time) {
        bestTimes.set(key, { time: t, comp: c });
      }
    });
    bestTimes.forEach(({ comp }) => {
      const dog = dogs.find(d => d.id === comp.dog_id);
      items.push({
        date: new Date(comp.date),
        icon: '⚡',
        title: `PB: ${Number(comp.time_sec)}s`,
        desc: `${dog?.name || ''} — ${comp.discipline} ${comp.competition_level}`,
      });
    });

    // Training milestones (10th, 50th, 100th session)
    [10, 50, 100, 200].forEach(n => {
      if (sorted.length >= n) {
        const session = sorted[n - 1];
        items.push({
          date: new Date(session.date),
          icon: n >= 100 ? '🏆' : '🎉',
          title: `${n}:e träningspasset`,
          desc: `Milstolpe uppnådd`,
        });
      }
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [training, competitions, dogs]);

  if (milestones.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
        <Flag size={16} className="text-primary" /> Milstolpar
      </h3>
      <div className="relative pl-6">
        <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {milestones.slice(0, 15).map((m, i) => (
            <div key={i} className="relative flex items-start gap-3">
              <div className="absolute -left-3.5 w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs z-10">
                {m.icon}
              </div>
              <div className="ml-4">
                <div className="text-sm font-semibold text-foreground">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
                <div className="text-[10px] text-muted-foreground">
                  {format(m.date, 'd MMMM yyyy', { locale: sv })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- TRAINING MOOD TREND ---
function TrainingMoodTrend({ training }: { training: TrainingSession[] }) {
  const data = useMemo(() => {
    const sessionsWithMood = training
      .filter(t => t.overall_mood && t.overall_mood > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sessionsWithMood.length < 2) return [];
    return sessionsWithMood.map(t => ({
      date: format(new Date(t.date), 'd/M', { locale: sv }),
      mood: t.overall_mood,
    }));
  }, [training]);

  if (data.length < 2) return null;

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <Star size={16} className="text-accent" /> Känsla över tid
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[1, 5]} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Line type="monotone" dataKey="mood" name="Känsla" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- OBSTACLE FAULT FREQUENCY ---
function ObstacleFaultChart({ training }: { training: TrainingSession[] }) {
  const data = useMemo(() => {
    const faultMap: Record<string, number> = {};
    training.forEach(t => {
      if (t.obstacles_trained && t.fault_count && t.fault_count > 0) {
        const perObstacle = t.fault_count / (t.obstacles_trained.length || 1);
        t.obstacles_trained.forEach(o => {
          faultMap[o] = (faultMap[o] || 0) + perObstacle;
        });
      }
    });
    return Object.entries(faultMap)
      .map(([name, faults]) => ({ name, faults: Math.round(faults * 10) / 10 }))
      .sort((a, b) => b.faults - a.faults)
      .slice(0, 8);
  }, [training]);

  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-4 shadow-card mb-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <Target size={16} className="text-destructive" /> Felfrekvens per hinder
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={60} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Bar dataKey="faults" name="Fel" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- HOOPERS DIRIGERING TREND ---
function DirigeringTrend({ training }: { training: TrainingSession[] }) {
  const data = useMemo(() => {
    const sessions = training
      .filter(t => t.sport === 'Hoopers' && (t.dirigering_score || t.banflyt_score))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sessions.length < 2) return [];

    return sessions.map((t, i) => {
      const window = sessions.slice(Math.max(0, i - 6), i + 1);
      const avgDir = window.reduce((s, w) => s + (w.dirigering_score || 0), 0) / window.length;
      const avgFlow = window.reduce((s, w) => s + (w.banflyt_score || 0), 0) / window.length;
      return {
        date: format(new Date(t.date), 'd/M', { locale: sv }),
        dirigering: t.dirigering_score,
        banflyt: t.banflyt_score,
        dirSnitt: Math.round(avgDir * 10) / 10,
        flytSnitt: Math.round(avgFlow * 10) / 10,
      };
    });
  }, [training]);

  if (data.length < 2) return null;

  return (
    <div className="space-y-4 mb-4">
      <div className="bg-card rounded-xl p-4 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
          <Zap size={16} className="text-primary" /> Dirigeringstrend (hoopers)
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[1, 5]} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Line type="monotone" dataKey="dirigering" name="Dirigering" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="dirSnitt" name="Snitt (7)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-card rounded-xl p-4 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
          <TrendingUp size={16} className="text-success" /> Banflyt-trend (hoopers)
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[1, 5]} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Line type="monotone" dataKey="banflyt" name="Banflyt" stroke="hsl(var(--success))" strokeWidth={1.5} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="flytSnitt" name="Snitt (7)" stroke="hsl(var(--success))" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- TRAINING STREAK BADGE ---
function TrainingStreakBadge({ training }: { training: TrainingSession[] }) {
  const streak = useMemo(() => {
    const weekMap = new Map<string, boolean>();
    training.forEach(t => {
      const d = new Date(t.date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      weekMap.set(ws.toISOString(), true);
    });
    const now = new Date();
    let count = 0;
    let check = startOfWeek(now, { weekStartsOn: 1 });
    if (!weekMap.has(check.toISOString())) {
      check = subWeeks(check, 1);
      if (!weekMap.has(check.toISOString())) return 0;
    }
    while (weekMap.has(check.toISOString())) {
      count++;
      check = subWeeks(check, 1);
    }
    return count;
  }, [training]);

  if (streak < 2) return null;

  return (
    <div className="bg-accent/10 rounded-xl p-4 shadow-card mb-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
        <span className="text-2xl">🔥</span>
      </div>
      <div>
        <div className="font-display font-bold text-foreground text-lg">{streak} veckor i rad!</div>
        <div className="text-xs text-muted-foreground">Minst ett pass varje vecka</div>
      </div>
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

// --- DOG COMPARISON ---
function DogComparison({ competitions, dogs }: { competitions: CompetitionResult[]; dogs: Dog[] }) {
  const dogIds = useMemo(() => [...new Set(competitions.map(c => c.dog_id))], [competitions]);

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

  if (dogIds.length < 2) return null;

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

// --- PIN COUNTER ---
function PinCounter({ competitions, dogs }: { competitions: CompetitionResult[]; dogs: Dog[] }) {
  const dogData = useMemo(() => {
    return dogs.filter(d => d.is_active_competition_dog).map(dog => {
      const dc = competitions.filter(c => c.dog_id === dog.id);
      const agilityPins = dc.filter(c => c.passed && c.discipline === 'Agility' && c.competition_level === dog.competition_level).length;
      const hoppPins = dc.filter(c => c.passed && c.discipline === 'Jumping' && c.competition_level === dog.jumping_level).length;
      const agilityReq = PIN_REQUIREMENTS[dog.competition_level];
      const hoppReq = PIN_REQUIREMENTS[dog.jumping_level];
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

          {agilityReq && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Agility {dog.competition_level} → {nextClass(dog.competition_level)}</span>
                <span className="text-xs font-semibold text-foreground">{agilityPins}/{agilityReq.agility} pinnar</span>
              </div>
              <Progress value={Math.min((agilityPins / agilityReq.agility) * 100, 100)} className="h-2" />
            </div>
          )}

          {hoppReq && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Hopp {dog.jumping_level} → {nextClass(dog.jumping_level)}</span>
                <span className="text-xs font-semibold text-foreground">{hoppPins}/{hoppReq.hopp} pinnar</span>
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
                      <span className="text-[8px] text-muted-foreground mt-0.5">{ch.agility}a/{ch.hopp}h</span>
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

// --- MAIN PAGE ---
export default function StatsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [allTraining, setAllTraining] = useState<TrainingSession[]>([]);
  const [allCompetitions, setAllCompetitions] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  useEffect(() => {
    Promise.all([store.getDogs(), store.getTraining(), store.getCompetitions()]).then(([d, t, c]) => {
      setDogs(d); setAllTraining(t); setAllCompetitions(c); setLoading(false);
    });
  }, []);

  const training = useMemo(() => {
    let filtered = allTraining;
    if (selectedDog !== 'all') filtered = filtered.filter(t => t.dog_id === selectedDog);
    const cutoff = getDateCutoff(dateRange);
    if (cutoff) filtered = filtered.filter(t => new Date(t.date) >= cutoff);
    return filtered;
  }, [allTraining, selectedDog, dateRange]);

  const competitions = useMemo(() => {
    let filtered = allCompetitions;
    if (selectedDog !== 'all') filtered = filtered.filter(c => c.dog_id === selectedDog);
    const cutoff = getDateCutoff(dateRange);
    if (cutoff) filtered = filtered.filter(c => new Date(c.date) >= cutoff);
    return filtered;
  }, [allCompetitions, selectedDog, dateRange]);

  if (loading) return <PageContainer title="Statistik"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <>
      <Helmet>
        <title>Statistik & Framsteg – Agility & Hoopers | AgilityManager</title>
        <meta name="description" content="Avancerad statistik med trendanalys, hinderfokus, milstolpar och framstegsöversikt för agility och hoopers." />
      </Helmet>
      <PageContainer title="Statistik & Framsteg">
        <FiltersBar
          dogs={dogs}
          selectedDog={selectedDog}
          onSelectDog={setSelectedDog}
          dateRange={dateRange}
          onDateRange={setDateRange}
        />

        <OverviewCards training={training} competitions={competitions} />

        <Tabs defaultValue="overview" className="mb-4">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="overview" className="flex-1 text-[10px]">Översikt</TabsTrigger>
            <TabsTrigger value="training" className="flex-1 text-[10px]">Träning</TabsTrigger>
            <TabsTrigger value="competitions" className="flex-1 text-[10px]">Tävling</TabsTrigger>
            <TabsTrigger value="milestones" className="flex-1 text-[10px]">Milstolpar</TabsTrigger>
            <TabsTrigger value="journey" className="flex-1 text-[10px]">Klassresa</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-4">
            <TrainingStreakBadge training={training} />
            <AITrainingInsights dogs={dogs} sessions={training} results={competitions} />
            <CompStatsSummary competitions={competitions} />
            <TrainingFrequencyChart training={training} />
            <CompetitionPerformanceChart competitions={competitions} />
          </TabsContent>

          <TabsContent value="training" className="mt-3 space-y-4">
            <TrainingStreakBadge training={training} />
            <TrainingFrequencyChart training={training} />
            <ObstacleFocusChart training={training} />
            <TrainingMoodTrend training={training} />
            <ObstacleFaultChart training={training} />
            <DirigeringTrend training={training} />
            {training.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Inga träningspass loggade ännu.</p>
            )}
          </TabsContent>

          <TabsContent value="competitions" className="mt-3 space-y-4">
            <CompStatsSummary competitions={competitions} />
            <CompetitionPerformanceChart competitions={competitions} />
            <DogComparison competitions={competitions} dogs={dogs} />
            {competitions.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Inga tävlingsresultat ännu.
              </p>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="mt-3 space-y-4">
            <MilestonesTimeline training={training} competitions={competitions} dogs={dogs} />
            {training.length === 0 && competitions.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Ingen data att visa milstolpar för.</p>
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
