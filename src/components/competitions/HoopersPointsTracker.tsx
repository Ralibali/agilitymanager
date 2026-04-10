import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, Star, ChevronDown, ChevronUp, Link2, Search, Loader2, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DogAvatar } from '@/components/DogAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Dog } from '@/types';

// SHoK promotion rules
const PROMOTION_REQUIREMENTS: Record<string, number> = {
  'Startklass': 200,
  'Klass 1': 300,
  'Klass 2': 300,
  'Klass 3': 0, // No promotion from K3
};

interface HoopersResult {
  placement: number | null;
  handler: string;
  dog_name: string;
  dog_reg_name: string;
  breed: string;
  points: number;
  faults: number;
  time_sec: number | null;
  start_nr: number | null;
  klass: string;
  lopp: number;
  size: string;
  disqualified: boolean;
}

interface CompetitionData {
  name: string;
  location: string;
  date: string;
  type: string;
  club: string;
  organizer: string;
  results: HoopersResult[];
}

interface SavedResult {
  competition_name: string;
  date: string;
  klass: string;
  lopp: number;
  points: number;
  faults: number;
  time_sec: number | null;
  placement: number | null;
  size: string;
  disqualified: boolean;
}

interface Props {
  dogs: Dog[];
}

export default function HoopersPointsTracker({ dogs }: Props) {
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedData, setImportedData] = useState<CompetitionData | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const hoopersDogs = useMemo(() => dogs.filter(d => d.sport === 'Hoopers'), [dogs]);

  useEffect(() => {
    if (hoopersDogs.length > 0 && !selectedDogId) {
      setSelectedDogId(hoopersDogs[0].id);
    }
  }, [hoopersDogs, selectedDogId]);

  const selectedDog = useMemo(() => hoopersDogs.find(d => d.id === selectedDogId), [hoopersDogs, selectedDogId]);

  // Load saved results
  useEffect(() => {
    if (!selectedDogId) return;
    loadResults();
  }, [selectedDogId]);

  async function loadResults() {
    if (!selectedDogId) return;
    setLoading(true);
    const { data } = await supabase
      .from('competition_results')
      .select('*')
      .eq('dog_id', selectedDogId)
      .eq('sport', 'Hoopers')
      .order('date', { ascending: true });

    if (data) {
      setSavedResults(data.map(r => ({
        competition_name: r.event_name,
        date: r.date,
        klass: r.competition_level,
        lopp: r.lopp_number || 1,
        points: r.hoopers_points || 0,
        faults: r.faults,
        time_sec: Number(r.time_sec) || null,
        placement: r.placement,
        size: r.size_class,
        disqualified: r.disqualified,
      })));
    }
    setLoading(false);
  }

  // Calculate points per class
  const pointsByClass = useMemo(() => {
    const map: Record<string, { total: number; runs: number; cleanRuns: number; results: SavedResult[] }> = {};
    for (const r of savedResults) {
      const cls = r.klass;
      if (!map[cls]) map[cls] = { total: 0, runs: 0, cleanRuns: 0, results: [] };
      map[cls].total += r.points;
      map[cls].runs++;
      if (r.faults === 0 && !r.disqualified) map[cls].cleanRuns++;
      map[cls].results.push(r);
    }
    return map;
  }, [savedResults]);

  // Current class from dog profile
  const currentClass = selectedDog?.hoopers_level || 'Startklass';
  const currentPoints = pointsByClass[currentClass]?.total || 0;
  const promotionReq = PROMOTION_REQUIREMENTS[currentClass] || 0;
  const promotionProgress = promotionReq > 0 ? Math.min(100, (currentPoints / promotionReq) * 100) : 100;
  const canPromote = promotionReq > 0 && currentPoints >= promotionReq;

  // Import from URL
  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hoopers-results', {
        body: {
          url: importUrl.trim(),
          search_handler: null,
          search_dog: selectedDog?.name,
        },
      });

      if (error) throw error;
      if (data?.competition) {
        setImportedData(data.competition);
        const matchCount = data.competition.results?.length || 0;
        if (matchCount > 0) {
          toast.success(`Hittade ${matchCount} resultat!`);
        } else {
          toast.info('Inga resultat hittades för din hund i denna tävling. Du kan spara alla resultat manuellt.');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte hämta resultat från URL');
    }
    setImporting(false);
  }

  // Save imported results for selected dog
  async function saveImportedResults(results: HoopersResult[]) {
    if (!selectedDogId || !importedData) return;
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }

    const inserts = results.map(r => ({
      user_id: userData.user!.id,
      dog_id: selectedDogId,
      sport: 'Hoopers' as const,
      event_name: importedData.name || 'Hoopers-tävling',
      date: importedData.date || new Date().toISOString().slice(0, 10),
      organizer: importedData.organizer || '',
      competition_level: mapKlass(r.klass),
      size_class: mapSize(r.size),
      discipline: 'Agility' as const,
      faults: r.faults,
      time_sec: r.time_sec || 0,
      passed: r.faults === 0 && !r.disqualified,
      disqualified: r.disqualified,
      placement: r.placement,
      hoopers_points: r.points,
      lopp_number: r.lopp,
      notes: `Lopp ${r.lopp}, ${r.size}`,
    }));

    const { error } = await supabase.from('competition_results').insert(inserts);
    if (error) {
      console.error(error);
      toast.error('Kunde inte spara resultat');
    } else {
      toast.success(`${inserts.length} resultat sparade!`);
      setImportedData(null);
      setImportUrl('');
      loadResults();
    }
    setLoading(false);
  }

  if (hoopersDogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <p>Lägg till en hund med sporten Hoopers för att börja spåra poäng.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dog selector */}
      {hoopersDogs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {hoopersDogs.map(dog => (
            <button
              key={dog.id}
              onClick={() => setSelectedDogId(dog.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedDogId === dog.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <DogAvatar dog={dog} size="sm" />
              {dog.name}
            </button>
          ))}
        </div>
      )}

      {selectedDog && (
        <>
          {/* Promotion progress card */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl shadow-card border border-border p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <DogAvatar dog={selectedDog} size="sm" />
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground text-sm">{selectedDog.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{currentClass}</Badge>
                  <Badge variant="outline" className="text-[10px]">{selectedDog.hoopers_size}</Badge>
                </div>
              </div>
              {canPromote && (
                <div className="flex items-center gap-1 text-success">
                  <ArrowUpCircle size={16} />
                  <span className="text-xs font-semibold">Redo för uppflyttning!</span>
                </div>
              )}
            </div>

            {promotionReq > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Uppflyttningspoäng</span>
                  <span className="font-semibold text-foreground">{currentPoints} / {promotionReq} p</span>
                </div>
                <Progress value={promotionProgress} className="h-2.5" />
                <p className="text-[10px] text-muted-foreground">
                  {canPromote
                    ? `Du kan flytta upp till nästa klass nästa tävlingsdag!`
                    : `${promotionReq - currentPoints} poäng kvar till uppflyttning`
                  }
                </p>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <StatCard icon={<Target size={14} />} label="Totalt" value={`${savedResults.reduce((s, r) => s + r.points, 0)} p`} color="text-primary" />
              <StatCard icon={<Trophy size={14} />} label="Lopp" value={savedResults.length} color="text-accent" />
              <StatCard icon={<Star size={14} />} label="Felfria" value={savedResults.filter(r => r.faults === 0 && !r.disqualified).length} color="text-success" />
              <StatCard icon={<TrendingUp size={14} />} label="Max/lopp" value={`${Math.max(0, ...savedResults.map(r => r.points))} p`} color="text-warning" />
            </div>
          </motion.div>

          {/* Points by class breakdown */}
          {Object.entries(pointsByClass).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Poäng per klass</h4>
              {Object.entries(pointsByClass).map(([cls, data]) => {
                const req = PROMOTION_REQUIREMENTS[cls] || 0;
                const progress = req > 0 ? Math.min(100, (data.total / req) * 100) : 100;
                const isExpanded = expandedClass === cls;

                return (
                  <motion.div
                    key={cls}
                    className="bg-card rounded-lg border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedClass(isExpanded ? null : cls)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{cls}</span>
                          <span className="text-xs text-muted-foreground">{data.runs} lopp</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-primary">{data.total} p</span>
                          {req > 0 && <span className="text-[10px] text-muted-foreground">/ {req}</span>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-secondary/60">
                                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Datum</th>
                                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Tävling</th>
                                <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Lopp</th>
                                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Poäng</th>
                                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Fel</th>
                                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Tid</th>
                                <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Plac.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.results.map((r, j) => (
                                <tr key={j} className={`border-t border-border/50 ${j % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                                  <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{r.date}</td>
                                  <td className="px-2 py-1.5 text-foreground max-w-[100px] truncate">{r.competition_name}</td>
                                  <td className="px-2 py-1.5 text-center text-muted-foreground">{r.lopp}</td>
                                  <td className={`px-2 py-1.5 text-right font-medium ${r.points > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                                    {r.points} p
                                  </td>
                                  <td className={`px-2 py-1.5 text-right ${r.faults > 0 ? 'text-destructive' : 'text-success'}`}>
                                    {r.faults}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-foreground">
                                    {r.time_sec ? `${r.time_sec}s` : '-'}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {r.disqualified ? '❌' : r.placement ? (
                                      <span className={r.placement <= 3 ? 'font-bold text-accent' : 'text-muted-foreground'}>
                                        {r.placement <= 3 ? '🏆' : ''}{r.placement}
                                      </span>
                                    ) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Import from URL */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Link2 size={12} />
              Importera resultat från SHoK
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Klistra in URL till en tävling från shoktavling.se för att hämta resultat.
            </p>
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://shoktavling.se/?page=showres&arr=..."
                className="text-xs h-8"
              />
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || !importUrl.trim()}
                className="h-8 px-3"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </Button>
            </div>

            {/* Imported results preview */}
            {importedData && importedData.results.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {importedData.name} — {importedData.date}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {importedData.results.length} resultat
                  </Badge>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="bg-secondary/60">
                        <th className="text-left px-2 py-1 font-medium text-muted-foreground">Klass</th>
                        <th className="text-center px-2 py-1 font-medium text-muted-foreground">Lopp</th>
                        <th className="text-left px-2 py-1 font-medium text-muted-foreground">Hund</th>
                        <th className="text-right px-2 py-1 font-medium text-muted-foreground">Poäng</th>
                        <th className="text-right px-2 py-1 font-medium text-muted-foreground">Fel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedData.results.map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-2 py-1 text-foreground">{r.klass}</td>
                          <td className="px-2 py-1 text-center text-muted-foreground">{r.lopp}</td>
                          <td className="px-2 py-1 text-foreground truncate max-w-[120px]">{r.dog_reg_name || r.dog_name}</td>
                          <td className="px-2 py-1 text-right font-medium text-success">{r.points} p</td>
                          <td className="px-2 py-1 text-right">{r.faults}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveImportedResults(importedData.results)} disabled={loading} className="flex-1 h-8">
                    {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                    Spara {importedData.results.length} resultat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setImportedData(null); setImportUrl(''); }} className="h-8">
                    Avbryt
                  </Button>
                </div>
              </div>
            )}

            {importedData && importedData.results.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Inga resultat matchade din hund. Prova att importera alla resultat via URL.
              </p>
            )}
          </div>

          {/* Scoring rules info */}
          <details className="bg-secondary/30 rounded-lg border border-border">
            <summary className="p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              ℹ️ SHoK Poängregler
            </summary>
            <div className="px-3 pb-3 text-[11px] text-muted-foreground space-y-2">
              <div>
                <strong className="text-foreground">Grundpoäng (felfritt lopp):</strong>
                <br />Under 45 sek: 10 p | 45–90 sek: 5 p
              </div>
              <div>
                <strong className="text-foreground">Bonuspoäng (felfritt lopp):</strong>
                <br />DO: +15 p | BO: +25 p | UL1: +25 p | UL2: +15 p | UL3: +10 p
              </div>
              <div>
                <strong className="text-foreground">Uppflyttning:</strong>
                <br />Startklass → K1: 200 p | K1 → K2: 300 p | K2 → K3: 300 p
              </div>
              <div>
                <strong className="text-foreground">Max per lopp:</strong> 35 p (10 + 25 BO/UL1)
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-2 text-center">
      <div className={`flex justify-center mb-0.5 ${color}`}>{icon}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

function mapKlass(klass: string): 'Nollklass' | 'K1' | 'K2' | 'K3' {
  if (klass.includes('1')) return 'K1';
  if (klass.includes('2')) return 'K2';
  if (klass.includes('3')) return 'K3';
  return 'Nollklass'; // Startklass maps to Nollklass in our enum
}

function mapSize(size: string): 'XS' | 'S' | 'M' | 'L' {
  return size.toLowerCase() === 'small' ? 'S' : 'L';
}
