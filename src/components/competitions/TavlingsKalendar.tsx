import { useState, useEffect, useCallback, useMemo } from 'react';
import { stripHtml } from '@/lib/utils';
import ShareToFriendDialog from '@/components/ShareToFriendDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, MapPin, ExternalLink, Star, CheckCircle2, Home, TreePine, Send, Trophy, Flag } from 'lucide-react';
import CompetitionResultsViewer from '@/components/competitions/CompetitionResultsViewer';
import { SWEDISH_COUNTIES, type Competition } from '@/types/competitions';
import { getCountyForLocation } from '@/lib/swedishCityCounty';
import { useToast } from '@/hooks/use-toast';
import { useCompetitionInterests, type InterestStatus } from '@/hooks/useCompetitionInterests';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [manualFilters, setManualFilters] = useState<Set<string>>(new Set());
  const [selectedCounties, setSelectedCounties] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; compId: string }>({ open: false, compId: '' });
  const [shareComp, setShareComp] = useState<{ open: boolean; comp: Competition | null }>({ open: false, comp: null });
  const [expandedResults, setExpandedResults] = useState<string | null>(null);
  const [friendNames, setFriendNames] = useState<string[]>([]);

  // Delad intresse-hook — hanterar både inloggad (DB) och gäst (cookie/localStorage)
  const { interests, setInterest } = useCompetitionInterests();

  // Fetch friend names for result highlighting
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      if (!friendships?.length) return;
      const friendIds = friendships.map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('display_name')
        .in('user_id', friendIds);
      setFriendNames((profiles || []).map(p => p.display_name).filter(Boolean) as string[]);
    })();
  }, [user]);

  const selectedDog = useMemo(() => (dogs || []).find(d => d.id === selectedDogId) || null, [dogs, selectedDogId]);

  // Compute active filters: dog-based + manual overrides
  const activeFilters = useMemo(() => {
    if (!selectedDog) return manualFilters;
    const dogF = dogFiltersFor(selectedDog);
    const merged = new Set(dogF);
    manualFilters.forEach(f => {
      if (merged.has(f)) merged.delete(f);
      else merged.add(f);
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

    setLoading(false);
  }, []);

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

  const toggleInterest = async (compId: string, type: InterestStatus, comp?: Competition) => {
    const current = interests[compId];
    const dogName = selectedDog?.name || null;
    const dogClass = selectedDog?.competition_level || null;

    // Skydd: kräv bekräftelse om man försöker degradera från "anmäld" till "intresserad"
    if (type === 'interested' && current === 'registered') {
      setConfirmDialog({ open: true, compId });
      return;
    }

    await setInterest(compId, type, {
      dogName,
      dogClass,
      sport: 'Agility',
      region: comp?.location ? getCountyForLocation(comp.location) : null,
    });
  };

  const handleConfirmDowngrade = async () => {
    const compId = confirmDialog.compId;
    await setInterest(compId, 'interested', {
      dogName: selectedDog?.name || null,
      dogClass: selectedDog?.competition_level || null,
      sport: 'Agility',
    });
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
            const status = interests[comp.id];
            const isPast = !!comp.date_end && new Date(comp.date_end + 'T23:59:59') < new Date();
            return (
              <div key={comp.id} className="bg-card rounded-xl border border-border p-4 relative">
                {/* Statuskedja: Intresse → Anmäld → (Genomförd när tävlingen passerat) */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <button
                    onClick={() => toggleInterest(comp.id, 'interested', comp)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                      status === 'interested'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <Star size={13} className={status === 'interested' ? 'fill-amber-500 text-amber-500' : ''} />
                    {status === 'interested' ? 'Intresserad' : 'Intresse'}
                  </button>
                  <button
                    onClick={() => toggleInterest(comp.id, 'registered', comp)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                      status === 'registered'
                        ? 'text-white'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                    style={status === 'registered' ? { background: '#1a6b3c' } : {}}
                  >
                    <CheckCircle2 size={13} className={status === 'registered' ? 'fill-white text-white' : ''} />
                    {status === 'registered' ? 'Anmäld ✓' : 'Anmäld'}
                  </button>
                  {(isPast || status === 'done') && (
                    <button
                      onClick={() => toggleInterest(comp.id, 'done', comp)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press ${
                        status === 'done'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Flag size={13} className={status === 'done' ? 'fill-primary text-primary' : ''} />
                      {status === 'done' ? 'Genomförd ✓' : 'Genomförd'}
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => setShareComp({ open: true, comp })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all btn-press ml-auto"
                    >
                      <Send size={13} /> Tipsa
                    </button>
                  )}
                  {status && selectedDog && (
                    <span className="text-[10px] text-muted-foreground">
                      🐕 {selectedDog.name}
                    </span>
                  )}
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
                    href="https://agilitydata.se/taevlingar/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                  >
                    agilitydata.se <ExternalLink size={10} />
                  </a>
                </div>

                {/* Auto-link to results for past competitions */}
                {comp.date_end && new Date(comp.date_end + 'T23:59:59') < new Date() && (
                  <div className="mt-2 pt-2 border-t border-border">
                    {expandedResults === comp.id ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => setExpandedResults(null)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          ▲ Dölj resultat
                        </button>
                        <CompetitionResultsViewer
                          url={`https://agilitydata.se/taevlingar/lopplista/?competitionId=${comp.id}&competitionPartKey=${comp.part_key}`}
                          friendNames={friendNames}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedResults(comp.id)}
                        className="flex items-center gap-1.5 text-[11px] text-primary font-medium hover:underline"
                      >
                        <Trophy size={12} /> Visa resultat
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      

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

      {shareComp.comp && (
        <ShareToFriendDialog
          open={shareComp.open}
          onOpenChange={(open) => setShareComp({ open, comp: open ? shareComp.comp : null })}
          sharedType="competition"
          sharedId={shareComp.comp.id}
          sharedData={{
            name: stripHtml(shareComp.comp.competition_name),
            club: stripHtml(shareComp.comp.club_name),
            date: formatDateRange(shareComp.comp.date_start, shareComp.comp.date_end),
            location: shareComp.comp.location || '',
            source_url: shareComp.comp.source_url || '',
          }}
        />
      )}
    </div>
  );
}
