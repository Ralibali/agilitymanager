import { useState, useEffect, useMemo } from 'react';
import { stripHtml } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MapPin, ExternalLink, Star, CheckCircle2, Home, TreePine, Navigation, Sparkles, Flag } from 'lucide-react';
import { CITY_COORDS, haversineDistance, type Competition } from '@/types/competitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCompetitionInterests, type InterestStatus } from '@/hooks/useCompetitionInterests';
import { getCountyForLocation } from '@/lib/swedishCityCounty';
import type { Dog } from '@/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';


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
  return `${s} – ${formatDateShort(end)}`;
}

function statusColor(status: string | null): string {
  if (!status) return 'bg-muted text-muted-foreground';
  const s = status.toUpperCase();
  if (s.includes('ÖPPEN')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (s.includes('STÄNGD')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
}

/** Try to find the closest matching city in CITY_COORDS for a location string */
function findCityCoords(location: string | null): [number, number] | null {
  if (!location) return null;
  const loc = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (loc.includes(city.toLowerCase())) return coords;
  }
  return null;
}

/** Calculate match score (higher = better) */
function matchScore(comp: Competition, dog: Dog, userCoords: [number, number] | null, maxKm: number): { score: number; distance: number | null; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Class match
  const level = dog.competition_level;
  const jumpLevel = dog.jumping_level;
  const agClasses = comp.classes_agility || [];
  const hoClasses = comp.classes_hopp || [];

  const levelToAg: Record<string, string> = { K1: 'Ag1', K2: 'Ag2', K3: 'Ag3' };
  const levelToHo: Record<string, string> = { K1: 'Ho1', K2: 'Ho2', K3: 'Ho3' };

  if (level !== 'Nollklass' && agClasses.includes(levelToAg[level])) {
    score += 30;
    reasons.push(`Agility ${level}`);
  }
  if (jumpLevel !== 'Nollklass' && hoClasses.includes(levelToHo[jumpLevel])) {
    score += 30;
    reasons.push(`Hopp ${jumpLevel}`);
  }
  if (level === 'Nollklass' && jumpLevel === 'Nollklass' && (comp.classes_other || []).includes('0-klass')) {
    score += 30;
    reasons.push('0-klass');
  }

  // If no class match at all, return 0
  if (score === 0) return { score: 0, distance: null, reasons: [] };

  // Open for registration bonus
  if (comp.status?.toUpperCase().includes('ÖPPEN')) {
    score += 15;
    reasons.push('Öppen för anmälan');
  }

  // Registration deadline approaching (within 14 days)
  if (comp.last_registration_date) {
    const daysUntil = Math.floor((new Date(comp.last_registration_date).getTime() - Date.now()) / 86400000);
    if (daysUntil > 0 && daysUntil <= 14) {
      score += 10;
      reasons.push(`Sista anm. om ${daysUntil} dagar`);
    }
  }

  // Distance scoring
  let distance: number | null = null;
  if (userCoords) {
    const compCoords = findCityCoords(comp.location);
    if (compCoords) {
      distance = Math.round(haversineDistance(userCoords[0], userCoords[1], compCoords[0], compCoords[1]));
      if (distance <= maxKm) {
        // Closer = higher score, max 25 points
        score += Math.max(0, Math.round(25 * (1 - distance / maxKm)));
      } else {
        // Too far, heavy penalty
        score -= 20;
      }
    }
  }

  return { score, distance, reasons };
}

interface RecommendedCompetitionsProps {
  dogs: Dog[];
}

export function RecommendedCompetitions({ dogs }: RecommendedCompetitionsProps) {
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string>('Stockholm');
  const [maxKm, setMaxKm] = useState(200);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; compId: string }>({ open: false, compId: '' });

  // Delad intresse-hook (DB för inloggade, cookie/localStorage för gäster)
  const { interests, setInterest } = useCompetitionInterests();

  const activeDogs = useMemo(() => (dogs || []).filter(d => d.is_active_competition_dog), [dogs]);

  useEffect(() => {
    if (activeDogs.length > 0 && !selectedDogId) {
      setSelectedDogId(activeDogs[0].id);
    }
  }, [activeDogs, selectedDogId]);

  const selectedDog = useMemo(() => activeDogs.find(d => d.id === selectedDogId) || null, [activeDogs, selectedDogId]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .gte('date_start', today)
        .order('date_start', { ascending: true })
        .limit(500);

      setCompetitions((data || []) as unknown as Competition[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const userCoords = useMemo(() => CITY_COORDS[userCity] || null, [userCity]);

  const recommendations = useMemo(() => {
    if (!selectedDog) return [];
    return competitions
      .map(comp => {
        const { score, distance, reasons } = matchScore(comp, selectedDog, userCoords, maxKm);
        return { comp, score, distance, reasons };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [competitions, selectedDog, userCoords, maxKm]);

  const toggleInterest = async (comp: Competition, type: InterestStatus) => {
    const current = interests[comp.id];

    // Skydd: kräv bekräftelse om degradering från "anmäld" till "intresserad"
    if (type === 'interested' && current === 'registered') {
      setConfirmDialog({ open: true, compId: comp.id });
      return;
    }

    await setInterest(comp.id, type, {
      dogName: selectedDog?.name || null,
      dogClass: selectedDog?.competition_level || null,
      sport: 'Agility',
      region: comp.location ? getCountyForLocation(comp.location) : null,
    });
  };

  const handleConfirmDowngrade = async () => {
    await setInterest(confirmDialog.compId, 'interested', {
      dogName: selectedDog?.name || null,
      dogClass: selectedDog?.competition_level || null,
      sport: 'Agility',
    });
    setConfirmDialog({ open: false, compId: '' });
  };


  const cities = Object.keys(CITY_COORDS).sort();

  if (activeDogs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="mx-auto mb-3 text-primary" size={32} />
        <p className="font-medium">Inga aktiva tävlingshundar</p>
        <p className="text-xs mt-1">Markera minst en hund som aktiv tävlingshund under Mina hundar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dog selector */}
      <div className="bg-card rounded-xl p-3 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs font-semibold">Rekommendationer för:</span>
        </div>
        {activeDogs.length > 1 && (
          <Select value={selectedDogId || ''} onValueChange={setSelectedDogId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeDogs.map(d => (
                <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedDog && (
          <p className="text-xs text-muted-foreground">
            {selectedDog.name}: {selectedDog.competition_level !== 'Nollklass' ? `Agility ${selectedDog.competition_level}` : ''}{selectedDog.jumping_level !== 'Nollklass' ? ` Hopp ${selectedDog.jumping_level}` : ''}{selectedDog.competition_level === 'Nollklass' && selectedDog.jumping_level === 'Nollklass' ? '0-klass' : ''}, storleksklass {selectedDog.size_class}
          </p>
        )}
      </div>

      {/* Location & distance */}
      <div className="bg-card rounded-xl p-3 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-primary" />
          <span className="text-xs font-semibold">Din ort & avstånd</span>
        </div>
        <Select value={userCity} onValueChange={setUserCity}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {cities.map(c => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Max avstånd</span>
            <span className="font-medium text-foreground">{maxKm} km</span>
          </div>
          <Slider
            value={[maxKm]}
            onValueChange={([v]) => setMaxKm(v)}
            min={25}
            max={500}
            step={25}
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : recommendations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Inga matchande tävlingar hittades. Prova att öka avståndet.
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map(({ comp, score, distance, reasons }) => {
            const status = interests[comp.id];
            const isPast = !!comp.date_end && new Date(comp.date_end + 'T23:59:59') < new Date();
            return (
              <div key={comp.id} className="bg-card rounded-xl border border-border p-4 relative">
                {/* Statuskedja: Intresse / Anmäld / Genomförd (efter datum) */}
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => toggleInterest(comp, 'interested')}
                    className="p-1 rounded-full hover:bg-secondary transition-colors"
                    title="Intresserad"
                  >
                    <Star size={18} className={status === 'interested' || status === 'registered' ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
                  </button>
                  <button
                    onClick={() => toggleInterest(comp, 'registered')}
                    className="p-1 rounded-full hover:bg-secondary transition-colors"
                    title="Anmäld"
                  >
                    <CheckCircle2 size={18} className={status === 'registered' ? 'fill-green-500 text-green-500' : 'text-muted-foreground'} />
                  </button>
                  {(isPast || status === 'done') && (
                    <button
                      onClick={() => toggleInterest(comp, 'done')}
                      className="p-1 rounded-full hover:bg-secondary transition-colors"
                      title="Genomförd"
                    >
                      <Flag size={18} className={status === 'done' ? 'fill-primary text-primary' : 'text-muted-foreground'} />
                    </button>
                  )}
                </div>


                {/* Match badge */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                    <Sparkles size={10} className="mr-0.5" /> Match
                  </Badge>
                  {distance !== null && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Navigation size={10} className="mr-0.5" /> {distance} km
                    </Badge>
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
                </div>

                {/* Match reasons */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {reasons.map((r, i) => (
                    <span key={i} className="text-[10px] text-primary bg-primary/5 rounded px-1.5 py-0.5">{r}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {comp.last_registration_date && (
                      <span className="text-[10px] text-muted-foreground">Sista anm: {formatDateShort(comp.last_registration_date)}</span>
                    )}
                    {comp.status && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusColor(comp.status)}`}>{comp.status}</Badge>
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

      
    </div>
  );
}
