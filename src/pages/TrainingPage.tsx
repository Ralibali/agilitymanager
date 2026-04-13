import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@/components/PageContainer';
import { AddTrainingDialog } from '@/components/AddTrainingDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import type { Dog, TrainingSession, CompetitionResult } from '@/types';
import AITrainingInsights from '@/components/competitions/AITrainingInsights';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Star, Clock, RotateCcw, Download, FileText, Send, Sparkles, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { downloadPdf } from '@/lib/pdf';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import TrainingGoals from '@/components/training/TrainingGoals';
import CoachVideoAnalysis from '@/components/training/CoachVideoAnalysis';
import { CountUp } from '@/components/CountUp';
import TrainingCelebration from '@/components/training/TrainingCelebration';
import { differenceInDays } from 'date-fns';
import { useCallback } from 'react';

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function TrainingPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareSession, setShareSession] = useState<TrainingSession | null>(null);
  const [sportFilter, setSportFilter] = useState<'Alla' | 'Agility' | 'Hoopers'>('Alla');
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const refresh = async () => {
    const [d, t, r] = await Promise.all([store.getDogs(), store.getTraining(), store.getCompetitions()]);
    setDogs(d);
    setSessions(t);
    setResults(r);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  // Called after a new session is added – checks if it's the first today
  const handleAdded = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const hadTodayBefore = sessions.some(s => s.date === today);
    await refresh();
    if (!hadTodayBefore) {
      setShowCelebration(true);
    }
  }, [sessions]);

  // Streak calculation
  const getStreak = () => {
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    if (!dates.length) return 0;
    const today = new Date().toISOString().split('T')[0];
    if (dates[0] !== today && differenceInDays(new Date(today), new Date(dates[0])) > 1) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      if (differenceInDays(new Date(dates[i - 1]), new Date(dates[i])) === 1) streak++;
      else break;
    }
    return streak;
  };

  const getDog = (id: string) => dogs.find(d => d.id === id);

  // Filtered sessions
  const filtered = sessions
    .filter(s => sportFilter === 'Alla' || s.sport === sportFilter)
    .filter(s => !selectedDogId || s.dog_id === selectedDogId);

  // Stats
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = filtered.filter(s => new Date(s.date) >= weekAgo).length;
  const thisMonth = filtered.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalMinutes = thisMonth.reduce((sum, s) => sum + s.duration_min, 0);
  const totalReps = thisMonth.reduce((sum, s) => sum + s.reps, 0);

  if (loading) return <PageContainer title="Träning"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <>
    <Helmet>
      <title>Träningslogg – Agility & Hoopers | AgilityManager</title>
      <meta name="description" content="Strukturera din träning med AgilityManagers logg. Logga agility och hoopers – datum, hund, fokusområde och notat. Bygg historik pass för pass." />
      <link rel="canonical" href="https://agilitymanager.se/traning" />
    </Helmet>
    <PageContainer
      title={
        <span className="flex items-center gap-2">
          Träning
          {getStreak() > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm">
              <Flame size={12} /> {getStreak()} dagar
            </span>
          )}
        </span>
      }
      subtitle={`${sessions.length} träningspass`}
      action={
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              const rows = sessions.map(s => {
                const dog = getDog(s.dog_id);
                return { Datum: s.date, Hund: dog?.name ?? '', Typ: s.type, 'Längd (min)': s.duration_min, Repetitioner: s.reps, 'Hund energi': s.dog_energy, 'Förare energi': s.handler_energy, 'Bra': s.notes_good, 'Förbättra': s.notes_improve, Taggar: s.tags.join(', ') };
              });
              downloadCsv(rows, `traning-${format(new Date(), 'yyyy-MM-dd')}.csv`);
            }}>
              <Download size={14} /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              const headers = ['Datum', 'Hund', 'Typ', 'Min', 'Rep', 'Hund energi', 'Forare energi', 'Bra', 'Forbattra', 'Taggar'];
              const pdfRows = sessions.map(s => {
                const dog = getDog(s.dog_id);
                return [s.date, dog?.name ?? '', s.type, String(s.duration_min), String(s.reps), String(s.dog_energy), String(s.handler_energy), s.notes_good, s.notes_improve, s.tags.join(', ')];
              });
              downloadPdf({ title: 'Träningslogg', subtitle: `${sessions.length} pass – exporterad ${format(new Date(), 'yyyy-MM-dd')}`, headers, rows: pdfRows, filename: `traning-${format(new Date(), 'yyyy-MM-dd')}.pdf`, landscape: true });
            }}>
              <FileText size={14} /> PDF
            </Button>
            </>
          )}
          {dogs.length > 0 ? <AddTrainingDialog dogs={dogs} onAdded={handleAdded} /> : null}
        </div>
      }
    >
      {sessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center gap-4"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/10">
            <Sparkles size={28} className="text-primary" />
          </div>
          <p className="text-muted-foreground mb-1">Inga träningspass loggade ännu.</p>
          {dogs.length > 0 ? (
            <AddTrainingDialog dogs={dogs} onAdded={handleAdded} />
          ) : (
            <p className="text-sm text-muted-foreground">Lägg till en hund först!</p>
          )}
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show">

          {/* DOG SELECTOR */}
          {dogs.length > 1 && (
            <motion.div variants={fadeSlide} className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => setSelectedDogId(null)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  background: !selectedDogId ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
                  color: !selectedDogId ? 'hsl(var(--card))' : 'hsl(var(--foreground))',
                  border: !selectedDogId ? '1px solid hsl(var(--foreground))' : '1px solid hsl(var(--border))',
                }}
              >
                Alla hundar
              </button>
              {dogs.map(dog => (
                <button
                  key={dog.id}
                  onClick={() => setSelectedDogId(selectedDogId === dog.id ? null : dog.id)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    transition: 'background 150ms, color 150ms',
                    background: selectedDogId === dog.id ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                    color: selectedDogId === dog.id ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                    border: selectedDogId === dog.id ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  }}
                >
                  <DogAvatar dog={dog} size="xs" />
                  {dog.name}
                </button>
              ))}
            </motion.div>
          )}

          {/* SPORT FILTER */}
          <motion.div variants={fadeSlide} className="flex gap-1.5 mb-4">
            {(['Alla', 'Agility', 'Hoopers'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className="px-3.5 py-1.5 text-xs font-medium transition-all"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  background: sportFilter === s ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                  color: sportFilter === s ? 'hsl(var(--primary-foreground))' : 'hsl(var(--secondary-foreground))',
                }}
              >
                {s === 'Alla' ? '🏆 Alla' : s === 'Agility' ? '🏃 Agility' : '🐕 Hoopers'}
              </button>
            ))}
          </motion.div>

          {/* STATS CARDS */}
          <motion.div variants={fadeSlide} className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-card rounded-xl p-3 shadow-card text-center border border-border">
              <div className="text-lg font-bold text-foreground"><CountUp end={thisWeek} /></div>
              <div className="text-[10px] text-muted-foreground mt-0.5">denna vecka</div>
              <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(thisWeek * 20, 100)}%` }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                />
              </div>
            </div>
            <div className="bg-card rounded-xl p-3 shadow-card text-center border border-border">
              <div className="text-lg font-bold text-foreground"><CountUp end={totalMinutes} /></div>
              <div className="text-[10px] text-muted-foreground mt-0.5">min denna månad</div>
              <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(var(--accent)), hsl(var(--accent) / 0.6))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(totalMinutes / 3, 100)}%` }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                />
              </div>
            </div>
            <div className="bg-card rounded-xl p-3 shadow-card text-center border border-border">
              <div className="text-lg font-bold text-foreground"><CountUp end={totalReps} /></div>
              <div className="text-[10px] text-muted-foreground mt-0.5">rep denna månad</div>
              <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(totalReps / 2, 100)}%` }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                />
              </div>
            </div>
          </motion.div>

          {/* COACH & GOALS & AI */}
          <motion.div variants={fadeSlide}>
            <CoachVideoAnalysis dogs={dogs} />
          </motion.div>
          <motion.div variants={fadeSlide}>
            <TrainingGoals dogs={dogs} />
          </motion.div>
          <motion.div variants={fadeSlide}>
            <AITrainingInsights dogs={dogs} sessions={sessions} results={results} />
          </motion.div>

          {/* SESSION LIST */}
          <motion.div variants={fadeSlide} className="space-y-3 mt-4">
            {filtered.map((s, i) => {
              const dog = getDog(s.dog_id);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
                  className="bg-card rounded-xl p-4 shadow-card tappable border border-border"
                  style={{ borderRadius: 'var(--radius-card)' }}
                >
                  <div className="flex items-start gap-3">
                    {dog && <DogAvatar dog={dog} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-1.5">
                          {s.type}
                          <span
                            className="text-[9px] px-1.5 py-0.5 font-medium"
                            style={{
                              borderRadius: 'var(--radius-badge)',
                              background: s.sport === 'Hoopers' ? 'hsl(var(--accent) / 0.12)' : 'hsl(var(--primary) / 0.12)',
                              color: s.sport === 'Hoopers' ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
                            }}
                          >
                            {s.sport === 'Hoopers' ? '🅞 Hoopers' : 'AG'}
                          </span>
                        </h3>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setShareSession(s)} className="p-1 rounded-full hover:bg-secondary transition-colors" title="Dela med kompis">
                            <Send size={14} className="text-muted-foreground" />
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(s.date), 'd MMM', { locale: sv })}
                          </span>
                        </div>
                      </div>
                      {dog && <div className="text-xs text-muted-foreground">{dog.name}</div>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock size={12} /> {s.duration_min} min</span>
                        <span className="flex items-center gap-1"><RotateCcw size={12} /> {s.reps} rep</span>
                      </div>
                      {(s.notes_good || s.notes_improve) && (
                        <div className="mt-2 space-y-1 text-xs">
                          {s.notes_good && <p className="text-success">✓ {s.notes_good}</p>}
                          {s.notes_improve && <p className="text-accent">↑ {s.notes_improve}</p>}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground">🐕</span>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={10} className={n <= s.dog_energy ? 'fill-accent text-accent' : 'text-muted'} />
                          ))}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground">🧑</span>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={10} className={n <= s.handler_energy ? 'fill-primary text-primary' : 'text-muted'} />
                          ))}
                        </div>
                      </div>
                      {s.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.tags.map(t => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground"
                              style={{ borderRadius: 'var(--radius-badge)' }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </PageContainer>

    {shareSession && (
      <ShareToFriendDialog
        open={!!shareSession}
        onOpenChange={(open) => !open && setShareSession(null)}
        sharedType="training"
        sharedId={shareSession.id}
        sharedData={{
          name: shareSession.type,
          date: shareSession.date,
          duration: `${shareSession.duration_min} min`,
          reps: shareSession.reps,
          dog: getDog(shareSession.dog_id)?.name || '',
        }}
      />
    )}

    <TrainingCelebration
      show={showCelebration}
      streak={getStreak()}
      onDone={() => setShowCelebration(false)}
    />
    </>
  );
}
