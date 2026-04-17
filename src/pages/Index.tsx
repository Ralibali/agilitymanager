import { useState, useEffect, useMemo } from 'react';
import { AddDogDialog } from '@/components/AddDogDialog';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { DogAvatar } from '@/components/DogAvatar';
import { MeritBadge, MeritProgress, calculateMerit } from '@/components/MeritTracker';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';
import { ArrowRight, Sparkles, Plus, Zap, Trophy, TrendingUp, Flame, Clock, Target, CheckCircle2, Settings, Timer, Heart, PenTool, Users } from 'lucide-react';
import { CountUp } from '@/components/CountUp';
import { HomeSkeleton } from '@/components/SkeletonScreens';
import { PullToRefresh } from '@/components/PullToRefresh';
import { EmptyState } from '@/components/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UpcomingClubEvents } from '@/components/dashboard/UpcomingClubEvents';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import AchievementsGrid from '@/components/AchievementsGrid';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeSlide = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const Index = () => {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const unread = useUnreadCounts();

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

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name);
    });
  }, [user?.id]);

  const showOnboarding = !loading && dogs.length === 0 && user?.user_metadata?.onboarding_complete !== true;
  if (showOnboarding) return <OnboardingWizard onComplete={refresh} />;
  if (loading) return <HomeSkeleton />;

  const fTraining = selectedDogId ? training.filter(t => t.dog_id === selectedDogId) : training;
  const fCompetitions = selectedDogId ? competitions.filter(c => c.dog_id === selectedDogId) : competitions;
  const fPlanned = selectedDogId ? planned.filter(p => p.dog_id === selectedDogId) : planned;
  const nextCompetition = fPlanned.find(p => new Date(p.date) >= new Date());

  const getStreak = () => {
    const dates = [...new Set(fTraining.map(t => t.date))].sort().reverse();
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

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const trainingThisWeek = fTraining.filter(t => new Date(t.date) >= weekAgo).length;

  const now = new Date();
  const trainingThisMonth = fTraining.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalMinutes = trainingThisMonth.reduce((sum, t) => sum + t.duration_min, 0);

  const passedPct = fCompetitions.length > 0
    ? Math.round(fCompetitions.filter(c => c.passed).length / fCompetitions.length * 100)
    : 0;

  const latestTraining = fTraining[0];
  const daysSinceTraining = latestTraining ? differenceInDays(new Date(), new Date(latestTraining.date)) : null;
  const sportsList = [...new Set(dogs.map(d => d.sport))].join(', ');
  const firstName = displayName ? displayName.split(' ')[0] : null;

  if (dogs.length === 0) {
    return (
      <div className="min-h-screen px-4 pt-12 pb-24 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center gradient-primary"
          >
            <Sparkles size={28} className="text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-semibold font-display text-foreground mb-2 tracking-tight">
              Välkommen till AgilityManager
            </h1>
            <p className="text-muted-foreground text-[13px] max-w-xs mx-auto leading-relaxed">
              Din digitala agility-dagbok. Börja med att lägga till din hund.
            </p>
          </div>
          <AddDogDialog
            onAdded={refresh}
            trigger={
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="px-6 py-3 text-primary-foreground font-semibold text-sm gradient-primary shadow-elevated"
                style={{ borderRadius: 'var(--radius-button)' }}
              >
                <Plus size={16} className="inline mr-1.5 -mt-0.5" />
                Lägg till din hund
              </motion.button>
            }
          />
        </motion.div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={refresh}>
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      id="main-content"
      className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto"
    >
      {/* ═══ HEADER ═══ */}
      <motion.div variants={fadeSlide} className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-foreground text-xl font-semibold tracking-tight">
            {firstName ? `Hej, ${firstName}` : 'Hej'} 👋
          </h1>
          <p className="text-muted-foreground text-[12px] mt-0.5">
            {dogs.length} hund{dogs.length > 1 ? 'ar' : ''} · {sportsList}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary"
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} className="text-muted-foreground" />
        </motion.button>
      </motion.div>

      {/* ═══ DOG SELECTOR ═══ */}
      <motion.div
        variants={fadeSlide}
        className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedDogId(null)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
          style={{
            borderRadius: 'var(--radius-pill)',
            background: !selectedDogId ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
            color: !selectedDogId ? 'hsl(var(--card))' : 'hsl(var(--foreground))',
            border: `1px solid ${!selectedDogId ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}`,
          }}
        >
          Alla
        </motion.button>
        {dogs.map((dog) => (
          <motion.button
            key={dog.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedDogId(selectedDogId === dog.id ? null : dog.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              borderRadius: 'var(--radius-pill)',
              background: selectedDogId === dog.id ? 'hsl(var(--primary))' : 'hsl(var(--card))',
              color: selectedDogId === dog.id ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
              border: `1px solid ${selectedDogId === dog.id ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
            }}
          >
            <DogAvatar dog={dog} size="xs" />
            {dog.name}
          </motion.button>
        ))}
      </motion.div>

      {/* ═══ CTA BUTTONS ═══ */}
      <motion.div variants={fadeSlide} className="grid grid-cols-2 gap-2.5 mb-4">
        <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden flex flex-col items-start p-3.5 text-left w-full text-primary-foreground group gradient-primary"
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 2px 12px hsl(148, 62%, 26% / 0.2)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/[0.06]" />
            <Zap size={18} className="mb-2 relative z-10 opacity-90" />
            <span className="font-semibold text-[13px] relative z-10">Logga träning</span>
            <span className="text-[11px] opacity-70 relative z-10">Snabblogg</span>
          </motion.button>
        } />
        <AddCompetitionDialog dogs={dogs} onAdded={refresh} trigger={
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden flex flex-col items-start p-3.5 text-left w-full text-accent-foreground group gradient-accent"
            style={{
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 2px 12px hsl(22, 75%, 45% / 0.2)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/[0.06]" />
            <Trophy size={18} className="mb-2 relative z-10 opacity-90" />
            <span className="font-semibold text-[13px] relative z-10">Logga tävling</span>
            <span className="text-[11px] opacity-70 relative z-10">Resultat & tider</span>
          </motion.button>
        } />
      </motion.div>

      {/* ═══ STATS ROW ═══ */}
      <motion.div variants={fadeSlide} className="grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: Flame, value: streak, label: 'Streak', color: 'hsl(38, 85%, 52%)' },
          { icon: Target, value: trainingThisWeek, label: 'Veckan', color: 'hsl(var(--primary))' },
          { icon: Clock, value: totalMinutes, label: 'Min/mån', color: 'hsl(245, 58%, 60%)' },
          { icon: CheckCircle2, value: passedPct, label: 'Godkänd', color: 'hsl(var(--accent))', suffix: '%' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="bg-card text-center p-2.5 border border-border card-hover"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <Icon size={14} style={{ color: stat.color }} className="mx-auto mb-1" />
              <div className="text-base font-display font-bold text-foreground leading-none">
                <CountUp end={typeof stat.value === 'number' ? stat.value : 0} duration={0.8} suffix={stat.suffix || ''} />
              </div>
              <div className="text-muted-foreground mt-0.5" style={{ fontSize: 9 }}>{stat.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ═══ KENNEL OVERVIEW ═══ */}
      {dogs.length > 0 && (
        <motion.div variants={fadeSlide} className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13px] font-semibold text-foreground">Dina hundar</h2>
            <button
              onClick={() => navigate('/dogs')}
              className="text-xs font-medium flex items-center gap-0.5 text-primary"
            >
              Hantera <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {(selectedDogId ? dogs.filter(d => d.id === selectedDogId) : dogs).map((dog, i) => {
              const dt = training.filter(t => t.dog_id === dog.id);
              const dc = competitions.filter(c => c.dog_id === dog.id);
              const currentClass = dog.sport === 'Hoopers' ? dog.hoopers_level : dog.competition_level;
              const lastT = dt[0];
              const daysSince = lastT ? differenceInDays(new Date(), new Date(lastT.date)) : null;
              const cleanPct = dc.length > 0
                ? Math.round(dc.filter(c => c.passed && c.faults === 0 && !c.disqualified).length / dc.length * 100)
                : null;
              const isRecent = daysSince !== null && daysSince <= 3;

              return (
                <motion.div
                  key={dog.id}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedDogId(dog.id)}
                  className="cursor-pointer p-3.5 flex items-center gap-3 bg-card border border-border card-hover"
                  style={{ borderRadius: 'var(--radius-card)' }}
                >
                  <DogAvatar dog={dog} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{dog.name}</div>
                    <div className="text-muted-foreground text-[11px] truncate">
                      {dog.sport} · {currentClass}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {cleanPct !== null && cleanPct >= 80 && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-primary-foreground gradient-primary" style={{ borderRadius: 'var(--radius-badge)' }}>
                          ✨ {cleanPct}% nollrundor
                        </span>
                      )}
                      {dt.length === 0 && dc.length === 0 && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-accent-foreground gradient-accent" style={{ borderRadius: 'var(--radius-badge)' }}>
                          Ny hund
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-foreground">{dt.length}</div>
                    <div className="text-muted-foreground" style={{ fontSize: 10 }}>pass</div>
                    {daysSince !== null && (
                      <div
                        className="font-medium mt-0.5"
                        style={{
                          fontSize: 10,
                          color: daysSince <= 3 ? 'hsl(var(--primary))' : daysSince <= 7 ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {daysSince === 0 ? 'Idag' : `${daysSince}d sedan`}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ ACHIEVEMENTS ═══ */}
      <motion.div variants={fadeSlide} className="mb-5 cursor-pointer" onClick={() => navigate('/goals')}>
        <AchievementsGrid
          dogs={selectedDogId ? dogs.filter(d => d.id === selectedDogId) : dogs}
          training={fTraining}
          competitions={fCompetitions}
          compact
        />
      </motion.div>

      {/* ═══ NEXT COMPETITION ═══ */}
      {nextCompetition && (
        <motion.div
          variants={fadeSlide}
          whileTap={{ scale: 0.985 }}
          className="p-3.5 mb-4 cursor-pointer bg-card border border-border card-hover"
          style={{ borderRadius: 'var(--radius-card)' }}
          onClick={() => navigate('/app/competition')}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--accent) / 0.1)' }}>
              <Trophy size={14} className="text-accent" />
            </div>
            <span className="text-xs font-semibold text-accent">Nästa tävling</span>
            <ArrowRight size={12} className="text-muted-foreground ml-auto" />
          </div>
          <div className="font-semibold text-foreground text-[13px]">{nextCompetition.event_name}</div>
          <div className="text-muted-foreground text-[12px]">
            {format(new Date(nextCompetition.date), 'd MMMM yyyy', { locale: sv })} · {nextCompetition.location}
          </div>
          <div className="font-medium mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 text-primary text-[11px]"
            style={{ background: 'hsl(var(--primary) / 0.08)', borderRadius: 'var(--radius-pill)' }}>
            ⏳ {differenceInDays(new Date(nextCompetition.date), new Date())} dagar kvar
          </div>
        </motion.div>
      )}

      {/* ═══ CLUB EVENTS ═══ */}
      <motion.div variants={fadeSlide}>
        <UpcomingClubEvents />
      </motion.div>

      {/* ═══ LATEST TRAINING ═══ */}
      {latestTraining && (
        <motion.div
          variants={fadeSlide}
          whileTap={{ scale: 0.985 }}
          className="p-3.5 mb-4 cursor-pointer bg-card border border-border card-hover"
          style={{ borderRadius: 'var(--radius-card)' }}
          onClick={() => navigate('/training')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Senaste träning</span>
            <span className="text-xs flex items-center gap-0.5 font-medium text-primary">
              Visa alla <ArrowRight size={12} />
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dogs.find(d => d.id === latestTraining.dog_id) && (
              <DogAvatar dog={dogs.find(d => d.id === latestTraining.dog_id)!} size="sm" />
            )}
            <div className="flex-1">
              <div className="font-medium text-foreground text-[13px]">
                {latestTraining.type} · {latestTraining.duration_min} min
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(latestTraining.date), 'd MMM', { locale: sv })}
                {latestTraining.notes_good && (
                  <span className="ml-1 text-primary">
                    · {latestTraining.notes_good.slice(0, 40)}{latestTraining.notes_good.length > 40 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ RECENT RESULTS ═══ */}
      {fCompetitions.slice(0, 3).length > 0 && (
        <motion.div
          variants={fadeSlide}
          className="p-3.5 mb-4 bg-card border border-border"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Senaste resultat</span>
            <button onClick={() => navigate('/app/competition')} className="text-xs flex items-center gap-0.5 font-medium text-primary">
              Alla <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {fCompetitions.slice(0, 3).map((r, idx) => {
              const dog = dogs.find(d => d.id === r.dog_id);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * idx }}
                  className="flex items-center gap-3"
                >
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{r.event_name}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {format(new Date(r.date), 'd MMM', { locale: sv })} · {r.discipline} · {r.competition_level}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.time_sec > 0 && <span className="text-xs font-medium text-foreground">{r.time_sec}s</span>}
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        background: r.passed ? 'hsl(var(--primary))' : 'hsl(var(--destructive))',
                      }}
                    >
                      {r.passed ? '✓' : '✗'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ MERITS ═══ */}
      {dogs.length > 0 && fCompetitions.length > 0 && (
        <motion.div
          variants={fadeSlide}
          className="p-3.5 mb-4 bg-card border border-border"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Meriter</span>
            <button onClick={() => navigate('/stats')} className="text-xs flex items-center gap-0.5 font-medium text-primary">
              Statistik <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {(selectedDogId ? dogs.filter(d => d.id === selectedDogId) : dogs).map(dog => {
              const dogResults = fCompetitions.filter(c => c.dog_id === dog.id);
              if (dogResults.length === 0) return null;
              const merit = calculateMerit(dogResults, dog.competition_level);
              return (
                <div key={dog.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DogAvatar dog={dog} size="sm" />
                    <span className="text-[13px] font-medium text-foreground">{dog.name}</span>
                    <MeritBadge merit={merit} />
                  </div>
                  <MeritProgress merit={merit} />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ SHORTCUTS ═══ */}
      <motion.div variants={fadeSlide} className="grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: Timer, label: 'Tidtagarur', path: '/stopwatch' },
          { icon: Heart, label: 'Hälsa', path: '/health' },
          { icon: PenTool, label: 'Banplanerare', path: '/course-planner' },
          { icon: Users, label: 'Kompisar', path: '/friends', badge: unread.messages },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.94 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              onClick={() => navigate(item.path)}
              className="bg-card p-3 flex flex-col items-center gap-1.5 text-center relative border border-border card-hover"
              style={{ borderRadius: 'var(--radius-card)' }}
            >
              <Icon size={18} className="text-muted-foreground" />
              <span className="text-foreground font-medium text-[10px]">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 text-white text-[9px] font-bold flex items-center justify-center px-1"
                  style={{ background: 'hsl(var(--destructive))', borderRadius: '10px' }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
    </PullToRefresh>
  );
};

export default Index;
