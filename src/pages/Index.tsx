import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddDogDialog } from '@/components/AddDogDialog';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { DogAvatar } from '@/components/DogAvatar';
import { MeritBadge, MeritProgress, calculateMerit } from '@/components/MeritTracker';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';
import { Dumbbell, Trophy, Flame, Calendar, Sparkles, ArrowRight, Timer, Heart, Map, TrendingUp, Plus, MessageCircle, Bell, Users, AlertCircle } from 'lucide-react';
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
  const [recentNotifications, setRecentNotifications] = useState<{ id: string; message: string; created_at: string }[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem('onboarding_banner_dismissed') === 'true');
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

  // Fetch recent unread notifications
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('notifications')
      .select('id, message, created_at')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecentNotifications(data);
      });
  }, [user?.id]);

  // Onboarding check
  const showOnboarding = !loading && dogs.length === 0 && user?.user_metadata?.onboarding_complete !== true;

  if (showOnboarding) {
    return <OnboardingWizard onComplete={refresh} />;
  }

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

  // Days since last training
  const daysSinceTraining = latestTraining
    ? differenceInDays(new Date(), new Date(latestTraining.date))
    : null;

  // Recent competition results (last 3)
  const recentResults = competitions.slice(0, 3);

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

  const markNotificationsRead = async () => {
    if (!user?.id || recentNotifications.length === 0) return;
    const ids = recentNotifications.map(n => n.id);
    await supabase.from('notifications').update({ read: true }).in('id', ids);
    setRecentNotifications([]);
  };

  return (
    <PageContainer title={displayName ? `Hej ${displayName} 👋` : 'Dashboard'} subtitle={`${dogs.length} hund${dogs.length > 1 ? 'ar' : ''} registrerad${dogs.length > 1 ? 'e' : ''}`}>

      {/* Notification center - unread messages & notifications */}
      {(unread.total > 0 || recentNotifications.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Notiser</span>
            </div>
            {recentNotifications.length > 0 && (
              <button onClick={markNotificationsRead} className="text-[10px] text-primary hover:underline">
                Markera alla som lästa
              </button>
            )}
          </div>

          {unread.messages > 0 && (
            <button
              onClick={() => navigate('/friends')}
              className="flex items-center gap-2.5 w-full text-left p-2 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {unread.messages} oläst{unread.messages > 1 ? 'a' : ''} meddelande{unread.messages > 1 ? 'n' : ''}
                </span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground" />
            </button>
          )}

          {unread.friendRequests > 0 && (
            <button
              onClick={() => navigate('/friends')}
              className="flex items-center gap-2.5 w-full text-left p-2 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {unread.friendRequests} väntande kompisförfråg{unread.friendRequests > 1 ? 'ningar' : 'an'}
                </span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground" />
            </button>
          )}

          {recentNotifications.map(n => (
            <div key={n.id} className="flex items-start gap-2.5 p-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={14} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground">{n.message}</p>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(n.created_at), 'd MMM HH:mm', { locale: sv })}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Training reminder */}
      {daysSinceTraining !== null && daysSinceTraining >= 7 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {daysSinceTraining} dagar sedan senaste träningen
            </p>
            <p className="text-xs text-muted-foreground">Dags för ett nytt pass?</p>
          </div>
          <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
            <button className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold">
              Logga
            </button>
          } />
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
          <button className="flex items-center gap-2 p-4 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-card text-left w-full">
            <Dumbbell size={20} />
            <span>Logga träning</span>
          </button>
        } />
        <AddCompetitionDialog dogs={dogs} onAdded={refresh} trigger={
          <button className="flex items-center gap-2 p-4 rounded-xl gradient-accent text-accent-foreground font-semibold shadow-card text-left w-full">
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

      {/* Achievements summary */}
      <div className="mb-5 cursor-pointer" onClick={() => navigate('/goals')}>
        <AchievementsGrid dogs={dogs} training={training} competitions={competitions} compact />
      </div>

      {/* Next competition */}
      {nextCompetition && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-4 rounded-xl shadow-card mb-4 border-l-4 border-accent cursor-pointer"
          onClick={() => navigate('/competition')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-accent" />
            <span className="text-xs font-medium text-accent">Nästa tävling</span>
            <ArrowRight size={12} className="text-muted-foreground ml-auto" />
          </div>
          <div className="font-semibold text-foreground">{nextCompetition.event_name}</div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(nextCompetition.date), 'd MMMM yyyy', { locale: sv })} · {nextCompetition.location}
          </div>
          <div className="text-xs text-primary font-medium mt-1">
            {differenceInDays(new Date(nextCompetition.date), new Date())} dagar kvar
          </div>
        </motion.div>
      )}

      {/* Upcoming club events */}
      <UpcomingClubEvents />

      {/* Latest training */}
      {latestTraining && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-4 rounded-xl shadow-card mb-4 cursor-pointer"
          onClick={() => navigate('/training')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Senaste träning</span>
            <span className="text-xs text-primary flex items-center gap-0.5">
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
                  <span className="ml-1 text-success">· {latestTraining.notes_good.slice(0, 40)}{latestTraining.notes_good.length > 40 ? '...' : ''}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent competition results */}
      {recentResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-4 rounded-xl shadow-card mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-accent" />
              <span className="text-xs font-semibold text-foreground">Senaste resultat</span>
            </div>
            <button onClick={() => navigate('/competition')} className="text-xs text-primary flex items-center gap-0.5">
              Alla resultat <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {recentResults.map(r => {
              const dog = dogs.find(d => d.id === r.dog_id);
              return (
                <div key={r.id} className="flex items-center gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.event_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(r.date), 'd MMM', { locale: sv })} · {r.discipline} · {r.competition_level}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.time_sec > 0 && <span className="text-xs font-medium text-foreground">{r.time_sec}s</span>}
                    <span className={`text-xs font-medium ${r.passed ? 'text-success' : 'text-destructive'}`}>
                      {r.passed ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Merit tracking per dog */}
      {dogs.length > 0 && competitions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-4 rounded-xl shadow-card mb-4"
        >
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
        </motion.div>
      )}

      {/* Shortcuts */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/stopwatch')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Timer size={18} className="text-primary" />
          </div>
          <span className="text-[10px] font-medium text-foreground">Tidtagarur</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/health')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
            <Heart size={18} className="text-accent" />
          </div>
          <span className="text-[10px] font-medium text-foreground">Hälsa</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/course-planner')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Map size={18} className="text-foreground" />
          </div>
          <span className="text-[10px] font-medium text-foreground">Banplanerare</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/friends')}
          className="bg-card p-3 rounded-xl shadow-card flex flex-col items-center gap-1.5 text-center relative">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Users size={18} className="text-primary" />
            {unread.messages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {unread.messages > 9 ? '9+' : unread.messages}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-foreground">Kompisar</span>
        </motion.button>
      </div>

      {/* Dogs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-foreground">Mina hundar</h2>
          <button onClick={() => navigate('/dogs')} className="text-xs text-primary flex items-center gap-0.5">
            Visa alla <ArrowRight size={12} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {dogs.map(dog => {
            const dogTraining = training.filter(t => t.dog_id === dog.id);
            const lastSession = dogTraining[0];
            const daysSince = lastSession
              ? differenceInDays(new Date(), new Date(lastSession.date))
              : null;
            const currentClass = dog.sport === 'Hoopers' ? dog.hoopers_level : dog.competition_level;

            return (
              <motion.div
                key={dog.id}
                whileHover={{ scale: 1.03 }}
                className="bg-card p-3 rounded-xl shadow-card min-w-[160px] flex-shrink-0"
              >
                <div className="cursor-pointer" onClick={() => navigate('/dogs')}>
                  <DogAvatar dog={dog} />
                  <div className="mt-2 font-semibold text-foreground text-sm">{dog.name}</div>
                  <div className="text-[10px] text-muted-foreground">{dog.breed} · {dog.size_class}</div>
                  <div className="text-[10px] text-muted-foreground">{dog.sport} · {currentClass}</div>
                  <div className={`text-[10px] mt-1 font-medium ${daysSince !== null && daysSince <= 3 ? 'text-success' : daysSince !== null && daysSince <= 7 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {daysSince !== null ? (daysSince === 0 ? 'Tränade idag' : `${daysSince}d sedan träning`) : 'Ingen träning ännu'}
                  </div>
                </div>
                <AddTrainingDialog dogs={dogs} onAdded={refresh} trigger={
                  <button className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors">
                    <Plus size={10} /> Logga träning
                  </button>
                } />
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
};

export default Index;
