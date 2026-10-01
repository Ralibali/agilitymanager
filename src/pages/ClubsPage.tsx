import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Seo, SITE_URL } from "@/components/Seo";
import {
  fetchPastCompetitions,
  fetchUpcomingCompetitions,
  shortDate,
  type UnifiedCompetition,
} from "@/lib/competitionData";
import { buildClubDirectory, filterClubs, groupClubsByCounty, type ClubSummary } from "@/lib/clubs";
import { countySlug } from "@/lib/swedishCounties";
import { clubsSeo } from "@/lib/competitionSeo";
import { CompetitionSourceNote } from "@/components/competitions/CompetitionSourceNote";

function ClubCard({ club }: { club: ClubSummary }) {
  const next = club.nextDate ? shortDate(club.nextDate) : null;
  return (
    <Link
      to={`/tavlingar/klubb/${club.slug}`}
      className="group flex h-full min-w-0 flex-col rounded-3xl border-2 border-ink bg-[#FCFAF4] p-5 shadow-hard-sm transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-extrabold leading-tight [overflow-wrap:anywhere]">{club.name}</h3>
        {next && (
          <span
            className="grid h-14 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-cream text-center font-display leading-none"
            title="Nästa tävling"
          >
            <span>
              <span className="block text-xl">{next.day}</span>
              <span className="block text-xs uppercase">{next.month}</span>
            </span>
          </span>
        )}
      </div>
      {club.locations.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-ink/55 [overflow-wrap:anywhere]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
          {club.locations.slice(0, 3).join(", ")}
          {club.locations.length > 3 ? ` +${club.locations.length - 3}` : ""}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs font-extrabold uppercase tracking-wider">
        {club.sports.map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 ${s === "agility" ? "bg-forest/10 text-forest" : "bg-tang/15 text-ember"}`}
          >
            {s}
          </span>
        ))}
        <span className="text-ink/50">
          {club.upcoming > 0
            ? `${club.upcoming} ${club.upcoming === 1 ? "tävling" : "tävlingar"}${
                club.openRegistration > 0 ? ` · ${club.openRegistration} öppna` : ""
              }`
            : `${club.past} genomförda senaste året`}
        </span>
        <ArrowRight
          className="ml-auto h-4 w-4 text-ink/40 transition-transform group-hover:translate-x-1 group-hover:text-ink"
          aria-hidden
        />
      </div>
    </Link>
  );
}

export default function ClubsPage() {
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [past, setPast] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchUpcomingCompetitions(), fetchPastCompetitions()])
      .then(([upcoming, previous]) => {
        if (cancelled) return;
        setAll(upcoming);
        setPast(previous);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clubs = useMemo(() => buildClubDirectory(all, past), [all, past]);
  const visible = useMemo(() => filterClubs(clubs, query), [clubs, query]);
  const groups = useMemo(() => groupClubsByCounty(visible), [visible]);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Agility- och hoopersklubbar som arrangerar tävlingar",
      itemListElement: clubs.slice(0, 50).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        url: `${SITE_URL}/tavlingar/klubb/${c.slug}`,
      })),
    }),
    [clubs],
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        {...clubsSeo()}
        jsonLd={clubs.length > 0 ? jsonLd : undefined}
      />
      <SiteNav />
      <PageHero kicker="Klubbar" title="Hitta klubbarna.">
        Alla klubbar som arrangerar agility- och hooperstävlingar, län för län – även de som just nu saknar kommande tävlingar. Klicka på en klubb för
        att se datum, klasser, domare och anmälan.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <label className="relative block max-w-xl">
            <span className="sr-only">Sök klubb, ort eller län</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök klubb, ort eller län"
              className="w-full rounded-full border-2 border-ink/15 bg-paper py-3 pl-12 pr-5 text-base font-bold text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none"
            />
          </label>
          <p className="mt-4 text-sm font-semibold text-ink/45" aria-live="polite">
            {loading
              ? "Hämtar klubbar…"
              : query.trim()
                ? `${visible.length} av ${clubs.length} klubbar matchar`
                : `${clubs.length} klubbar som arrangerar tävlingar – ${clubs.filter((c) => c.upcoming > 0).length} med kommande tävlingar`}
          </p>
          <CompetitionSourceNote className="mt-4 max-w-3xl" />
        </Reveal>

        {!loading && visible.length === 0 && (
          <p className="mt-12 text-lg font-semibold text-ink/50">
            {clubs.length === 0
              ? "Tävlingsdatan kunde inte hämtas just nu. Försök igen om en stund."
              : "Ingen klubb matchar sökningen."}
          </p>
        )}

        {groups.map(([county, list]) => (
          <div key={county || "okant"} className="mt-12">
            <Reveal>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-4xl tracking-wide sm:text-5xl">
                  {county ? `${county} län` : "Okänt län"}
                </h2>
                {county && (
                  <Link
                    to={`/tavlingar/lan/${countySlug(county)}`}
                    className="inline-flex items-center gap-1.5 py-2 text-sm font-bold text-forest hover:text-tang"
                  >
                    Tävlingar i {county} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((club, i) => (
                <Reveal key={club.slug} delay={Math.min(i, 6) * 60} className="h-full">
                  <ClubCard club={club} />
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
