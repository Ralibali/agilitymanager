import { useState, useEffect, useMemo } from 'react';
import { AddDogDialog } from '@/components/AddDogDialog';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { DogAvatar } from '@/components/DogAvatar';
import { MeritBadge, MeritProgress, calculateMerit } from '@/components/MeritTracker';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';
import { ArrowRight, Sparkles, Plus, Zap, Trophy, TrendingUp } from 'lucide-react';
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

/* ── stagger container ── */
const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const fadeSlide = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
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

  // Filtered data
  const fTraining = selectedDogId ? training.filter(t => t.dog_id === selectedDogId) : training;
  const fCompetitions = selectedDogId ? competitions.filter(c => c.dog_id === selectedDogId) : competitions;
  const fPlanned = selectedDogId ? planned.filter(p => p.dog_id === selectedDogId) : planned;
  const nextCompetition = fPlanned.find(p => new Date(p.date) >= new Date());

  // Streak
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
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || '?';

  const dogColors = ['#E8F4ED', '#FDF0E8', '#EBF0FF', '#FFF3E0', '#F3E8FF', '#E8F8F5'];

  if (dogs.length === 0) {
    return (
      <div className="min-h-screen px-4 pt-12 pb-24 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a6b3c, #2d9a5c)' }}
          >
            <Sparkles size={36} className="text-white" />
          </motion.div>
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
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3 text-white font-semibold text-lg"
                style={{
                  background: 'linear-gradient(135deg, #1a6b3c, #2d9a5c)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: '0 8px 24px rgba(26, 107, 60, 0.3)',
                }}
              >
                🐕 Lägg till din hund
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
      <motion.div variants={fadeSlide} className="flex items-center justify-between mb-1">
        <h1 className="font-display text-foreground" style={{ fontSize: 28, fontWeight: 400 }}>
          {displayName ? `Hej, ${displayName.split(' ')[0]} 👋` : 'Hej 👋'}
        </h1>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1a6b3c, #2d9a5c)',
            boxShadow: '0 2px 8px rgba(26, 107, 60, 0.3)',
          }}
          onClick={() => navigate('/settings')}
        >
          {initials}
        </motion.div>
      </motion.div>
      <motion.p variants={fadeSlide} className="text-muted-foreground mb-5" style={{ fontSize: 13 }}>
        {dogs.length} hund{dogs.length > 1 ? 'ar' : ''} registrerad{dogs.length > 1 ? 'e' : ''} · {sportsList}
      </motion.p>

      {/* ═══ DOG SELECTOR ═══ */}
      <motion.div
        variants={fadeSlide}
        className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1"
        style={{ maskImage: 'linear-gradient(to right, black 92%, transparent)' }}
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedDogId(null)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0"
          style={{
            borderRadius: 'var(--radius-pill)',
            background: !selectedDogId ? '#111' : '#fff',
            color: !selectedDogId ? '#fff' : '#111',
            border: !selectedDogId ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)',
            boxShadow: !selectedDogId ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          Alla hundar
        </motion.button>
        {dogs.map((dog, i) => (
          <motion.button
            key={dog.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedDogId(selectedDogId === dog.id ? null : dog.id)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0"
            style={{
              borderRadius: 'var(--radius-pill)',
              background: selectedDogId === dog.id ? '#111' : '#fff',
              color: selectedDogId === dog.id ? '#fff' : '#111',
              border: selectedDogId === dog.id ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)',
              boxShadow: selectedDogId === dog.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: dog.theme_color || dogColors[i % dogColors.length],
                boxShadow: selectedDogId === dog.id ? `0 0 6px ${dog.theme_color || dogColors[i % dogColors.length]}` : 'none',
              }}
            />
            {dog.name}
          </motion.button>
        ))}
      </motion.div>

      {/* ═══ CTA BUTTONS ═══ */}
      <motion.div variants={fadeSlide} className="grid grid-cols-2 gap-3 mb-5">
        <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden flex flex-col items-start p-4 text-left w-full text-white group"
            style={{
              background: 'linear-gradient(135deg, #1a6b3c 0%, #2d9a5c 100%)',
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 4px 16px rgba(26, 107, 60, 0.25)',
            }}
          >
            {/* Animated shimmer overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
              }}
            />
            <div
              className="absolute -top-3 -right-3 w-16 h-16 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
            <span className="text-xl mb-1.5 relative z-10">⚡</span>
            <span className="font-semibold text-sm relative z-10">Logga träning</span>
            <span className="text-xs opacity-75 relative z-10">Snabblogg</span>
          </motion.button>
        } />
        <AddCompetitionDialog dogs={dogs} onAdded={refresh} trigger={
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden flex flex-col items-start p-4 text-left w-full text-white group"
            style={{
              background: 'linear-gradient(135deg, #c85d1e 0%, #e07a3a 100%)',
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 4px 16px rgba(200, 93, 30, 0.25)',
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
              }}
            />
            <div
              className="absolute -top-3 -right-3 w-16 h-16 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
            <span className="text-xl mb-1.5 relative z-10">🏆</span>
            <span className="font-semibold text-sm relative z-10">Logga tävling</span>
            <span className="text-xs opacity-75 relative z-10">Resultat & tider</span>
          </motion.button>
        } />
      </motion.div>

      {/* ═══ STATS ROW ═══ */}
      <motion.div variants={fadeSlide} className="grid grid-cols-4 gap-2 mb-6">
        {[
          { emoji: '🔥', value: streak, label: 'Streak', accent: '#f59e0b', suffix: '' },
          { emoji: '💪', value: trainingThisWeek, label: 'Veckan', accent: '#1a6b3c', suffix: '' },
          { emoji: '⏱️', value: totalMinutes, label: 'Min/mån', accent: '#6366f1', suffix: '' },
          { emoji: '✅', value: passedPct, label: 'Godkänd', accent: '#c85d1e', suffix: '%' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="relative overflow-hidden bg-card text-center p-2.5 cursor-pointer"
            style={{
              borderRadius: 'var(--radius-badge)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 400 }}
              className="text-base mb-0.5"
            >
              {stat.emoji}
            </motion.div>
            <div className="text-lg font-display font-bold text-foreground">
              <CountUp end={typeof stat.value === 'number' ? stat.value : 0} duration={0.8} suffix={stat.suffix} />
            </div>
            <div className="text-muted-foreground" style={{ fontSize: 9 }}>{stat.label}</div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              className="absolute bottom-0 left-0 right-0 origin-left"
              style={{ height: 3, background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}80)`, borderRadius: '0 0 8px 8px' }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ KENNEL OVERVIEW ═══ */}
      {dogs.length > 0 && (
        <motion.div variants={fadeSlide} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Dina hundar</h2>
            <motion.button
              whileHover={{ x: 3 }}
              onClick={() => navigate('/dogs')}
              className="text-xs font-medium flex items-center gap-0.5"
              style={{ color: '#1a6b3c' }}
            >
              Hantera <ArrowRight size={12} />
            </motion.button>
          </div>
          <div className="space-y-2.5">
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
              const bgColor = dogColors[i % dogColors.length];

              return (
                <motion.div
                  key={dog.id}
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setSelectedDogId(dog.id)}
                  className="cursor-pointer p-4 flex items-center gap-3"
                  style={{
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: isRecent
                      ? '0 2px 12px rgba(26, 107, 60, 0.1), 0 1px 3px rgba(0,0,0,0.04)'
                      : '0 1px 4px rgba(0,0,0,0.05)',
                    background: isRecent
                      ? 'linear-gradient(135deg, #f0faf4 0%, #ffffff 60%)'
                      : '#fff',
                    transition: 'box-shadow 300ms, background 300ms',
                  }}
                >
                  {/* Animated avatar */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 * i, type: 'spring' }}
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                    style={{
                      background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
                      boxShadow: `0 2px 8px ${bgColor}80`,
                    }}
                  >
                    🐕
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{dog.name}</div>
                    <div className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                      {dog.sport} · {currentClass}
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {cleanPct !== null && cleanPct >= 80 && (
                        <span
                          className="inline-block px-2 py-0.5 text-white font-medium"
                          style={{
                            fontSize: 10,
                            borderRadius: 'var(--radius-badge)',
                            background: 'linear-gradient(135deg, #1a6b3c, #2d9a5c)',
                          }}
                        >
                          ✨ {cleanPct}% nollrundor
                        </span>
                      )}
                      {dt.length === 0 && dc.length === 0 && (
                        <span
                          className="inline-block px-2 py-0.5 text-white font-medium"
                          style={{
                            fontSize: 10,
                            borderRadius: 'var(--radius-badge)',
                            background: 'linear-gradient(135deg, #c85d1e, #e07a3a)',
                          }}
                        >
                          🆕 Ny hund
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-foreground">{dt.length}</div>
                    <div className="text-muted-foreground" style={{ fontSize: 10 }}>pass</div>
                    {daysSince !== null && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-semibold mt-0.5"
                        style={{
                          fontSize: 11,
                          color: daysSince <= 3 ? '#1a6b3c' : daysSince <= 7 ? '#c85d1e' : '#999',
                        }}
                      >
                        {daysSince === 0 ? '🟢 Idag' : daysSince <= 3 ? `${daysSince}d ✓` : `${daysSince}d`}
                      </motion.div>
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
          whileHover={{ scale: 1.01 }}
          className="p-4 mb-4 cursor-pointer relative overflow-hidden"
          style={{
            borderRadius: 'var(--radius-card)',
            border: '1px solid rgba(200, 93, 30, 0.15)',
            background: 'linear-gradient(135deg, #fdf0e8 0%, #fff 60%)',
            boxShadow: '0 2px 12px rgba(200, 93, 30, 0.08)',
          }}
          onClick={() => navigate('/competition')}
        >
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full" style={{ background: 'rgba(200, 93, 30, 0.05)' }} />
          <div className="flex items-center gap-2 mb-1.5">
            <span>📅</span>
            <span className="text-xs font-semibold" style={{ color: '#c85d1e' }}>Nästa tävling</span>
            <ArrowRight size={12} className="text-muted-foreground ml-auto" />
          </div>
          <div className="font-semibold text-foreground text-sm">{nextCompetition.event_name}</div>
          <div className="text-muted-foreground" style={{ fontSize: 12 }}>
            {format(new Date(nextCompetition.date), 'd MMMM yyyy', { locale: sv })} · {nextCompetition.location}
          </div>
          <div className="font-semibold mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5" style={{
            fontSize: 12,
            color: '#1a6b3c',
            background: '#e8f4ed',
            borderRadius: 'var(--radius-pill)',
          }}>
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
          whileHover={{ scale: 1.01 }}
          className="p-4 mb-4 cursor-pointer"
          style={{
            borderRadius: 'var(--radius-card)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
          }}
          onClick={() => navigate('/training')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Senaste träning</span>
            <span className="text-xs flex items-center gap-0.5 font-medium" style={{ color: '#1a6b3c' }}>
              Visa alla <ArrowRight size={12} />
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dogs.find(d => d.id === latestTraining.dog_id) && (
              <DogAvatar dog={dogs.find(d => d.id === latestTraining.dog_id)!} size="sm" />
            )}
            <div className="flex-1">
              <div className="font-medium text-foreground text-sm">
                {latestTraining.type} · {latestTraining.duration_min} min
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(latestTraining.date), 'd MMM', { locale: sv })}
                {latestTraining.notes_good && (
                  <span className="ml-1" style={{ color: '#1a6b3c' }}>
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
          className="p-4 mb-4"
          style={{
            borderRadius: 'var(--radius-card)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>🏆</span>
              <span className="text-xs font-semibold text-foreground">Senaste resultat</span>
            </div>
            <motion.button whileHover={{ x: 3 }} onClick={() => navigate('/competition')} className="text-xs flex items-center gap-0.5 font-medium" style={{ color: '#1a6b3c' }}>
              Alla resultat <ArrowRight size={12} />
            </motion.button>
          </div>
          <div className="space-y-2.5">
            {fCompetitions.slice(0, 3).map((r, idx) => {
              const dog = dogs.find(d => d.id === r.dog_id);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="flex items-center gap-3"
                >
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.event_name}</div>
                    <div className="text-muted-foreground" style={{ fontSize: 11 }}>
                      {format(new Date(r.date), 'd MMM', { locale: sv })} · {r.discipline} · {r.competition_level}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.time_sec > 0 && <span className="text-xs font-medium text-foreground">{r.time_sec}s</span>}
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{
                        background: r.passed ? 'linear-gradient(135deg, #1a6b3c, #2d9a5c)' : '#dc2626',
                        boxShadow: r.passed ? '0 2px 6px rgba(26,107,60,0.3)' : '0 2px 6px rgba(220,38,38,0.3)',
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
          className="p-4 mb-4"
          style={{
            borderRadius: 'var(--radius-card)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>📈</span>
              <span className="text-xs font-semibold text-foreground">Meriter</span>
            </div>
            <motion.button whileHover={{ x: 3 }} onClick={() => navigate('/stats')} className="text-xs flex items-center gap-0.5 font-medium" style={{ color: '#1a6b3c' }}>
              Statistik <ArrowRight size={12} />
            </motion.button>
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
                    <span className="text-sm font-medium text-foreground">{dog.name}</span>
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
          { emoji: '⏱️', label: 'Tidtagarur', path: '/stopwatch' },
          { emoji: '❤️', label: 'Hälsa', path: '/health' },
          { emoji: '📐', label: 'Banplanerare', path: '/course-planner' },
          { emoji: '👥', label: 'Kompisar', path: '/friends', badge: unread.messages },
        ].map((item, i) => (
          <motion.button
            key={item.path}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.94 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.08 }}
            onClick={() => navigate(item.path)}
            className="bg-card p-3 flex flex-col items-center gap-1.5 text-center relative"
            style={{
              borderRadius: 'var(--radius-card)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-foreground font-medium" style={{ fontSize: 10 }}>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  borderRadius: 'var(--radius-pill)',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                }}
              >
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
    </PullToRefresh>
  );
};

export default Index;
