import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Seo, SITE_URL } from "@/components/Seo";
import { CompetitionCard } from "./CompetitionCard";
import { CompetitionSourceNote } from "./CompetitionSourceNote";
import {
  fetchPastCompetitions,
  fetchUpcomingCompetitions,
  longDate,
  monthLabel,
  registrationOpen,
  type UnifiedCompetition,
} from "@/lib/competitionData";

/** Text som kan bero på vilka tävlingar som hittades, t.ex. klubbens riktiga namn. */
type LandingText = string | ((comps: UnifiedCompetition[]) => string);

/**
 * Generisk landningssida för en delmängd tävlingar (län eller klubb).
 * Renderar SEO-huvud, månadsgrupperad lista och interna länkar.
 */
export function CompetitionLanding({
  kicker,
  title,
  intro,
  seoTitle,
  seoDescription,
  canonicalPath,
  match,
  emptyText,
  includePast = false,
  children,
}: {
  kicker: string;
  title: LandingText;
  intro: LandingText;
  seoTitle: LandingText;
  seoDescription: LandingText;
  canonicalPath: string;
  match: (c: UnifiedCompetition) => boolean;
  emptyText: LandingText;
  /** Visa även genomförda tävlingar från senaste året (för klubbsidor). */
  includePast?: boolean;
  children?: (comps: UnifiedCompetition[], pastComps: UnifiedCompetition[]) => React.ReactNode;
}) {
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [allPast, setAllPast] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchUpcomingCompetitions(),
      includePast ? fetchPastCompetitions() : Promise.resolve<UnifiedCompetition[]>([]),
    ])
      .then(([upcoming, past]) => {
        if (cancelled) return;
        setAll(upcoming);
        setAllPast(past);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includePast]);

  const comps = useMemo(() => all.filter(match), [all, match]);
  const pastComps = useMemo(() => allPast.filter(match), [allPast, match]);
  // Texterna får både kommande och genomförda tävlingar, t.ex. för att hitta
  // klubbens riktiga namn även när den saknar kommande tävlingar.
  const text = (value: LandingText) =>
    typeof value === "function" ? value([...comps, ...pastComps]) : value;
  const seoTitleText = text(seoTitle);
  const openCount = comps.filter((c) => registrationOpen(c.registrationCloses)).length;

  const groups = useMemo(() => {
    const byMonth = new Map<string, UnifiedCompetition[]>();
    comps.forEach((c) => {
      const key = monthLabel(c.dateStart);
      byMonth.set(key, [...(byMonth.get(key) ?? []), c]);
    });
    return [...byMonth.entries()];
  }, [comps]);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: seoTitleText,
      itemListElement: comps.slice(0, 25).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        url: `${SITE_URL}${c.path}`,
      })),
    }),
    [comps, seoTitleText],
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title={seoTitleText}
        description={text(seoDescription)}
        canonicalPath={canonicalPath}
        jsonLd={comps.length > 0 ? jsonLd : undefined}
      />
      <SiteNav />
      <PageHero kicker={kicker} title={text(title)}>
        {text(intro)}
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <Link
            to="/tavlingar"
            className="inline-flex items-center gap-2 text-sm font-bold text-ink/60 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Alla tävlingar i Sverige
          </Link>
          <p className="mt-4 text-sm font-semibold text-ink/45">
            {loading
              ? "Hämtar tävlingar…"
              : `${comps.length} kommande ${comps.length === 1 ? "tävling" : "tävlingar"} · ${openCount} med öppen anmälan`}
          </p>
          <CompetitionSourceNote className="mt-4 max-w-3xl" />
        </Reveal>

        {!loading && comps.length === 0 && (
          <p className="mt-12 text-lg font-semibold text-ink/50">{text(emptyText)}</p>
        )}

        {groups.map(([month, list]) => (
          <div key={month} className="mt-12">
            <Reveal>
              <h2 className="font-display text-5xl capitalize tracking-wide">{month}</h2>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {list.map((c, i) => (
                <Reveal key={c.key} delay={Math.min(i, 6) * 70}>
                  <CompetitionCard comp={c} />
                </Reveal>
              ))}
            </div>
          </div>
        ))}

        {pastComps.length > 0 && (
          <div className="mt-14">
            <Reveal>
              <h2 className="font-display text-4xl tracking-wide">Genomförda tävlingar</h2>
              <p className="mt-2 text-sm font-semibold text-ink/50">Senaste året, nyast först.</p>
            </Reveal>
            <ul className="mt-5 divide-y-2 divide-ink/10 rounded-3xl border-2 border-ink/15 bg-cream/40">
              {pastComps.slice(0, 30).map((c) => (
                <li key={c.key}>
                  <Link
                    to={c.path}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-ink/5"
                  >
                    <span className="min-w-0 font-bold [overflow-wrap:anywhere]">{c.name}</span>
                    <span className="text-sm font-semibold text-ink/55">
                      {c.dateStart ? longDate(c.dateStart) : "Datum saknas"}
                      {c.location ? ` · ${c.location}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {children?.(comps, pastComps)}

        <Reveal className="mt-16">
          <div className="mx-auto grid max-w-4xl items-center gap-8 rounded-3xl border-2 border-ink bg-ink p-8 text-paper shadow-hard sm:p-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="font-display text-4xl leading-[1.02] sm:text-5xl">
                Träna rätt saker fram till start.
              </h2>
              <p className="mt-4 leading-relaxed text-paper/60">
                Rita banan ni ska träna och dela den med klubben — mottagaren
                behöver inget konto.
              </p>
              <Link to="/banplanerare" className="group mt-5 inline-flex items-center gap-2 font-bold text-tang">
                Öppna planeraren
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </div>
            <div className="rounded-2xl border border-paper/15 p-5">
              <p className="text-sm font-bold uppercase tracking-wider text-tang">Kunskapsbanken</p>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">
                Fördjupa dig i bandesign, regler och träningsupplägg inför tävlingssäsongen.
              </p>
              <Link to="/blogg" className="group mt-4 inline-flex items-center gap-2 text-sm font-bold text-paper hover:text-tang">
                Läs guiderna
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
