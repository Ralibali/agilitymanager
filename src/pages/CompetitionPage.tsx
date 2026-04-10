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
import { CheckCircle2, XCircle, Medal, ExternalLink, Calendar, CheckSquare, Square, Trash2, Plus, X, Download, FileText, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { downloadPdf } from '@/lib/pdf';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import CompetitionResultsViewer from '@/components/competitions/CompetitionResultsViewer';
import { AgilityDataAttribution } from '@/components/competitions/AgilityDataAttribution';
import HistoricalResultsStats from '@/components/competitions/HistoricalResultsStats';
import { useAuth } from '@/contexts/AuthContext';

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
  const [friendNames, setFriendNames] = useState<string[]>([]);
  const [externalResultUrl, setExternalResultUrl] = useState('');
  const [activeExternalUrl, setActiveExternalUrl] = useState<string | null>(null);
  const [competitionUrlMap, setCompetitionUrlMap] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [handlerName, setHandlerName] = useState<{ first: string; last: string } | null>(null);
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [historicalFetched, setHistoricalFetched] = useState(false);
  const [customItems, setCustomItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom-checklist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');
  const [shareResult, setShareResult] = useState<CompetitionResult | null>(null);
  const { user } = useAuth();
  
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

  // Fetch friend display names for highlighting
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      if (!friendships?.length) return;
      
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.receiver_id : f.requester_id
      );
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('display_name')
        .in('user_id', friendIds);
      
      if (profiles) {
        setFriendNames(profiles.map(p => p.display_name).filter(Boolean) as string[]);
      }
    })();
  }, [user]);

  // Fetch handler name from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('handler_first_name, handler_last_name')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const first = (data as any).handler_first_name || '';
          const last = (data as any).handler_last_name || '';
          if (first || last) {
            setHandlerName({ first, last });
          }
        }
      });
  }, [user]);

  // Auto-search historical results - parallel calls, show results as they arrive
  useEffect(() => {
    if (!handlerName || dogs.length === 0 || historicalFetched) return;
    setHistoricalFetched(true);
    setHistoricalLoading(true);
    setHistoricalError(null);

    let completed = 0;
    const total = dogs.length;

    // Launch all searches in parallel
    const promises = dogs.map(async (dog) => {
      try {
        const { data, error } = await supabase.functions.invoke('search-handler-results', {
          body: { firstName: handlerName.first, lastName: handlerName.last, dogName: dog.name },
        });
        completed++;
        if (completed >= total) setHistoricalLoading(false);
        if (error) {
          console.error('Search error for', dog.name, error);
          return null;
        }
        if (data?.success && data.data) {
          const result = { ...data.data, searched_dog: dog.name, dog_id: dog.id };
          // Add result immediately as it arrives
          setHistoricalResults(prev => [...prev, result]);
          return result;
        }
        return null;
      } catch (e) {
        completed++;
        if (completed >= total) setHistoricalLoading(false);
        console.error('Search error for', dog.name, e);
        return null;
      }
    });

    Promise.allSettled(promises).then(() => {
      setHistoricalLoading(false);
    });
  }, [handlerName, dogs, historicalFetched]);

  // Match logged results against competitions table to find agilitydata URLs
  useEffect(() => {
    if (results.length === 0) return;
    (async () => {
      const eventNames = [...new Set(results.map(r => r.event_name))];
      const { data: comps } = await supabase
        .from('competitions')
        .select('id, competition_name, part_key, date_start')
        .or(eventNames.map(n => `competition_name.ilike.%${n.replace(/[%_]/g, '')}%`).join(','));
      
      if (!comps?.length) return;
      
      const urlMap: Record<string, string> = {};
      for (const r of results) {
        // Find best match by name similarity and date
        const match = comps.find(c => {
          const cName = (c.competition_name || '').toLowerCase().replace(/<[^>]*>/g, '').trim();
          const rName = r.event_name.toLowerCase().trim();
          return cName.includes(rName) || rName.includes(cName.split(' ')[0]);
        });
        if (match?.part_key) {
          urlMap[r.id] = `https://agilitydata.se/taevlingar/lopplista/?id=${match.part_key}`;
        }
      }
      setCompetitionUrlMap(urlMap);
    })();
  }, [results]);

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
      action={
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const rows = results.map(r => {
                  const dog = getDog(r.dog_id);
                  return {
                    Datum: r.date,
                    Hund: dog?.name ?? '',
                    Tävling: r.event_name,
                    Arrangör: r.organizer,
                    Gren: r.discipline,
                    Klass: r.competition_level,
                    Storlek: r.size_class,
                    'Tid (s)': r.time_sec,
                    Fel: r.faults,
                    'Banlängd (m)': r.course_length_m ?? '',
                    Placering: r.placement ?? '',
                    Godkänd: r.passed ? 'Ja' : 'Nej',
                    Diskad: r.disqualified ? 'Ja' : 'Nej',
                    Noteringar: r.notes,
                  };
                });
                downloadCsv(rows, `tavlingsresultat-${format(new Date(), 'yyyy-MM-dd')}.csv`);
              }}
            >
              <Download size={14} /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const headers = ['Datum', 'Hund', 'Tävling', 'Gren', 'Klass', 'Tid', 'Fel', 'Plac.', 'Godkänd', 'Noteringar'];
                const pdfRows = results.map(r => {
                  const dog = getDog(r.dog_id);
                  return [
                    r.date, dog?.name ?? '', r.event_name,
                    r.discipline, r.competition_level,
                    String(r.time_sec), String(r.faults),
                    r.placement != null ? String(r.placement) : '-',
                    r.passed ? 'Ja' : 'Nej',
                    r.notes,
                  ];
                });
                downloadPdf({
                  title: 'Tävlingsresultat',
                  subtitle: `${results.length} starter – exporterad ${format(new Date(), 'yyyy-MM-dd')}`,
                  headers,
                  rows: pdfRows,
                  filename: `tavlingsresultat-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
                  landscape: true,
                });
              }}
            >
              <FileText size={14} /> PDF
            </Button>
            </>
          )}
          {dogs.length > 0 ? <AddCompetitionDialog dogs={dogs} onAdded={refresh} /> : null}
        </div>
      }
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
                const matchedUrl = competitionUrlMap[r.id];
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      {dog && <DogAvatar dog={dog} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-semibold text-foreground text-sm">{r.event_name}</h3>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setShareResult(r)} className="p-1 rounded-full hover:bg-secondary" title="Dela resultat">
                              <Send size={14} className="text-muted-foreground" />
                            </button>
                            {r.passed ? <CheckCircle2 size={18} className="text-success flex-shrink-0" /> : <XCircle size={18} className="text-destructive flex-shrink-0" />}
                          </div>
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
                        
                        {/* Auto-matched results from agilitydata.se */}
                        {matchedUrl && (
                          <div className="mt-3 pt-2 border-t border-border">
                            <CompetitionResultsViewer
                              url={matchedUrl}
                              friendNames={friendNames}
                              autoFetch
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Historical results from agilitydata.se */}
          {handlerName && (
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="font-display font-semibold text-foreground text-sm mb-2">
                🔍 Historiska resultat — {handlerName.first} {handlerName.last}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Automatiskt sökta från agilitydata.se baserat på ditt förarnamn och dina hundar.
              </p>
              
              {historicalLoading && (
                <div className="text-center py-4">
                  <Loader2 size={18} className="mx-auto mb-1 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Söker resultat på agilitydata.se ({historicalResults.length}/{dogs.length} hundar klara)...
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Det kan ta upp till 30 sekunder</p>
                </div>
              )}

              {historicalError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">{historicalError}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => { setHistoricalFetched(false); setHistoricalResults([]); }}>
                    Försök igen
                  </Button>
                </div>
              )}

              {!historicalLoading && !historicalError && historicalResults.length === 0 && historicalFetched && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Inga historiska resultat hittades. Kontrollera att ditt förarnamn stämmer i Inställningar.
                </p>
              )}

              {historicalResults.length > 0 && (
                <HistoricalResultsStats
                  historicalResults={historicalResults}
                  getDog={getDog}
                />
              )}

              <div className="mt-2">
                <AgilityDataAttribution sourceUrl="https://agilitydata.se/resultat/soek-hund/" />
              </div>
            </div>
          )}

          {!handlerName && (
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-2">
                💡 Ange ditt förarnamn i Inställningar för att automatiskt hitta dina resultat från agilitydata.se
              </p>
            </div>
          )}

          {/* External results from agilitydata.se */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="font-display font-semibold text-foreground text-sm mb-3">
              Hämta resultatlista från agilitydata.se
            </h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                const trimmed = externalResultUrl.trim();
                if (!trimmed) return;
                if (!trimmed.includes('agilitydata.se')) {
                  toast.error('Ange en länk från agilitydata.se');
                  return;
                }
                setActiveExternalUrl(trimmed);
              }}
              className="flex gap-2 mb-3"
            >
              <Input
                value={externalResultUrl}
                onChange={e => setExternalResultUrl(e.target.value)}
                placeholder="Klistra in länk från agilitydata.se..."
                className="h-8 text-xs flex-1"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                Hämta
              </Button>
            </form>

            {activeExternalUrl && (
              <CompetitionResultsViewer
                url={activeExternalUrl}
                friendNames={friendNames}
              />
            )}

            <AgilityDataAttribution sourceUrl={activeExternalUrl || 'https://agilitydata.se'} />
          </div>
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

    {shareResult && (
      <ShareToFriendDialog
        open={!!shareResult}
        onOpenChange={(open) => !open && setShareResult(null)}
        sharedType="result"
        sharedId={shareResult.id}
        sharedData={{
          event_name: shareResult.event_name,
          date: shareResult.date,
          discipline: shareResult.discipline,
          level: shareResult.competition_level,
          time: `${shareResult.time_sec}s`,
          faults: shareResult.faults,
          passed: shareResult.passed,
          placement: shareResult.placement,
        }}
      />
    )}
    </>
  );
}
