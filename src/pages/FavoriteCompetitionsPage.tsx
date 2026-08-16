import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Heart, Trash2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { CompetitionCard } from "@/components/competitions/CompetitionCard";
import {
  fetchUpcomingCompetitions,
  monthLabel,
  type UnifiedCompetition,
} from "@/lib/competitionData";
import { useFavoriteCompetitions } from "@/lib/favoriteCompetitions";

export default function FavoriteCompetitionsPage() {
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const { keys, count, clear } = useFavoriteCompetitions();

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

  const favorites = useMemo(() => all.filter((c) => keys.includes(c.key)), [all, keys]);

  const groups = useMemo(() => {
    const byMonth = new Map<string, UnifiedCompetition[]>();
    favorites.forEach((c) => {
      const key = monthLabel(c.dateStart);
      byMonth.set(key, [...(byMonth.get(key) ?? []), c]);
    });
    return [...byMonth.entries()];
  }, [favorites]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Mina favorittävlingar | AgilityManager"
        description="Din egen lista med sparade agility- och hooperstävlingar — datum, klasser och sista anmälningsdag samlat på ett ställe."
        canonicalPath="/tavlingar/favoriter"
        noindex
      />
      <SiteNav />
      <PageHero kicker="Mina favoriter" title="Tävlingarna du sparat.">
        Spara tävlingar med hjärtat i kalendern så hamnar de här. Listan sparas i
        den här webbläsaren — inget konto behövs.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/tavlingar"
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-5 py-2.5 text-sm font-bold text-paper shadow-hard-sm"
            >
              Till tävlingskalendern <ArrowRight className="h-4 w-4" />
            </Link>
            {count > 0 && (
              <button
                onClick={clear}
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/60 transition-colors hover:border-ink hover:text-ink"
              >
                <Trash2 className="h-4 w-4" /> Töm listan
              </button>
            )}
            <span className="text-sm font-semibold text-ink/45">
              {loading ? "Hämtar tävlingar…" : `${favorites.length} sparade tävlingar`}
            </span>
          </div>
        </Reveal>

        {!loading && favorites.length === 0 && (
          <Reveal className="mt-14">
            <div className="rounded-3xl border-2 border-dashed border-ink/20 bg-cream/50 p-10 text-center">
              <Heart className="mx-auto h-8 w-8 text-ember" />
              <h2 className="mt-4 font-display text-3xl tracking-wide">Inga favoriter än</h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-ink/55">
                {count > 0
                  ? "Dina sparade tävlingar har passerat eller finns inte längre i kalendern."
                  : "Tryck på hjärtat på en tävling i kalendern så samlas den här."}
              </p>
              <Link
                to="/tavlingar"
                className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-tang px-6 py-3 text-sm font-bold shadow-hard-sm"
              >
                Bläddra bland tävlingar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        )}

        {groups.map(([month, comps]) => (
          <div key={month} className="mt-14">
            <Reveal>
              <h2 className="font-display text-5xl capitalize tracking-wide">{month}</h2>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {comps.map((c, i) => (
                <Reveal key={c.key} delay={Math.min(i, 6) * 70}>
                  <CompetitionCard comp={c} />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </section>

      <SiteFooter />
    </div>
  );
}
