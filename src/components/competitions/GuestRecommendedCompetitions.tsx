import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { stripHtml } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ExternalLink, Navigation, Sparkles, Home, TreePine, Calendar } from "lucide-react";
import { CITY_COORDS, haversineDistance, type Competition } from "@/types/competitions";

const GUEST_GEO_KEY = "am.guest.geo.v1";
const FALLBACK_CITY = "Stockholm";

interface StoredGeo {
  city: string;
  maxKm: number;
}

function readGuestGeo(): StoredGeo {
  if (typeof window === "undefined") return { city: FALLBACK_CITY, maxKm: 200 };
  try {
    const raw = window.localStorage.getItem(GUEST_GEO_KEY);
    if (!raw) return { city: FALLBACK_CITY, maxKm: 200 };
    const parsed = JSON.parse(raw);
    const city = typeof parsed?.city === "string" && CITY_COORDS[parsed.city] ? parsed.city : FALLBACK_CITY;
    const maxKm = typeof parsed?.maxKm === "number" ? Math.min(500, Math.max(25, parsed.maxKm)) : 200;
    return { city, maxKm };
  } catch {
    return { city: FALLBACK_CITY, maxKm: 200 };
  }
}

function writeGuestGeo(geo: StoredGeo): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_GEO_KEY, JSON.stringify(geo));
  } catch {
    /* ignore quota */
  }
}

function findCityCoords(location: string | null): [number, number] | null {
  if (!location) return null;
  const loc = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (loc.includes(city.toLowerCase())) return coords;
  }
  return null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDateShort(d: string | null): string {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "";
  const s = formatDateShort(start);
  if (!end || end === start) return s;
  return `${s} – ${formatDateShort(end)}`;
}

interface ScoredComp {
  comp: Competition;
  distance: number | null;
  daysUntil: number;
}

/**
 * Sortera utloggade rekommendationer på datum + region.
 * - Datum-stigande är primär ordning (närmst i tiden = högst).
 * - Inom samma "närhet i tid" prioriteras tävlingar inom maxKm från vald ort.
 * - Tävlingar utanför maxKm filtreras bort helt.
 * - Saknas geo helt → fallback till Stockholm.
 */
function rankForGuests(comps: Competition[], userCoords: [number, number], maxKm: number): ScoredComp[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scored: ScoredComp[] = [];
  for (const comp of comps) {
    if (!comp.date_start) continue;
    const compDate = new Date(comp.date_start + "T00:00:00");
    const days = Math.ceil((compDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) continue;

    const compCoords = findCityCoords(comp.location);
    let distance: number | null = null;
    if (compCoords) {
      distance = Math.round(
        haversineDistance(userCoords[0], userCoords[1], compCoords[0], compCoords[1]),
      );
      if (distance > maxKm) continue;
    }
    // Tävlingar utan koordinat-match får visas men hamnar sist via distance=null
    scored.push({ comp, distance, daysUntil: days });
  }

  return scored.sort((a, b) => {
    // 1) Sortera primärt på datum (närmast först)
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    // 2) Inom samma datum → närmare ort först (null sist)
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });
}

interface Props {
  /** Begränsa antal rekommendationer (default 12) */
  limit?: number;
}

/**
 * Rekommendationer för utloggade besökare.
 * - Datum-stigande sortering (kommande först)
 * - Region-baserat: tävlingar inom maxKm från vald ort, default Stockholm
 * - Sparar valt geo i localStorage så återbesök minns valet
 */
export function GuestRecommendedCompetitions({ limit = 12 }: Props) {
  const initialGeo = readGuestGeo();
  const [city, setCity] = useState<string>(initialGeo.city);
  const [maxKm, setMaxKm] = useState<number>(initialGeo.maxKm);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  // Persistera ändringar
  useEffect(() => {
    writeGuestGeo({ city, maxKm });
  }, [city, maxKm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("competitions")
      .select(
        "id, competition_name, club_name, location, region, date_start, date_end, last_registration_date, classes_agility, classes_hopp, classes_other, source_url, status, indoor_outdoor",
      )
      .gte("date_start", today)
      .order("date_start", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        setCompetitions((data ?? []) as unknown as Competition[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fallback till Stockholm om okänd ort eller om CITY_COORDS saknas
  const userCoords = useMemo<[number, number]>(() => {
    return CITY_COORDS[city] ?? CITY_COORDS[FALLBACK_CITY];
  }, [city]);

  const recommendations = useMemo(() => {
    return rankForGuests(competitions, userCoords, maxKm).slice(0, limit);
  }, [competitions, userCoords, maxKm, limit]);

  const cities = Object.keys(CITY_COORDS).sort();
  const usingFallback = !CITY_COORDS[city];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-3 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-primary" />
          <span className="text-xs font-semibold">Din ort & avstånd</span>
          {usingFallback && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Fallback: {FALLBACK_CITY}
            </Badge>
          )}
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {cities.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
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
        <p className="text-[10px] text-muted-foreground">
          Sorterat efter datum (kommande först), inom <strong>{maxKm} km</strong> från {city}.
          Logga in för att få personliga rekommendationer baserat på din hund.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Inga kommande tävlingar inom {maxKm} km från {city}. Prova att öka avståndet.
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map(({ comp, distance, daysUntil }) => (
            <div key={comp.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                  <Sparkles size={10} className="mr-0.5" /> Närmast i tiden
                </Badge>
                {distance !== null && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <Navigation size={10} className="mr-0.5" /> {distance} km
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Calendar size={10} className="mr-0.5" />
                  {daysUntil === 0 ? "Idag" : daysUntil === 1 ? "Imorgon" : `Om ${daysUntil} d`}
                </Badge>
              </div>

              <div className="text-lg font-bold font-display text-primary mb-1">
                {formatDateRange(comp.date_start, comp.date_end)}
              </div>
              <div className="font-semibold text-sm">{stripHtml(comp.club_name ?? "")}</div>
              <div className="text-xs text-muted-foreground">
                {stripHtml(comp.competition_name ?? "")}
              </div>

              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <MapPin size={12} />
                {comp.location}
                {comp.indoor_outdoor && (
                  <span className="ml-1">
                    {comp.indoor_outdoor.toLowerCase().includes("inomhus") ? (
                      <Home size={12} className="inline" />
                    ) : (
                      <TreePine size={12} className="inline" />
                    )}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {comp.classes_agility?.map((c) => (
                  <Badge
                    key={`a-${c}`}
                    className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0"
                  >
                    {c}
                  </Badge>
                ))}
                {comp.classes_hopp?.map((c) => (
                  <Badge
                    key={`h-${c}`}
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0"
                  >
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {comp.last_registration_date && (
                    <span className="text-[10px] text-muted-foreground">
                      Sista anm: {formatDateShort(comp.last_registration_date)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to="/auth"
                    className="text-[10px] text-primary hover:underline"
                  >
                    Logga in &amp; markera intresserad
                  </Link>
                  <a
                    href={comp.source_url ?? "https://agilitydata.se/taevlingar/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                  >
                    Källa <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
