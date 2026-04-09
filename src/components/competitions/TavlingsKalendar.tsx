import { useState, useEffect, useCallback, useMemo } from 'react';
import { stripHtml } from '@/lib/utils';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, MapPin, ExternalLink, Star, CheckCircle2, Home, TreePine, Send } from 'lucide-react';
import { SWEDISH_COUNTIES, type Competition, type CompetitionInterest } from '@/types/competitions';
import { getCountyForLocation } from '@/lib/swedishCityCounty';
import { useToast } from '@/hooks/use-toast';
import type { Dog } from '@/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CLASS_FILTERS = [
  { key: 'agility', label: 'Agility' },
  { key: 'hopp', label: 'Hopp' },
  { key: '0-klass', label: '0-klass' },
  { key: 'K1', label: 'Klass 1' },
  { key: 'K2', label: 'Klass 2' },
  { key: 'K3', label: 'Klass 3' },
  { key: 'Lag', label: 'Lag' },
  { key: 'InOff', label: 'InOff' },
  { key: 'open', label: 'Öppna för anmälan' },
];

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const s = formatDateShort(start);
  if (!end || start === end) return s;
  const e = formatDateShort(end);
  return `${s} – ${e}`;
}

function statusColor(status: string | null): string {
  if (!status) return 'bg-muted text-muted-foreground';
  const s = status.toUpperCase();
  if (s.includes('ÖPPEN')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (s.includes('STÄNGD')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (s.includes('GODKÄND')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (s.includes('ANSÖKT')) return 'bg-muted text-muted-foreground';
  return 'bg-muted text-muted-foreground';
}

function dogFiltersFor(dog: Dog): Set<string> {
  const f = new Set<string>();
  const level = dog.competition_level;
  const jumpLevel = dog.jumping_level;

  if (level !== 'Nollklass') {
    f.add('agility');
    if (level === 'K1') f.add('K1');
    if (level === 'K2') f.add('K2');
    if (level === 'K3') f.add('K3');
  }
  if (jumpLevel !== 'Nollklass') {
    f.add('hopp');
    if (jumpLevel === 'K1') f.add('K1');
    if (jumpLevel === 'K2') f.add('K2');
    if (jumpLevel === 'K3') f.add('K3');
  }
  if (level === 'Nollklass' && jumpLevel === 'Nollklass') {
    f.add('0-klass');
  }
  return f;
}

function describeDogFilters(dog: Dog): string {
  const parts: string[] = [];
  const disciplines: string[] = [];
  const levels = new Set<string>();

  if (dog.competition_level !== 'Nollklass') {
    disciplines.push('Agility');
    levels.add(dog.competition_level);
  }
  if (dog.jumping_level !== 'Nollklass') {
    disciplines.push('Hopp');
    levels.add(dog.jumping_level);
  }
  if (disciplines.length === 0) {
    return `Visar tävlingar för ${dog.name} — 0-klass`;
  }

  if (levels.size > 0) parts.push(Array.from(levels).join(' & '));
  parts.push(disciplines.join(' & '));
  return `Visar tävlingar för ${dog.name} — ${parts.join(', ')}`;
}

interface TavlingsKalendarProps {
  dogs: Dog[];
  selectedDogId: string | null;
}

export function TavlingsKalendar({ dogs, selectedDogId }: TavlingsKalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [interests, setInterests] = useState<Map<string, CompetitionInterest>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [manualFilters, setManualFilters] = useState<Set<string>>(new Set());
  const [selectedCounties, setSelectedCounties] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; compId: string }>({ open: false, compId: '' });
  const [shareComp, setShareComp] = useState<{ open: boolean; comp: Competition | null }>({ open: false, comp: null });

  const selectedDog = useMemo(() => (dogs || []).find(d => d.id === selectedDogId) || null, [dogs, selectedDogId]);

  // Compute active filters: dog-based + manual overrides
  const activeFilters = useMemo(() => {
    if (!selectedDog) return manualFilters;
    const dogF = dogFiltersFor(selectedDog);
    // Merge manual on top of dog filters
    const merged = new Set(dogF);
    manualFilters.forEach(f => {
      if (merged.has(f)) {
        // manual toggle removes a dog filter
        merged.delete(f);
      } else {
        merged.add(f);
      }
    });
    return merged;
  }, [selectedDog, manualFilters]);

  // Reset manual filters when dog changes
  useEffect(() => {
    setManualFilters(new Set());
  }, [selectedDogId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .gte('date_start', today)
      .order('date_start', { ascending: true })
      .limit(500);

    if (data && data.length > 0) {
      setCompetitions(data as unknown as Competition[]);
      setLastFetched(data[0]?.fetched_at || null);
    }

    if (user) {
      const { data: intData } = await supabase
        .from('competition_interests')
        .select('*')
        .eq('user_id', user.id);
      const map = new Map<string, CompetitionInterest>();
      (intData || []).forEach((i: any) => map.set(i.competition_id, i as CompetitionInterest));
      setInterests(map);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-competitions');
      if (error) throw error;
      toast({ title: 'Uppdaterat', description: `${data?.upserted || 0} tävlingar uppdaterade` });
      await fetchData();
    } catch {
      toast({ title: 'Fel', description: 'Kunde inte uppdatera tävlingsdata', variant: 'destructive' });
    }
    setRefreshing(false);
  };

  const toggleInterest = async (compId: string, type: 'interested' | 'registered') => {
    if (!user) return;
    const current = interests.get(compId);
    const dogName = selectedDog?.name || null;

    if (type === 'interested' && current?.status === 'registered') {
      setConfirmDialog({ open: true, compId });
      return;
    }

    if (current?.status === type) {
      await supabase.from('competition_interests').delete().eq('id', current.id);
      const newMap = new Map(interests);
      newMap.delete(compId);
      setInterests(newMap);
    } else if (current) {
      await supabase.from('competition_interests').update({ status: type, dog_name: dogName }).eq('id', current.id);
      const newMap = new Map(interests);
      newMap.set(compId, { ...current, status: type, dog_name: dogName });
      setInterests(newMap);
    } else {
      const { data } = await supabase.from('competition_interests')
        .insert({ user_id: user.id, competition_id: compId, status: type, dog_name: dogName })
        .select().single();
      if (data) {
        const newMap = new Map(interests);
        newMap.set(compId, data as unknown as CompetitionInterest);
        setInterests(newMap);
      }
    }
  };

  const handleConfirmDowngrade = async () => {
    const compId = confirmDialog.compId;
    const current = interests.get(compId);
    if (current) {
      await supabase.from('competition_interests').update({ status: 'interested' }).eq('id', current.id);
      const newMap = new Map(interests);
      newMap.set(compId, { ...current, status: 'interested' });
      setInterests(newMap);
    }
    setConfirmDialog({ open: false, compId: '' });
  };

  const toggleFilter = (key: string) => {
    const next = new Set(manualFilters);
    next.has(key) ? next.delete(key) : next.add(key);
    setManualFilters(next);
  };

  const clearFilters = () => {
    setManualFilters(new Set());
    setSelectedCounties(new Set());
  };

  // Check if a filter is visually "checked" — from dog or manual
  const isFilterActive = (key: string) => activeFilters.has(key);

  const filtered = competitions.filter(c => {
    if (activeFilters.size === 0 && selectedCounties.size === 0) return true;

    let match = true;

    if (activeFilters.has('agility') && (c.classes_agility?.length || 0) === 0) match = false;
    if (activeFilters.has('hopp') && (c.classes_hopp?.length || 0) === 0) match = false;
    if (activeFilters.has('0-klass') && !c.classes_other?.includes('0-klass')) match = false;
    if (activeFilters.has('K1') && !c.classes_agility?.includes('Ag1') && !c.classes_hopp?.includes('Ho1')) match = false;
    if (activeFilters.has('K2') && !c.classes_agility?.includes('Ag2') && !c.classes_hopp?.includes('Ho2')) match = false;
    if (activeFilters.has('K3') && !c.classes_agility?.includes('Ag3') && !c.classes_hopp?.includes('Ho3')) match = false;
    if (activeFilters.has('Lag') && !c.classes_other?.includes('Lag')) match = false;
    if (activeFilters.has('InOff') && !c.classes_other?.includes('InOff')) match = false;
    if (activeFilters.has('open') && !c.status?.toUpperCase().includes('ÖPPEN')) match = false;

    if (selectedCounties.size > 0 && c.location) {
      const loc = c.location.toLowerCase();
      // First try direct text match, then smart city-to-county lookup
      const directMatch = Array.from(selectedCounties).some(county =>
        loc.includes(county.toLowerCase())
      );
      const countyFromCity = getCountyForLocation(c.location);
      const smartMatch = countyFromCity ? selectedCounties.has(countyFromCity) : false;
      if (!directMatch && !smartMatch) match = false;
    }

    return match;
  });

  return (
    <div className="space-y-4">
      {/* Dog filter description */}
      {selectedDog && (
        <div className="bg-primary/5 rounded-lg px-3 py-2 text-xs text-primary font-medium">
          {describeDogFilters(selectedDog)}
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl p-3 border border-border space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {CLASS_FILTERS.map(f => (
            <label key={f.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox
                checked={isFilterActive(f.key)}
                onCheckedChange={() => toggleFilter(f.key)}
                className="h-3.5 w-3.5"
              />
              {f.label}
            </label>
          ))}
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Välj län</summary>
          <div className="grid grid-cols-2 gap-1 mt-2 max-h-40 overflow-y-auto">
            {SWEDISH_COUNTIES.map(c => (
              <label key={c} className="flex items-center gap-1 cursor-pointer">
                <Checkbox
                  checked={selectedCounties.has(c)}
                  onCheckedChange={() => {
                    const next = new Set(selectedCounties);
                    next.has(c) ? next.delete(c) : next.add(c);
                    setSelectedCounties(next);
                  }}
                  className="h-3 w-3"
                />
                {c}
              </label>
            ))}
          </div>
        </details>

        {(activeFilters.size > 0 || selectedCounties.size > 0) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
            {selectedDog ? 'Anpassa filter' : 'Rensa filter'}
          </Button>
        )}
      </div>

      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {lastFetched && `Uppdaterad: ${new Date(lastFetched).toLocaleDateString('sv-SE')}`}
        </span>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1 text-xs h-7">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Uppdatera
        </Button>
      </div>

      {/* Competition cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Inga tävlingar hittades</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(comp => {
            const interest = interests.get(comp.id);
            return (
              <div key={comp.id} className="bg-card rounded-xl border border-border p-4 relative">
                {/* Interest buttons */}
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => toggleInterest(comp.id, 'interested')}
                    className="p-1 rounded-full hover:bg-secondary transition-colors"
                    title="Intresserad"
                  >
                    <Star
                      size={18}
                      className={interest?.status === 'interested' || interest?.status === 'registered'
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'}
                    />
                  </button>
                  <button
                    onClick={() => toggleInterest(comp.id, 'registered')}
                    className="p-1 rounded-full hover:bg-secondary transition-colors"
                    title="Anmäld"
                  >
                    <CheckCircle2
                      size={18}
                      className={interest?.status === 'registered'
                        ? 'fill-green-500 text-green-500'
                        : 'text-muted-foreground'}
                    />
                  </button>
                </div>

                <div className="text-lg font-bold font-display text-primary mb-1">
                  {formatDateRange(comp.date_start, comp.date_end)}
                </div>

                <div className="font-semibold text-sm">{stripHtml(comp.club_name)}</div>
                <div className="text-xs text-muted-foreground">{stripHtml(comp.competition_name)}</div>

                <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                  <MapPin size={12} />
                  {comp.location}
                  {comp.indoor_outdoor && (
                    <span className="ml-1">
                      {comp.indoor_outdoor.toLowerCase().includes('inomhus')
                        ? <Home size={12} className="inline" />
                        : <TreePine size={12} className="inline" />}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {comp.classes_agility?.map(c => (
                    <Badge key={c} className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0">{c}</Badge>
                  ))}
                  {comp.classes_hopp?.map(c => (
                    <Badge key={c} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0">{c}</Badge>
                  ))}
                  {comp.classes_other?.map(c => (
                    <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>
                  ))}
                </div>

                {comp.judges?.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Domare: {comp.judges.join(', ')}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {comp.last_registration_date && (
                      <span className="text-[10px] text-muted-foreground">
                        Sista anm: {formatDateShort(comp.last_registration_date)}
                      </span>
                    )}
                    {comp.status && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusColor(comp.status)}`}>
                        {comp.status}
                      </Badge>
                    )}
                  </div>
                  <a
                    href={comp.source_url || 'https://agilitydata.se/taevlingar/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                  >
                    agilitydata.se <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground pt-4 pb-2">
        Tävlingsdata hämtas från agilitydata.se med tillhörighet Svenska Agilityklubben (SAgiK). Uppdateras dagligen.
      </p>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, compId: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort anmälan?</AlertDialogTitle>
            <AlertDialogDescription>
              Du är markerad som anmäld till denna tävling. Vill du ändra tillbaka till intresserad?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDowngrade}>Ja, ändra</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
