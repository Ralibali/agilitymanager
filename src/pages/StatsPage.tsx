import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@/components/PageContainer';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import { DogAvatar } from '@/components/DogAvatar';
import { Lock, Trophy, Dumbbell, TrendingUp, Zap, Target, Award, BarChart3, Gauge, XCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

function CompStats({ competitions, dogs }: { competitions: CompetitionResult[]; dogs: Dog[] }) {
  if (competitions.length === 0) return null;

  const total = competitions.length;
  const disqualified = competitions.filter(c => c.disqualified).length;
  const approved = total - disqualified; // Godkänd = inte disk
  const passed = competitions.filter(c => c.passed).length; // Pinnar
  const cleanRuns = competitions.filter(c => c.faults === 0 && !c.disqualified).length;
  const avgFaults = competitions.reduce((s, c) => s + c.faults, 0) / total;
  const avgTime = competitions.reduce((s, c) => s + Number(c.time_sec), 0) / total;

  // Speed
  const withSpeed = competitions.filter(c => c.course_length_m && c.course_length_m > 0 && Number(c.time_sec) > 0);
  const avgSpeed = withSpeed.length > 0
    ? withSpeed.reduce((s, c) => s + (c.course_length_m! / Number(c.time_sec)), 0) / withSpeed.length
    : null;

  const dogIds = [...new Set(competitions.map(c => c.dog_id))];

  const stats = [
    {
      icon: <CheckCircle size={18} className="text-success" />,
      label: 'Godkända',
      value: `${Math.round(approved / total * 100)}%`,
      sub: `${approved} av ${total} (ej disk)`,
    },
    {
      icon: <Target size={18} className="text-primary" />,
      label: 'Nollade',
      value: `${Math.round(cleanRuns / total * 100)}%`,
      sub: `${cleanRuns} av ${total} utan fel`,
    },
    {
      icon: <Trophy size={18} className="text-accent" />,
      label: 'Pinnar',
      value: `${passed}`,
      sub: `${Math.round(passed / total * 100)}% av loppen`,
    },
    {
      icon: <XCircle size={18} className="text-destructive" />,
      label: 'Disk',
      value: `${Math.round(disqualified / total * 100)}%`,
      sub: `${disqualified} av ${total}`,
    },
    {
      icon: <BarChart3 size={18} className="text-muted-foreground" />,
      label: 'Snitt fel/lopp',
      value: avgFaults.toFixed(1),
      sub: `Snitt tid: ${avgTime.toFixed(1)}s`,
    },
    {
      icon: <Gauge size={18} className="text-warning" />,
      label: 'Snitt m/s',
      value: avgSpeed !== null ? avgSpeed.toFixed(2) : '–',
      sub: avgSpeed !== null ? `${withSpeed.length} lopp med banlängd` : 'Ange banlängd för m/s',
    },
  ];

  return (
    <div className="mb-6">
      <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Zap size={18} className="text-accent" /> Tävlingsstatistik
      </h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card p-3 rounded-xl shadow-card">
            <div className="flex items-center gap-2 mb-1">
              {s.icon}
              <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
            </div>
            <div className="text-xl font-bold font-display text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {dogIds.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Per hund</h3>
          {dogIds.map(dogId => {
            const dog = dogs.find(d => d.id === dogId);
            if (!dog) return null;
            const dc = competitions.filter(c => c.dog_id === dogId);
            const dClean = dc.filter(c => c.faults === 0 && c.passed).length;
            const dPassed = dc.filter(c => c.passed).length;
            return (
              <div key={dogId} className="bg-card p-3 rounded-xl shadow-card flex items-center gap-3">
                <DogAvatar dog={dog} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{dog.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {dc.length} lopp · {dPassed} pinnar · {dClean} nollade
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">
                    {dc.length > 0 ? Math.round(dClean / dc.length * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">nollat</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const trainThisMonth = training.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const passRate = competitions.length > 0
    ? Math.round(competitions.filter(c => c.passed).length / competitions.length * 100)
    : 0;

  const totalTrainingMin = training.reduce((s, t) => s + t.duration_min, 0);
  const getDog = (id: string) => dogs.find(d => d.id === id);
  const recentComps = competitions.slice(0, 5);

  return (
    <>
    <Helmet>
      <title>Statistik | AgilityManager</title>
      <meta name="description" content="Se din tävlings- och träningsstatistik." />
    </Helmet>
    <PageContainer title="Statistik">
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <Dumbbell size={18} className="text-primary mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{trainThisMonth.length}</div>
          <div className="text-[10px] text-muted-foreground">Träningar/mån</div>
        </div>
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <Trophy size={18} className="text-accent mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{passRate}%</div>
          <div className="text-[10px] text-muted-foreground">Godkända</div>
        </div>
        <div className="bg-card p-3 rounded-xl shadow-card text-center">
          <TrendingUp size={18} className="text-success mx-auto mb-1" />
          <div className="text-xl font-bold font-display text-foreground">{Math.round(totalTrainingMin / 60)}h</div>
          <div className="text-[10px] text-muted-foreground">Total träning</div>
        </div>
      </div>

      <CompStats competitions={competitions} dogs={dogs} />

      <div className="mb-6">
        <h2 className="font-display font-semibold text-foreground mb-3">Senaste tävlingsresultat</h2>
        {recentComps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga resultat ännu.</p>
        ) : (
          <div className="space-y-2">
            {recentComps.map(r => {
              const dog = getDog(r.dog_id);
              const speed = r.course_length_m && r.course_length_m > 0 && Number(r.time_sec) > 0
                ? (r.course_length_m / Number(r.time_sec)).toFixed(2)
                : null;
              return (
                <div key={r.id} className="bg-card p-3 rounded-xl shadow-card flex items-center gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.event_name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(new Date(r.date), 'd MMM', { locale: sv })} · {r.time_sec}s · {r.faults} fel
                      {speed && ` · ${speed} m/s`}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${r.passed ? 'text-success' : 'text-destructive'}`}>
                    {r.passed ? 'Pinne' : 'Ej godkänd'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-5 shadow-card border border-accent/20 text-center">
        <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center mx-auto mb-3">
          <TrendingUp size={24} className="text-accent-foreground" />
        </div>
        <h3 className="font-display font-bold text-foreground mb-1">Avancerad statistik</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Tidsutveckling, hastighetsgraf och träningsfrekvens med Premium.
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-accent font-medium">
          <Lock size={12} /> Premium-funktion
        </div>
      </div>
    </PageContainer>
    </>
  );
}
