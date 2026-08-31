import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Seo, SITE_URL } from "@/components/Seo";
import { CompetitionCard } from "./CompetitionCard";
import {
  deadlineInfo,
  fetchUpcomingCompetitions,
  monthLabel,
  type UnifiedCompetition,
} from "@/lib/competitionData";

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
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  match: (c: UnifiedCompetition) => boolean;
  emptyText: string;
  children?: (comps: UnifiedCompetition[]) => React.ReactNode;
}) {
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUpcomingCompetitions()
      .then((list) => {
        if (!cancelled) setAll(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const comps = useMemo(() => all.filter(match), [all, match]);
  const openCount = comps.filter((c) => deadlineInfo(c.registrationCloses).tone !== "closed").length;

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
      name: seoTitle,
      itemListElement: comps.slice(0, 25).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        url: `${SITE_URL}${c.path}`,
      })),
    }),
    [comps, seoTitle],
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonicalPath={canonicalPath}
        jsonLd={comps.length > 0 ? jsonLd : undefined}
      />
      <SiteNav />
      <PageHero kicker={kicker} title={title}>
        {intro}
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
        </Reveal>

        {!loading && comps.length === 0 && (
          <p className="mt-12 text-lg font-semibold text-ink/50">{emptyText}</p>
        )}

        {groups.map(([month, list]) => (
          <div key={month} className="mt-12">
            <Reveal>
              <h2 className="font-display text-5xl capitalize tracking-wide">{month}</h2>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {list.map((c, i) => (
                <Reveal key={c.key} delay={Math.min(i, 6) * 70}>
                  <CompetitionCard comp={c} />
                </Reveal>
              ))}
            </div>
          </div>
        ))}

        {children?.(comps)}

        <Reveal className="mt-16">
          <div className="mx-auto grid max-w-4xl items-center gap-8 rounded-3xl border-2 border-ink bg-ink p-8 text-paper shadow-hard sm:p-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="font-display text-4xl leading-[0.95] sm:text-5xl">
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
