import { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, ExternalLink, ArrowRight, Trophy, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooterV2 } from '@/components/landing/LandingFooterV2';
import { buildAgilityCompetitionPath, buildHoopersCompetitionPath, slugify } from '@/lib/competitionSlug';
import { Disclaimer } from '@/components/Disclaimer';

type Sport = 'agility' | 'hoopers';
type SportFilter = 'all' | Sport;

/**
 * Region-slug → display-namn för svenska län. Slug används i URL
 * (?region=stockholm) och matchas case-insensitivt mot competition.region/county.
 * Vi accepterar både "Stockholm" och "Stockholms län" från databasen.
 */
const REGION_LABELS: Record<string, string> = {
  stockholm: 'Stockholm',
  uppsala: 'Uppsala',
  sodermanland: 'Södermanland',
  ostergotland: 'Östergötland',
  jonkoping: 'Jönköping',
  kronoberg: 'Kronoberg',
  kalmar: 'Kalmar',
  gotland: 'Gotland',
  blekinge: 'Blekinge',
  skane: 'Skåne',
  halland: 'Halland',
  'vastra-gotaland': 'Västra Götaland',
  varmland: 'Värmland',
  orebro: 'Örebro',
  vastmanland: 'Västmanland',
  dalarna: 'Dalarna',
  gavleborg: 'Gävleborg',
  vasternorrland: 'Västernorrland',
  jamtland: 'Jämtland',
  vasterbotten: 'Västerbotten',
  norrbotten: 'Norrbotten',
};

function regionMatches(competitionRegion: string | null, regionSlug: string | null): boolean {
  if (!regionSlug) return true;
  if (!competitionRegion) return false;
  // Normalisera "Stockholms län" → "stockholm"
  const normalized = slugify(competitionRegion.replace(/s? län$/i, ''));
  return normalized === regionSlug || normalized.startsWith(regionSlug);
}

interface UnifiedCompetition {
  id: string;
  rawId: string; // ursprungligt id utan sport-prefix, för länk till detalj
  name: string;
  club: string;
  location: string;
  region: string | null;
  date_start: string; // ISO date
  date_end: string | null;
  sport: Sport;
  classes: string[];
  source_url: string | null;
  status: string | null;
}

const SITE_URL = 'https://agilitymanager.se';

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatDateRange(start: string, end: string | null): string {
  const startDate = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const startStr = startDate.toLocaleDateString('sv-SE', opts);
  if (!end || end === start) return startStr;
  const endDate = new Date(end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  if (sameMonth) {
    return `${startDate.getDate()}–${endDate.toLocaleDateString('sv-SE', opts)}`;
  }
  return `${startStr} – ${endDate.toLocaleDateString('sv-SE', opts)}`;
}

function groupByMonth(items: UnifiedCompetition[]): { label: string; items: UnifiedCompetition[] }[] {
  const map = new Map<string, UnifiedCompetition[]>();
  for (const c of items) {
    const d = new Date(c.date_start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const sortedKeys = Array.from(map.keys()).sort();
  return sortedKeys.map((key) => {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    const label = date.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
    return { label: label.charAt(0).toUpperCase() + label.slice(1), items: map.get(key)! };
  });
}

export default function PublicCompetitionsPage() {
  const [competitions, setCompetitions] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synkat filter — single source of truth är querystring.
  // Detta gör vyer delbara: /tavlingar?region=stockholm&sport=hoopers
  const sportFilter: SportFilter = (() => {
    const s = searchParams.get('sport');
    return s === 'agility' || s === 'hoopers' ? s : 'all';
  })();
  const regionFilter: string | null = (() => {
    const r = searchParams.get('region')?.toLowerCase() ?? null;
    return r && REGION_LABELS[r] ? r : null;
  })();

  const updateFilter = useCallback(
    (next: { sport?: SportFilter; region?: string | null }) => {
      const params = new URLSearchParams(searchParams);
      if (next.sport !== undefined) {
        if (next.sport === 'all') params.delete('sport');
        else params.set('sport', next.sport);
      }
      if (next.region !== undefined) {
        if (!next.region) params.delete('region');
        else params.set('region', next.region);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let cancelled = false;

    Promise.all([
      supabase
        .from('competitions')
        .select('id, competition_name, club_name, location, region, date_start, date_end, classes_agility, classes_hopp, source_url, status')
        .gte('date_start', today)
        .order('date_start', { ascending: true })
        .limit(500),
      supabase
        .from('hoopers_competitions_public')
        .select('competition_id, competition_name, club_name, location, county, date, classes, source_url, registration_status')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(200),
    ]).then(([agilityRes, hoopersRes]) => {
      if (cancelled) return;
      const agility: UnifiedCompetition[] = (agilityRes.data || []).map((r: any) => ({
        id: `a-${r.id}`,
        rawId: r.id,
        name: stripHtml(r.competition_name) || 'Tävling',
        club: stripHtml(r.club_name) || '',
        location: stripHtml(r.location) || '',
        region: r.region,
        date_start: r.date_start,
        date_end: r.date_end,
        sport: 'agility',
        classes: [...(r.classes_agility || []), ...(r.classes_hopp || [])],
        source_url: r.source_url,
        status: r.status,
      }));
      const hoopers: UnifiedCompetition[] = (hoopersRes.data || []).map((r: any) => ({
        id: `h-${r.competition_id}`,
        rawId: r.competition_id,
        name: stripHtml(r.competition_name) || 'Hooperstävling',
        club: stripHtml(r.club_name) || '',
        location: stripHtml(r.location) || '',
        region: r.county,
        date_start: r.date,
        date_end: null,
        sport: 'hoopers',
        classes: r.classes || [],
        source_url: r.source_url,
        status: r.registration_status,
      }));
      const combined = [...agility, ...hoopers].sort((a, b) =>
        a.date_start.localeCompare(b.date_start),
      );
      setCompetitions(combined);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return competitions.filter((c) => {
      if (sportFilter !== 'all' && c.sport !== sportFilter) return false;
      if (!regionMatches(c.region, regionFilter)) return false;
      return true;
    });
  }, [competitions, sportFilter, regionFilter]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  // Counts respekterar region men inte sport (annars går sport-knappar i 0)
  const regionScoped = useMemo(
    () => competitions.filter((c) => regionMatches(c.region, regionFilter)),
    [competitions, regionFilter],
  );
  const counts = useMemo(
    () => ({
      all: regionScoped.length,
      agility: regionScoped.filter((c) => c.sport === 'agility').length,
      hoopers: regionScoped.filter((c) => c.sport === 'hoopers').length,
    }),
    [regionScoped],
  );

  // Tillgängliga regioner — endast de som faktiskt har tävlingar.
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    for (const c of competitions) {
      if (!c.region) continue;
      const slug = slugify(c.region.replace(/s? län$/i, ''));
      if (REGION_LABELS[slug]) set.add(slug);
    }
    return Array.from(set).sort((a, b) =>
      REGION_LABELS[a].localeCompare(REGION_LABELS[b], 'sv'),
    );
  }, [competitions]);

  // SEO: dynamisk titel/beskrivning/canonical baserat på filter.
  // Varje filtrerad vy får egen canonical så Google kan indexera dem separat.
  const seo = useMemo(() => {
    const regionLabel = regionFilter ? REGION_LABELS[regionFilter] : null;
    const sportLabel =
      sportFilter === 'agility' ? 'Agility' : sportFilter === 'hoopers' ? 'Hoopers' : null;

    const titleBits = [sportLabel ? `${sportLabel}tävlingar` : 'Agility- och hooperstävlingar'];
    if (regionLabel) titleBits.push(`i ${regionLabel}`);
    else titleBits.push('i Sverige');
    const title = `${titleBits.join(' ')} | AgilityManager`;

    const descBits: string[] = [];
    descBits.push(
      `Komplett översikt över kommande ${sportLabel ? sportLabel.toLowerCase() + 's' : 'agility- och hoopers'}tävlingar`,
    );
    if (regionLabel) descBits.push(`i ${regionLabel} län`);
    descBits.push('. Datum, klubbar, klasser och anmälningslänkar — uppdateras dagligen.');
    const description = descBits.join(' ').replace(' .', '.');

    const params = new URLSearchParams();
    if (regionFilter) params.set('region', regionFilter);
    if (sportFilter !== 'all') params.set('sport', sportFilter);
    const qs = params.toString();
    const canonical = `${SITE_URL}/tavlingar${qs ? `?${qs}` : ''}`;

    const h1 = regionLabel
      ? `${sportLabel || 'Tävlingar'} i ${regionLabel}`
      : sportLabel
        ? `${sportLabel}tävlingar i Sverige`
        : 'Tävlingar i Sverige';

    return { title, description, canonical, h1 };
  }, [sportFilter, regionFilter]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seo.h1,
    description: seo.description,
    url: seo.canonical,
    isPartOf: { '@type': 'WebSite', name: 'AgilityManager', url: SITE_URL },
  };

  const hasActiveFilter = sportFilter !== 'all' || regionFilter !== null;

  return (
    <div className="min-h-screen bg-page font-sans-ds text-text-primary">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical} />
        <meta property="og:title" content={seo.title.replace(' | AgilityManager', '')} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <LandingNav />

      {/* Hero */}
      <header className="border-b border-border-subtle bg-page">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <nav aria-label="Brödsmulor" className="mb-4 text-sm text-text-secondary">
            <Link to="/" className="hover:text-text-primary">
              Startsidan
            </Link>{' '}
            /{' '}
            {hasActiveFilter ? (
              <>
                <Link to="/tavlingar" className="hover:text-text-primary">
                  Tävlingar
                </Link>
                {' / '}
                <span>{seo.h1}</span>
              </>
            ) : (
              'Tävlingar'
            )}
          </nav>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {seo.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-text-secondary">
            {regionFilter
              ? `Kommande tävlingar i ${REGION_LABELS[regionFilter]}. Uppdateras dagligen från Agilitydata.se och SHoK.`
              : 'Kommande agility- och hooperstävlingar enligt Agilitydata.se. Uppdateras dagligen.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <Trophy className="h-4 w-4" />
            <span>
              {filtered.length} kommande tävlingar
              {regionFilter ? ` i ${REGION_LABELS[regionFilter]}` : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Filter */}
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-page/95 backdrop-blur supports-[backdrop-filter]:bg-page/80">
        <div className="mx-auto max-w-6xl px-4 py-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {(['all', 'agility', 'hoopers'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => updateFilter({ sport: opt })}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  sportFilter === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface text-text-secondary hover:bg-surface-2'
                }`}
              >
                {opt === 'all' ? 'Alla' : opt === 'agility' ? 'Agility' : 'Hoopers'}{' '}
                <span className="opacity-70">({counts[opt]})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="region-select" className="text-sm text-text-secondary">
              Län:
            </label>
            <select
              id="region-select"
              value={regionFilter ?? ''}
              onChange={(e) => updateFilter({ region: e.target.value || null })}
              className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Alla län</option>
              {availableRegions.map((slug) => (
                <option key={slug} value={slug}>
                  {REGION_LABELS[slug]}
                </option>
              ))}
            </select>
            {hasActiveFilter && (
              <button
                onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs text-text-secondary hover:bg-surface-2"
              >
                <X className="h-3 w-3" /> Rensa filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface p-12 text-center">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-text-muted" />
            <h2 className="font-display text-xl font-semibold">Inga kommande tävlingar</h2>
            <p className="mt-2 text-text-secondary">
              Det finns inga registrerade tävlingar för det här filtret just nu. Titta tillbaka snart.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map((group) => (
              <section key={group.label}>
                <h2 className="font-display mb-4 text-xl font-semibold text-text-primary">
                  {group.label}
                </h2>
                <ul className="space-y-3">
                  {group.items.map((c) => {
                    const detailPath = c.sport === 'agility'
                      ? buildAgilityCompetitionPath(c.rawId, { club: c.club, name: c.name, location: c.location, date: c.date_start })
                      : buildHoopersCompetitionPath(c.rawId, { club: c.club, name: c.name, location: c.location, date: c.date_start });
                    return (
                    <li
                      key={c.id}
                      className="group rounded-xl border border-border-subtle bg-surface p-4 transition-colors hover:border-primary/40 md:p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Link to={detailPath} className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${
                                c.sport === 'agility'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-secondary/10 text-secondary'
                              }`}
                            >
                              {c.sport === 'agility' ? 'Agility' : 'Hoopers'}
                            </span>
                            <span className="flex items-center gap-1 text-text-secondary">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDateRange(c.date_start, c.date_end)}
                            </span>
                            {c.status && (
                              <span className="text-text-muted">· {c.status}</span>
                            )}
                          </div>
                          <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                            {c.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                            {c.club && <span>{c.club}</span>}
                            {c.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {c.location}
                                {c.region ? `, ${c.region}` : ''}
                              </span>
                            )}
                          </div>
                          {c.classes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {c.classes.map((cls) => (
                                <span
                                  key={cls}
                                  className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-secondary"
                                >
                                  {cls}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                        {c.source_url && (
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2"
                          >
                            Anmäl <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* CTA */}
        <section className="mt-16 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 p-8 text-center md:p-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Logga in för att följa dina tävlingar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            På AgilityManager kan du spara tävlingar, få startlistor automatiskt, följa resultat och
            analysera utvecklingen för din hund över tid.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kom igång gratis <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-text-muted">Källa: Agilitydata.se</p>
        </section>

        {/* Ansvarsfriskrivning för crawlat tävlingsdata */}
        <section className="max-w-3xl mx-auto px-5 md:px-12 pb-12">
          <Disclaimer variant="competition" />
        </section>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
