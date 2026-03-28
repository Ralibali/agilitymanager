import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import { DogAvatar } from '@/components/DogAvatar';
import { Lock, Trophy, Dumbbell, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

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

  const recentComps = competitions.slice(0, 5);
  const passRate = competitions.length > 0
    ? Math.round(competitions.filter(c => c.passed).length / competitions.length * 100)
    : 0;

  const getDog = (id: string) => dogs.find(d => d.id === id);

  return (
    <PageContainer title="Statistik">
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card p-4 rounded-xl shadow-card">
          <Dumbbell size={20} className="text-primary mb-2" />
          <div className="text-2xl font-bold font-display text-foreground">{trainThisMonth.length}</div>
          <div className="text-xs text-muted-foreground">Träningar denna månad</div>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-card">
          <Trophy size={20} className="text-accent mb-2" />
          <div className="text-2xl font-bold font-display text-foreground">{passRate}%</div>
          <div className="text-xs text-muted-foreground">Godkännandeprocent</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-display font-semibold text-foreground mb-3">Senaste 5 tävlingsresultat</h2>
        {recentComps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga resultat ännu.</p>
        ) : (
          <div className="space-y-2">
            {recentComps.map(r => {
              const dog = getDog(r.dog_id);
              return (
                <div key={r.id} className="bg-card p-3 rounded-xl shadow-card flex items-center gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.event_name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(new Date(r.date), 'd MMM', { locale: sv })} · {r.time_sec}s · {r.faults} fel
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${r.passed ? 'text-success' : 'text-destructive'}`}>
                    {r.passed ? 'Godkänd' : 'Ej godkänd'}
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
          Tidsutveckling, felanalys, träningsfrekvens och mer med Premium.
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-accent font-medium">
          <Lock size={12} /> Premium-funktion
        </div>
      </div>
    </PageContainer>
  );
}
