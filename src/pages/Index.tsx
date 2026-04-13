import { useState, useEffect, useMemo } from 'react';
import { AddDogDialog } from '@/components/AddDogDialog';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { DogAvatar } from '@/components/DogAvatar';
import { MeritBadge, MeritProgress, calculateMerit } from '@/components/MeritTracker';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';
import { ArrowRight, Sparkles, Plus } from 'lucide-react';
import { CountUp } from '@/components/CountUp';
import { HomeSkeleton } from '@/components/SkeletonScreens';
import { PullToRefresh } from '@/components/PullToRefresh';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UpcomingClubEvents } from '@/components/dashboard/UpcomingClubEvents';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import AchievementsGrid from '@/components/AchievementsGrid';

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

  if (loading) {
    return <HomeSkeleton />;
  }

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

  // Sports list for subtitle
  const sportsList = [...new Set(dogs.map(d => d.sport))].join(', ');

  // Initials for avatar
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || '?';

  // Dog emoji colors
  const dogColors = ['#E8F4ED', '#FDF0E8', '#EBF0FF', '#FFF3E0', '#F3E8FF', '#E8F8F5'];

  if (dogs.length === 0) {
    return (
      <div className="min-h-screen px-4 pt-12 pb-24 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-6"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#1a6b3c' }}>
            <Sparkles size={36} className="text-white" />
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
              <button
                className="px-6 py-3 text-white font-semibold text-lg shadow-elevated"
                style={{ background: '#1a6b3c', borderRadius: 16 }}
              >
                🐕 Lägg till din hund
              </button>
            }
          />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      id="main-content"
      className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-foreground" style={{ fontSize: 28, fontWeight: 400 }}>
          {displayName ? `Hej, ${displayName} 👋` : 'Hej 👋'}
        </h1>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
          style={{ background: '#1a6b3c' }}
        >
          {initials}
        </div>
      </div>
      <p className="text-muted-foreground mb-5" style={{ fontSize: 13 }}>
        {dogs.length} hund{dogs.length > 1 ? 'ar' : ''} registrerad{dogs.length > 1 ? 'e' : ''} · {sportsList}
      </p>

      {/* DOG SELECTOR */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1" style={{ maskImage: 'linear-gradient(to right, black 92%, transparent)' }}>
        <button
          onClick={() => setSelectedDogId(null)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
          style={{
            borderRadius: 40,
            background: !selectedDogId ? '#111' : '#fff',
            color: !selectedDogId ? '#fff' : '#111',
            border: !selectedDogId ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)',
          }}
        >
          Alla hundar
        </button>
        {dogs.map((dog, i) => (
          <button
            key={dog.id}
            onClick={() => setSelectedDogId(selectedDogId === dog.id ? null : dog.id)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              borderRadius: 40,
              background: selectedDogId === dog.id ? '#111' : '#fff',
              color: selectedDogId === dog.id ? '#fff' : '#111',
              border: selectedDogId === dog.id ? '1px solid #111' : '1px solid rgba(0,0,0,0.12)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: dog.theme_color || dogColors[i % dogColors.length] }}
            />
            {dog.name}
          </button>
        ))}
      </div>

      {/* CTA BUTTONS */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Haptic hint: medium haptic on tap */}
        <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
          <button
            className="relative overflow-hidden flex flex-col items-start p-4 text-left w-full text-white btn-press"
            style={{ background: '#1a6b3c', borderRadius: 16 }}
          >
            <div
              className="absolute top-2 right-2 w-10 h-10 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <span className="text-lg mb-1">⚡</span>
            <span className="font-semibold text-sm">Logga träning</span>
            <span className="text-xs opacity-80">Snabblogg</span>
          </button>
        } />
        {/* Haptic hint: success haptic on tap */}
        <AddCompetitionDialog dogs={dogs} onAdded={refresh} trigger={
          <button
            className="relative overflow-hidden flex flex-col items-start p-4 text-left w-full text-white btn-press"
            style={{ background: '#c85d1e', borderRadius: 16 }}
          >
            <div
              className="absolute top-2 right-2 w-10 h-10 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <span className="text-lg mb-1">🏆</span>
            <span className="font-semibold text-sm">Logga tävling</span>
            <span className="text-xs opacity-80">Resultat & tider</span>
          </button>
        } />
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { emoji: '🔥', value: streak, label: 'Dagar i rad', accent: '#f59e0b', suffix: '' },
          { emoji: '💪', value: trainingThisWeek, label: 'Denna vecka', accent: '#1a6b3c', suffix: '' },
          { emoji: '⏱️', value: totalMinutes, label: 'Min i mån', accent: '#4f46e5', suffix: '' },
          { emoji: '✅', value: passedPct, label: 'Godkänd', accent: '#c85d1e', suffix: '%' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden bg-white text-center p-2.5 tappable"
            style={{
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            <div className="text-sm mb-0.5">{stat.emoji}</div>
            <div className="text-lg font-display font-bold text-foreground">
              <CountUp end={typeof stat.value === 'number' ? stat.value : 0} duration={0.6} suffix={stat.suffix} />
            </div>
            <div className="text-muted-foreground" style={{ fontSize: 9 }}>{stat.label}</div>
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ height: 2, background: stat.accent }}
            />
          </motion.div>
        ))}
      </div>

      {/* KENNEL OVERVIEW */}
      {dogs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Kennelöversikt</h2>
            <button
              onClick={() => navigate('/dogs')}
              className="text-xs font-medium flex items-center gap-0.5"
              style={{ color: '#1a6b3c' }}
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
              const bgColor = dogColors[i % dogColors.length];

              return (
                <motion.div
                  key={dog.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedDogId(dog.id)}
                  className="cursor-pointer bg-white p-3.5 flex items-center gap-3"
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    background: isRecent ? 'linear-gradient(135deg, #f0faf4 0%, #ffffff 100%)' : '#fff',
                  }}
                >
                  {/* Dog emoji avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: bgColor }}
                  >
                    🐕
                  </div>

                  {/* Name + class + badge */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{dog.name}</div>
                    <div className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                      {dog.sport} · {currentClass}
                    </div>
                    {cleanPct !== null && cleanPct >= 80 && (
                      <span
                        className="inline-block mt-1 px-2 py-0.5 text-white font-medium"
                        style={{ fontSize: 10, borderRadius: 10, background: '#1a6b3c' }}
                      >
                        {cleanPct}% nollrundor
                      </span>
                    )}
                    {dt.length === 0 && dc.length === 0 && (
                      <span
                        className="inline-block mt-1 px-2 py-0.5 text-white font-medium"
                        style={{ fontSize: 10, borderRadius: 10, background: '#c85d1e' }}
                      >
                        Ny hund
                      </span>
                    )}
                  </div>

                  {/* Stats right */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-foreground">{dt.length} <span className="text-muted-foreground font-normal" style={{ fontSize: 10 }}>pass</span></div>
                    {daysSince !== null && (
                      <div
                        className="font-medium"
                        style={{
                          fontSize: 11,
                          color: daysSince <= 3 ? '#1a6b3c' : daysSince <= 7 ? '#c85d1e' : '#999',
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
        </div>
      )}

      {/* Achievements */}
      <div className="mb-5 cursor-pointer" onClick={() => navigate('/goals')}>
        <AchievementsGrid
          dogs={selectedDogId ? dogs.filter(d => d.id === selectedDogId) : dogs}
          training={fTraining}
          competitions={fCompetitions}
          compact
        />
      </div>

      {/* Next competition */}
      {nextCompetition && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 mb-4 cursor-pointer"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            borderLeft: '4px solid #c85d1e',
          }}
          onClick={() => navigate('/competition')}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>📅</span>
            <span className="text-xs font-medium" style={{ color: '#c85d1e' }}>Nästa tävling</span>
            <ArrowRight size={12} className="text-muted-foreground ml-auto" />
          </div>
          <div className="font-semibold text-foreground text-sm">{nextCompetition.event_name}</div>
          <div className="text-muted-foreground" style={{ fontSize: 12 }}>
            {format(new Date(nextCompetition.date), 'd MMMM yyyy', { locale: sv })} · {nextCompetition.location}
          </div>
          <div className="font-medium mt-1" style={{ fontSize: 12, color: '#1a6b3c' }}>
            {differenceInDays(new Date(nextCompetition.date), new Date())} dagar kvar
          </div>
        </motion.div>
      )}

      {/* Club events */}
      <UpcomingClubEvents />

      {/* Latest training */}
      {latestTraining && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 mb-4 cursor-pointer"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
          onClick={() => navigate('/training')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Senaste träning</span>
            <span className="text-xs flex items-center gap-0.5" style={{ color: '#1a6b3c' }}>
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

      {/* Recent results */}
      {fCompetitions.slice(0, 3).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 mb-4"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>🏆</span>
              <span className="text-xs font-semibold text-foreground">Senaste resultat</span>
            </div>
            <button onClick={() => navigate('/competition')} className="text-xs flex items-center gap-0.5" style={{ color: '#1a6b3c' }}>
              Alla resultat <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {fCompetitions.slice(0, 3).map(r => {
              const dog = dogs.find(d => d.id === r.dog_id);
              return (
                <div key={r.id} className="flex items-center gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.event_name}</div>
                    <div className="text-muted-foreground" style={{ fontSize: 11 }}>
                      {format(new Date(r.date), 'd MMM', { locale: sv })} · {r.discipline} · {r.competition_level}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.time_sec > 0 && <span className="text-xs font-medium text-foreground">{r.time_sec}s</span>}
                    <span className="text-xs font-medium" style={{ color: r.passed ? '#1a6b3c' : '#dc2626' }}>
                      {r.passed ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Merit tracking */}
      {dogs.length > 0 && fCompetitions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 mb-4"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>📈</span>
              <span className="text-xs font-semibold text-foreground">Meriter</span>
            </div>
            <button onClick={() => navigate('/stats')} className="text-xs flex items-center gap-0.5" style={{ color: '#1a6b3c' }}>
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

      {/* Shortcuts */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { emoji: '⏱️', label: 'Tidtagarur', path: '/stopwatch' },
          { emoji: '❤️', label: 'Hälsa', path: '/health' },
          { emoji: '📐', label: 'Banplanerare', path: '/course-planner' },
          { emoji: '👥', label: 'Kompisar', path: '/friends', badge: unread.messages },
        ].map(item => (
          <motion.button
            key={item.path}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(item.path)}
            className="bg-white p-3 flex flex-col items-center gap-1.5 text-center relative"
            style={{
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-foreground font-medium" style={{ fontSize: 10 }}>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#dc2626' }}
              >
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default Index;
