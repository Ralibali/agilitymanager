import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddCompetitionDialog } from '@/components/AddCompetitionDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { Dog, CompetitionResult, PlannedCompetition } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CheckCircle2, XCircle, Medal, ExternalLink, Calendar, CheckSquare, Square, Trash2, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CHECKLIST_ITEMS = [
  'Vaccinationsintyg',
  'Mätintyg',
  'Koppel & halsband',
  'Vatten & skål',
  'Godis / belöning',
  'Leksak / tuggisar',
  'Fällstol / filt',
  'Väderlämpliga kläder',
  'Ombyte & bekväma skor',
  'Laddad mobil',
];

export default function CompetitionPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [planned, setPlanned] = useState<PlannedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom-checklist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');
  const refresh = async () => {
    const [d, r, p] = await Promise.all([
      store.getDogs(),
      store.getCompetitions(),
      store.getPlanned(),
    ]);
    setDogs(d);
    setResults(r);
    setPlanned(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const getDog = (id: string) => dogs.find(d => d.id === id);

  const toggleCheck = (item: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  };

  const handleDeletePlanned = async (id: string) => {
    await supabase.from('planned_competitions').delete().eq('id', id);
    toast.success('Raderad');
    refresh();
  };

  if (loading) return <PageContainer title="Tävling"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  const upcoming = planned.filter(p => new Date(p.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = planned.filter(p => new Date(p.date) < new Date());

  return (
    <>
    <Helmet>
      <title>Tävlingsresultat Agility – Följ pinnar och klass | AgilityManager</title>
      <meta name="description" content="Logga dina agilitytävlingar, håll koll på pinnar per klass och följ din väg mot agilitychampionat. För klass 1, 2 och 3." />
      <link rel="canonical" href="https://agilitymanager.se/tavlingsresultat" />
    </Helmet>
    <PageContainer
      title="Tävling"
      action={dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : undefined}
    >
      <Tabs defaultValue="calendar" className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="flex-1 text-xs">Kalender</TabsTrigger>
          <TabsTrigger value="results" className="flex-1 text-xs">Resultat ({results.length})</TabsTrigger>
          <TabsTrigger value="checklist" className="flex-1 text-xs">Checklista</TabsTrigger>
        </TabsList>

        {/* Calendar tab */}
        <TabsContent value="calendar" className="mt-3">
          {/* Agida link */}
          <a
            href="https://www.agida.se"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 hover:bg-primary/10 transition-colors"
          >
            <Calendar size={18} className="text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Hitta tävlingar på Agida</div>
              <div className="text-xs text-muted-foreground">Se kommande agilitytävlingar i hela Sverige</div>
            </div>
            <ExternalLink size={14} className="text-muted-foreground" />
          </a>

          {/* Upcoming */}
          <h3 className="font-display font-semibold text-foreground text-sm mb-2">Kommande tävlingar</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">Inga kommande tävlingar.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {upcoming.map((p, i) => {
                const dog = getDog(p.dog_id);
                const daysLeft = differenceInDays(new Date(p.date), new Date());
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-3 shadow-card border-l-4 border-accent">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {dog && <DogAvatar dog={dog} size="sm" />}
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{p.event_name}</h4>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(p.date), 'd MMMM yyyy', { locale: sv })}
                            {p.location && ` · ${p.location}`}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-primary">{daysLeft} dagar kvar</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{p.status}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeletePlanned(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <>
              <h3 className="font-display font-semibold text-foreground text-sm mb-2 mt-4">Tidigare planerade</h3>
              <div className="space-y-2">
                {past.map(p => (
                  <div key={p.id} className="bg-card rounded-xl p-3 shadow-card opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">{p.event_name}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(p.date), 'd MMM yyyy', { locale: sv })}</div>
                      </div>
                      <button onClick={() => handleDeletePlanned(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Results tab */}
        <TabsContent value="results" className="mt-3">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Inga tävlingsresultat ännu.</p>
              {dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : <p className="text-sm">Lägg till en hund först!</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => {
                const dog = getDog(r.dog_id);
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      {dog && <DogAvatar dog={dog} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-semibold text-foreground text-sm">{r.event_name}</h3>
                          {r.passed ? <CheckCircle2 size={18} className="text-success flex-shrink-0" /> : <XCircle size={18} className="text-destructive flex-shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(r.date), 'd MMM yyyy', { locale: sv })} · {r.discipline} · {r.size_class} · {r.competition_level}
                        </div>
                        {r.organizer && <div className="text-xs text-muted-foreground">{r.organizer}</div>}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-foreground font-medium">{r.time_sec}s</span>
                          <span className={r.faults > 0 ? 'text-destructive' : 'text-success'}>{r.faults} fel</span>
                          {r.placement && <span className="flex items-center gap-0.5 text-accent font-medium"><Medal size={12} /> #{r.placement}</span>}
                        </div>
                        {r.notes && <p className="mt-1.5 text-xs text-muted-foreground">{r.notes}</p>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Checklist tab */}
        <TabsContent value="checklist" className="mt-3">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <h3 className="font-display font-semibold text-foreground mb-3">Checklista inför tävling</h3>
            <div className="space-y-2">
              {[...CHECKLIST_ITEMS, ...customItems].map(item => (
                <div key={item} className="flex items-center gap-2.5 w-full">
                  <button
                    onClick={() => toggleCheck(item)}
                    className="flex items-center gap-2.5 flex-1 text-left py-1"
                  >
                    {checkedItems.has(item)
                      ? <CheckSquare size={18} className="text-primary flex-shrink-0" />
                      : <Square size={18} className="text-muted-foreground flex-shrink-0" />}
                    <span className={`text-sm ${checkedItems.has(item) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item}
                    </span>
                  </button>
                  {customItems.includes(item) && (
                    <button
                      onClick={() => {
                        const updated = customItems.filter(ci => ci !== item);
                        setCustomItems(updated);
                        localStorage.setItem('custom-checklist', JSON.stringify(updated));
                        const next = new Set(checkedItems);
                        next.delete(item);
                        setCheckedItems(next);
                      }}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom item */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newItem.trim();
                if (!trimmed) return;
                if ([...CHECKLIST_ITEMS, ...customItems].includes(trimmed)) {
                  toast.error('Finns redan i listan');
                  return;
                }
                const updated = [...customItems, trimmed];
                setCustomItems(updated);
                localStorage.setItem('custom-checklist', JSON.stringify(updated));
                setNewItem('');
              }}
              className="flex items-center gap-2 mt-4 pt-3 border-t border-border"
            >
              <Plus size={18} className="text-muted-foreground flex-shrink-0" />
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Lägg till egen punkt..."
                className="h-8 text-sm"
              />
            </form>

            <div className="mt-3 pt-3 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">
                {checkedItems.size}/{CHECKLIST_ITEMS.length + customItems.length} klart
              </span>
              {checkedItems.size > 0 && (
                <button onClick={() => setCheckedItems(new Set())} className="text-xs text-primary ml-3">
                  Rensa alla
                </button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
    </>
  );
}
