import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Info, ArrowRight, UserPlus, ListChecks, Star } from 'lucide-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooterV2 } from '@/components/landing/LandingFooterV2';
import { TavlingsKalendar } from '@/components/competitions/TavlingsKalendar';
import { HoopersKalendar } from '@/components/competitions/HoopersKalendar';
import { MinaTavlingar } from '@/components/competitions/MinaTavlingar';

const SITE_URL = 'https://agilitymanager.se';

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

type SportFilter = 'all' | 'agility' | 'hoopers';
type TabId = 'competitions' | 'mine';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all rounded-full"
      style={{
        background: active ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
        color: active ? 'hsl(var(--card))' : 'hsl(var(--foreground))',
        border: `1px solid ${active ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}`,
      }}
    >
      {children}
    </button>
  );
}

export default function PublicCompetitionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('competitions');

  const sportFilter: SportFilter = (() => {
    const s = searchParams.get('sport');
    return s === 'agility' || s === 'hoopers' ? s : 'all';
  })();
  const regionSlug = (searchParams.get('region') || '').toLowerCase();
  const regionLabel = REGION_LABELS[regionSlug] || null;

  const setSport = (next: SportFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('sport');
    else params.set('sport', next);
    setSearchParams(params, { replace: true });
  };

  // SEO
  const seo = useMemo(() => {
    const sportLabel = sportFilter === 'agility' ? 'Agility' : sportFilter === 'hoopers' ? 'Hoopers' : null;
    const titleBits = [sportLabel ? `${sportLabel}tävlingar` : 'Agility- och hooperstävlingar'];
    titleBits.push(regionLabel ? `i ${regionLabel}` : 'i Sverige');
    const title = `${titleBits.join(' ')} | AgilityManager`;
    const description = `Komplett översikt över kommande ${sportLabel ? sportLabel.toLowerCase() + 's' : 'agility- och hoopers'}tävlingar${regionLabel ? ` i ${regionLabel} län` : ''}. Markera intresse, anmäl och spåra dina tävlingar — fungerar utan inloggning.`;
    const params = new URLSearchParams();
    if (regionSlug) params.set('region', regionSlug);
    if (sportFilter !== 'all') params.set('sport', sportFilter);
    const qs = params.toString();
    const canonical = `${SITE_URL}/tavlingar${qs ? `?${qs}` : ''}`;
    const h1 = regionLabel
      ? `${sportLabel || 'Tävlingar'} i ${regionLabel}`
      : sportLabel
        ? `${sportLabel}tävlingar i Sverige`
        : 'Tävlingar i Sverige';
    return { title, description, canonical, h1 };
  }, [sportFilter, regionSlug, regionLabel]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seo.h1,
    description: seo.description,
    url: seo.canonical,
    isPartOf: { '@type': 'WebSite', name: 'AgilityManager', url: SITE_URL },
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'competitions', label: 'Tävlingar', icon: <Calendar size={13} /> },
    { id: 'mine', label: 'Mina', icon: <Star size={13} /> },
  ];

  const hasActiveFilter = sportFilter !== 'all' || regionLabel !== null;

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

      {/* Hero + datakälla */}
      <header className="border-b border-border-subtle bg-page">
        <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
          <nav aria-label="Brödsmulor" className="mb-4 text-sm text-text-secondary">
            <Link to="/" className="hover:text-text-primary">Startsidan</Link>
            {' / '}
            {hasActiveFilter ? (
              <>
                <Link to="/tavlingar" className="hover:text-text-primary">Tävlingar</Link>
                {' / '}
                <span>{seo.h1}</span>
              </>
            ) : (
              'Tävlingar'
            )}
          </nav>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {seo.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-base md:text-lg text-text-secondary">
            {regionLabel
              ? `Kommande tävlingar i ${regionLabel}. Uppdateras dagligen från Agilitydata.se och SHoK.`
              : 'Kommande agility- och hooperstävlingar. Markera intresse, planera anmälan och håll koll — även utan konto.'}
          </p>

          {/* Datakälla & ansvarsfriskrivning */}
          <div className="mt-6 rounded-2xl border border-border-subtle bg-surface px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <div className="text-sm text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">Datakälla:</strong> Tävlingsinformationen hämtas automatiskt från publika källor — främst{' '}
                  <a href="https://agilitydata.se" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">agilitydata.se</a>{' '}
                  (SAgiK/AGIDA) för agility och{' '}
                  <a href="https://shok.se" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">SHoK</a>{' '}
                  för hoopers. Data kan vara försenad eller felaktig.
                </p>
                <p className="mt-1.5">
                  AgilityManager har inget samarbete med, och är inte godkänd av, SAgiK, AGIDA eller SHoK. Verifiera alltid information direkt hos arrangören innan anmälan.{' '}
                  <Link to="/disclaimer" className="text-primary underline-offset-2 hover:underline">Läs fullständig ansvarsfriskrivning</Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Signup CTA */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 sm:px-5 sm:py-4">
            <UserPlus className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-text-secondary flex-1">
              Skapa ett konto för att synka dina tävlingsmarkeringar mellan enheter, lägga till hundar och få filter anpassade till klass.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 whitespace-nowrap">
              Skapa konto <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-3xl px-4 pt-6 pb-16"
      >
        {/* Sport filter chips — speglar inloggad vy */}
        <motion.div variants={fadeSlide} className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          <FilterChip active={sportFilter === 'all'} onClick={() => setSport('all')}>🏆 Alla</FilterChip>
          <FilterChip active={sportFilter === 'agility'} onClick={() => setSport('agility')}>🏃 Agility</FilterChip>
          <FilterChip active={sportFilter === 'hoopers'} onClick={() => setSport('hoopers')}>🐕 Hoopers</FilterChip>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeSlide} className="flex border-b border-border mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 pb-2.5 text-xs font-medium text-center transition-colors relative flex items-center justify-center gap-1.5"
              style={{
                color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="publicCompTabUnderline"
                  className="absolute bottom-0 left-3 right-3"
                  style={{ height: 2, background: 'hsl(var(--primary))', borderRadius: 1 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* Tävlingar */}
        {activeTab === 'competitions' && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
            {sportFilter !== 'hoopers' && (
              <motion.a
                variants={fadeSlide}
                href="https://www.agida.se"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-card border border-border block rounded-xl hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 gradient-primary">
                  <Calendar size={16} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-foreground">Hitta tävlingar på Agida</div>
                  <div className="text-[11px] text-muted-foreground">Kommande agilitytävlingar i hela Sverige</div>
                </div>
                <ArrowRight size={14} className="text-primary" />
              </motion.a>
            )}

            {sportFilter !== 'agility' && (
              <motion.a
                variants={fadeSlide}
                href="https://shoktavling.se/?page=tavlingar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-card border border-border block rounded-xl hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 gradient-accent">
                  <Trophy size={16} className="text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-foreground">Hitta tävlingar på SHoK</div>
                  <div className="text-[11px] text-muted-foreground">Kommande hoopers-tävlingar</div>
                </div>
                <ArrowRight size={14} className="text-accent" />
              </motion.a>
            )}

            {/* Agility-kalendern (full version) */}
            {sportFilter !== 'hoopers' && (
              <motion.div variants={fadeSlide}>
                <TavlingsKalendar dogs={[]} selectedDogId={null} />
              </motion.div>
            )}

            {/* Hoopers-kalendern (full version) */}
            {sportFilter !== 'agility' && (
              <motion.div variants={fadeSlide}>
                <HoopersKalendar dogs={[]} selectedDogId={null} />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Mina (lokalt sparade) */}
        {activeTab === 'mine' && (
          <motion.div variants={fadeSlide}>
            <MinaTavlingar />
          </motion.div>
        )}

        {/* Bottom CTA */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-5 text-center">
          <ListChecks className="mx-auto mb-2 h-8 w-8 text-primary" />
          <h2 className="font-display text-lg font-semibold mb-1">Kom igång gratis</h2>
          <p className="text-sm text-text-secondary mb-3">
            Med konto får du dog-anpassade filter, synk mellan enheter, resultatlogg och mycket mer.
          </p>
          <Link to="/auth" className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Skapa konto <ArrowRight size={14} />
          </Link>
        </div>
      </motion.main>

      <LandingFooterV2 />
    </div>
  );
}
