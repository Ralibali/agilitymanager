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
import { Star, Clock, RotateCcw, Download, FileText, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { downloadPdf } from '@/lib/pdf';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import TrainingGoals from '@/components/training/TrainingGoals';

export default function TrainingPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareSession, setShareSession] = useState<TrainingSession | null>(null);
  const refresh = async () => {
    const [d, t, r] = await Promise.all([store.getDogs(), store.getTraining(), store.getCompetitions()]);
    setDogs(d);
    setSessions(t);
    setResults(r);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const getDog = (id: string) => dogs.find(d => d.id === id);

  if (loading) return <PageContainer title="Träning"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <>
    <Helmet>
      <title>Träningslogg Agility – Logga varje pass | AgilityManager</title>
      <meta name="description" content="Strukturera din agilityträning med AgilityManagers träningslogg. Logga datum, hund, fokusområde och notat. Bygg historik pass för pass." />
      <link rel="canonical" href="https://agilitymanager.se/traning" />
    </Helmet>
    <PageContainer
      title="Träning"
      subtitle={`${sessions.length} träningspass`}
      action={
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const rows = sessions.map(s => {
                  const dog = getDog(s.dog_id);
                  return {
                    Datum: s.date,
                    Hund: dog?.name ?? '',
                    Typ: s.type,
                    'Längd (min)': s.duration_min,
                    Repetitioner: s.reps,
                    'Hund energi': s.dog_energy,
                    'Förare energi': s.handler_energy,
                    'Bra': s.notes_good,
                    'Förbättra': s.notes_improve,
                    Taggar: s.tags.join(', '),
                  };
                });
                downloadCsv(rows, `traning-${format(new Date(), 'yyyy-MM-dd')}.csv`);
              }}
            >
              <Download size={14} /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const headers = ['Datum', 'Hund', 'Typ', 'Min', 'Rep', 'Hund ⚡', 'Förare ⚡', 'Bra', 'Förbättra', 'Taggar'];
                const pdfRows = sessions.map(s => {
                  const dog = getDog(s.dog_id);
                  return [
                    s.date, dog?.name ?? '', s.type,
                    String(s.duration_min), String(s.reps),
                    String(s.dog_energy), String(s.handler_energy),
                    s.notes_good, s.notes_improve, s.tags.join(', '),
                  ];
                });
                downloadPdf({
                  title: 'Träningslogg',
                  subtitle: `${sessions.length} pass – exporterad ${format(new Date(), 'yyyy-MM-dd')}`,
                  headers,
                  rows: pdfRows,
                  filename: `traning-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
                  landscape: true,
                });
              }}
            >
              <FileText size={14} /> PDF
            </Button>
            </>
          )}
          {dogs.length > 0 ? <AddTrainingDialog dogs={dogs} onAdded={refresh} /> : null}
        </div>
      }
    >
      {sessions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-2">Inga träningspass loggade ännu.</p>
          {dogs.length > 0 ? (
            <AddTrainingDialog dogs={dogs} onAdded={refresh} />
          ) : (
            <p className="text-sm">Lägg till en hund först!</p>
          )}
        </div>
      ) : (
        <>
        <AITrainingInsights dogs={dogs} sessions={sessions} results={results} />
        <div className="space-y-3 mt-3">
          {sessions.map((s, i) => {
            const dog = getDog(s.dog_id);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-foreground text-sm">{s.type}</h3>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShareSession(s)} className="p-1 rounded-full hover:bg-secondary" title="Dela med kompis">
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
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        </>
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
    </>
  );
}
