import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Info, Trophy } from 'lucide-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooterV2 } from '@/components/landing/LandingFooterV2';
import { Disclaimer } from '@/components/Disclaimer';
import { V3FindCompetitions } from '@/components/v3/V3FindCompetitions';

/**
 * Region-slug → display-namn för svenska län (används bara för SEO-titel/H1).
 * Faktiska filter och listning hanteras av <V3FindCompetitions/> så att
 * inloggade och utloggade får exakt samma flikar, filter och intresse-knappar.
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

const SITE_URL = 'https://agilitymanager.se';
type SportFilter = 'all' | 'agility' | 'hoopers';

export default function PublicCompetitionsPage() {
  const [searchParams] = useSearchParams();

  const sportFilter: SportFilter = (() => {
    const s = searchParams.get('sport');
    return s === 'agility' || s === 'hoopers' ? s : 'all';
  })();
  const regionFilter: string | null = (() => {
    const r = searchParams.get('region')?.toLowerCase() ?? null;
    return r && REGION_LABELS[r] ? r : null;
  })();

  // SEO: dynamisk titel/beskrivning/canonical baserat på filter.
  const seo = useMemo(() => {
    const regionLabel = regionFilter ? REGION_LABELS[regionFilter] : null;
    const sportLabel =
      sportFilter === 'agility' ? 'Agility' : sportFilter === 'hoopers' ? 'Hoopers' : null;

    const titleBits = [sportLabel ? `${sportLabel}tävlingar` : 'Agility- och hooperstävlingar'];
    titleBits.push(regionLabel ? `i ${regionLabel}` : 'i Sverige');
    const title = `${titleBits.join(' ')} | AgilityManager`;

    const description = `Komplett översikt över kommande ${
      sportLabel ? sportLabel.toLowerCase() + 's' : 'agility- och hoopers'
    }tävlingar${regionLabel ? ` i ${regionLabel} län` : ''}. Datum, klubbar, klasser och anmälningslänkar — uppdateras dagligen.`;

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

  // Förvald sport till den delade komponenten — Hoopers om filtret är hoopers,
  // annars Agility (komponentens initial). Användaren kan byta inifrån.
  const preferredSport = sportFilter === 'hoopers' ? 'Hoopers' : 'Agility';

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
            <span>Samma vy som inloggade — välj sport, filtrera och markera intresserad nedan.</span>
          </div>

          {/* Tydlig datakälla & ansvarsfriskrivning */}
          <div className="mt-6 rounded-2xl border border-border-subtle bg-surface px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <div className="text-sm text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">Datakälla:</strong> Tävlingsinformationen hämtas automatiskt från publika källor — främst{' '}
                  <a href="https://agilitydata.se" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                    agilitydata.se
                  </a>{' '}
                  (SAgiK/AGIDA) för agility och{' '}
                  <a href="https://shok.se" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                    SHoK
                  </a>{' '}
                  för hoopers. Data kan vara försenad eller felaktig.
                </p>
                <p className="mt-1.5">
                  AgilityManager har inget samarbete med, och är inte godkänd av, SAgiK, AGIDA eller SHoK. Verifiera alltid information direkt hos arrangören innan anmälan.{' '}
                  <Link to="/disclaimer" className="text-primary underline-offset-2 hover:underline">
                    Läs fullständig ansvarsfriskrivning
                  </Link>
                  .
                </p>
                <p className="mt-1.5">
                  <strong className="text-text-primary">Inga konton krävs:</strong> Dina &quot;Intresserad&quot;-val sparas lokalt i din webbläsare och synkas automatiskt till ditt konto om du loggar in senare. Ingen privat spårning.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Delad komponent — exakt samma flikar, filter och intresse-status som inloggade */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <V3FindCompetitions preferredSport={preferredSport} />

        {/* CTA */}
        <section className="mt-16 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 p-8 text-center md:p-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Logga in för att följa dina tävlingar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            På AgilityManager kan du spara tävlingar permanent på ditt konto, få startlistor automatiskt, följa resultat och analysera utvecklingen för din hund över tid.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kom igång gratis <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-text-muted">Källa: Agilitydata.se &amp; SHoK</p>
        </section>

        <section className="max-w-3xl mx-auto px-5 md:px-12 pb-12 mt-12">
          <Disclaimer variant="competition" />
        </section>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
