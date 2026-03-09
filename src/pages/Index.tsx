import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddDogDialog } from '@/components/AddDogDialog';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { MeritBadge, MeritProgress, calculateMerit } from '@/components/MeritTracker';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';
import { Dumbbell, Trophy, Flame, Calendar, Sparkles, ArrowRight, Timer, Heart, Map, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';

const Index = () => {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    const [d, t, c, p] = await Promise.all([
      store.getDogs(),
      store.getTraining(),
      store.getCompetitions(),
      store.getPlanned(),
    ]);
    setDogs(d);
    setTraining(t);
    setCompetitions(c);
    setPlanned(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  if (loading) {
    return <PageContainer><div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Laddar...</div></PageContainer>;
  }

  const latestTraining = training[0];
  const nextCompetition = planned.find(p => new Date(p.date) >= new Date());

  const getStreak = () => {
    const dates = [...new Set(training.map(t => t.date))].sort().reverse();
    if (!dates.length) return 0;
    let streak = 1;
    const today = new Date().toISOString().split('T')[0];
    if (dates[0] !== today && differenceInDays(new Date(today), new Date(dates[0])) > 1) return 0;
    for (let i = 1; i < dates.length; i++) {
      if (differenceInDays(new Date(dates[i - 1]), new Date(dates[i])) === 1) streak++;
      else break;
    }
    return streak;
  };
  const streak = getStreak();

  // Training this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const trainingThisWeek = training.filter(t => new Date(t.date) >= weekAgo).length;

  // Total training minutes this month
  const now = new Date();
  const trainingThisMonth = training.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalMinutes = trainingThisMonth.reduce((sum, t) => sum + t.duration_min, 0);

  if (dogs.length === 0) {
    return (
      <PageContainer>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6"
        >
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
            <Sparkles size={36} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Välkommen till AgilityManager!
            </h1>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Din digitala agility-dagbok. Börja med att lägga till din hund.
            </p>
          </div>
          <AddDogDialog
            onAdded={refresh}
            trigger={
              <button className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg shadow-elevated">
                🐕 Lägg till din hund
              </button>
            }
          />
        </motion.div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" subtitle={`${dogs.length} hund${dogs.length > 1 ? 'ar' : ''} registrerad${dogs.length > 1 ? 'e' : ''}`}>
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
          <button className="flex items-center gap-2 p-4 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-card text-left">
            <Dumbbell size={20} />
            <span>Logga träning</span>
          </button>
        } />
        <AddCompetitionDialog dogs={dogs} onAdded={refresh} trigger={
          <button className="flex items-center gap-2 p-4 rounded-xl gradient-accent text-accent-foreground font-semibold shadow-card text-left">
            <Trophy size={20} />
            <span>Logga tävling</span>
          </button>
        } />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-2.5 rounded-xl shadow-card text-center">
          <Flame size={16} className="text-accent mx-auto mb-0.5" />
          <div className="text-lg font-bold font-display text-foreground">{streak}</div>
          <div className="text-[9px] text-muted-foreground">Dagar i rad</div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-2.5 rounded-xl shadow-card text-center">
          <Dumbbell size={16} className="text-primary mx-auto mb-0.5" />
          <div className="text-lg font-bold font-display text-foreground">{trainingThisWeek}</div>
          <div className="text-[9px] text-muted-foreground">Denna vecka</div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-2.5 rounded-xl shadow-card text-center">
          <Timer size={16} className="text-primary mx-auto mb-0.5" />
          <div className="text-lg font-bold font-display text-foreground">{totalMinutes}</div>
          <div className="text-[9px] text-muted-foreground">Min i mån</div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card p-2.5 rounded-xl shadow-card text-center">
          <Trophy size={16} className="text-accent mx-auto mb-0.5" />
          <div className="text-lg font-bold font-display text-foreground">
            {competitions.length > 0 ? Math.round(competitions.filter(c => c.passed).length / competitions.length * 100) : 0}%
          </div>
          <div className="text-[9px] text-muted-foreground">Godkänd</div>
        </motion.div>
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/stopwatch')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Timer size={18} className="text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">Tidtagarur</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/health')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
            <Heart size={18} className="text-accent" />
          </div>
          <span className="text-xs font-medium text-foreground">Hälsa</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/course-planner')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Map size={18} className="text-foreground" />
          </div>
          <span className="text-xs font-medium text-foreground">Banplanerare</span>
        </motion.button>
      </div>

      {/* Next competition */}
      {nextCompetition && (
        <div className="bg-card p-4 rounded-xl shadow-card mb-4 border-l-4 border-accent">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-accent" />
            <span className="text-xs font-medium text-accent">Nästa tävling</span>
          </div>
          <div className="font-semibold text-foreground">{nextCompetition.event_name}</div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(nextCompetition.date), 'd MMMM yyyy', { locale: sv })} · {nextCompetition.location}
          </div>
          <div className="text-xs text-primary font-medium mt-1">
            {differenceInDays(new Date(nextCompetition.date), new Date())} dagar kvar
          </div>
        </div>
      )}

      {/* Latest training */}
      {latestTraining && (
        <div className="bg-card p-4 rounded-xl shadow-card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Senaste träning</span>
            <button onClick={() => navigate('/training')} className="text-xs text-primary flex items-center gap-0.5">
              Visa alla <ArrowRight size={12} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {dogs.find(d => d.id === latestTraining.dog_id) && (
              <DogAvatar dog={dogs.find(d => d.id === latestTraining.dog_id)!} size="sm" />
            )}
            <div>
              <div className="font-medium text-foreground text-sm">
                {latestTraining.type} · {latestTraining.duration_min} min
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(latestTraining.date), 'd MMM', { locale: sv })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merit tracking per dog */}
      {dogs.length > 0 && competitions.length > 0 && (
        <div className="bg-card p-4 rounded-xl shadow-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Meriter</span>
            </div>
            <button onClick={() => navigate('/stats')} className="text-xs text-primary flex items-center gap-0.5">
              Statistik <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {dogs.map(dog => {
              const dogResults = competitions.filter(c => c.dog_id === dog.id);
              if (dogResults.length === 0) return null;
              const merit = calculateMerit(dogResults, dog.competition_level);
              return (
                <div key={dog.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DogAvatar dog={dog} size="sm" />
                    <span className="text-sm font-medium text-foreground">{dog.name}</span>
                    <MeritBadge merit={merit} />
                  </div>
                  <MeritProgress merit={merit} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dogs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-foreground">Mina hundar</h2>
          <button onClick={() => navigate('/dogs')} className="text-xs text-primary flex items-center gap-0.5">
            Visa alla <ArrowRight size={12} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {dogs.map(dog => (
            <motion.div
              key={dog.id}
              whileHover={{ scale: 1.03 }}
              className="bg-card p-3 rounded-xl shadow-card min-w-[140px] flex-shrink-0 cursor-pointer"
              onClick={() => navigate('/dogs')}
            >
              <DogAvatar dog={dog} />
              <div className="mt-2 font-semibold text-foreground text-sm">{dog.name}</div>
              <div className="text-[10px] text-muted-foreground">{dog.breed} · {dog.size_class}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default Index;
