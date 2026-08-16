import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Heart, LocateFixed, MapPin, Search } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import { Seo } from "@/components/Seo";
import { CompetitionCard } from "@/components/competitions/CompetitionCard";
import {
  deadlineInfo,
  fetchUpcomingCompetitions,
  monthLabel,
  type UnifiedCompetition,
} from "@/lib/competitionData";
import { formatDistance, sortByDistance, type GeoPoint } from "@/lib/competitionGeo";
import { COUNTIES, nearestCounty } from "@/lib/swedishCounties";
import { useFavoriteCompetitions } from "@/lib/favoriteCompetitions";

const CompetitionMap = lazy(() =>
  import("@/components/competitions/CompetitionMap").then((m) => ({ default: m.CompetitionMap })),
);


type SportFilter = "alla" | "agility" | "hoopers";

export default function CompetitionsPage() {
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<SportFilter>("alla");
  const [county, setCounty] = useState<string>("alla");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "denied">("idle");
  const [userPos, setUserPos] = useState<GeoPoint | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { keys: favoriteKeys, count: favoriteCount } = useFavoriteCompetitions();

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCounty(nearestCounty(pos.coords.latitude, pos.coords.longitude).name);
        setGeoState("idle");
      },
      () => setGeoState("denied"),
      { timeout: 8000 },
    );
  };



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

  const counties = useMemo(
    () => [...new Set(all.map((c) => c.county).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "sv")),
    [all],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (sport !== "alla" && c.sport !== sport) return false;
      if (county !== "alla" && c.county !== county) return false;
      if (onlyFavorites && !favoriteKeys.includes(c.key)) return false;
      if (onlyOpen && deadlineInfo(c.registrationCloses).tone === "closed") return false;
      if (matchOn && !matchCompetition(c, dogProfile).matches) return false;
      if (q) {
        const hay = `${c.name} ${c.club} ${c.location} ${c.county ?? ""} ${c.judges.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, sport, county, onlyOpen, query, onlyFavorites, favoriteKeys, matchOn, dogProfile]);

  const matchCount = useMemo(() => filterMatching(all, dogProfile).length, [all, dogProfile]);


  const groups = useMemo(() => {
    const byMonth = new Map<string, UnifiedCompetition[]>();
    filtered.forEach((c) => {
      const key = monthLabel(c.dateStart);
      byMonth.set(key, [...(byMonth.get(key) ?? []), c]);
    });
    return [...byMonth.entries()];
  }, [filtered]);

  /** Tävlingar i det filtrerade urvalet med koordinat, närmast först. */
  const nearby = useMemo(
    () => (userPos ? sortByDistance(filtered, userPos) : []),
    [filtered, userPos],
  );


  const openCount = useMemo(
    () => all.filter((c) => deadlineInfo(c.registrationCloses).tone !== "closed").length,
    [all],
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Tävlingskalender agility & hoopers 2026 | AgilityManager"
        description="Alla kommande agility- och hooperstävlingar i Sverige: datum, klasser, domare, sista anmälningsdag och plats. Filtrera på sport och län."
        canonicalPath="/tavlingar"
      />
      <SiteNav />
      <PageHero kicker="Tävlingskalender" title="Hitta er nästa start.">
        Agility och hoopers över hela landet — med anmälningsstatus, klasser,
        domare och plats. Uppdateras automatiskt från arrangörernas källor.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            {(["alla", "agility", "hoopers"] as SportFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSport(f)}
                className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                  sport === f
                    ? "border-ink bg-ink text-paper shadow-hard-sm"
                    : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla sporter" : f}
              </button>
            ))}

            <button
              onClick={() => setOnlyOpen((v) => !v)}
              className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all ${
                onlyOpen
                  ? "border-ink bg-forest text-paper shadow-hard-sm"
                  : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
              }`}
            >
              Bara öppen anmälan
            </button>

            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="rounded-full border-2 border-ink/15 bg-paper px-5 py-2.5 text-sm font-bold text-ink/70 transition-colors hover:border-ink focus:border-ink focus:outline-none"
              aria-label="Filtrera på län"
            >
              <option value="alla">Hela Sverige</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={() => setOnlyFavorites((v) => !v)}
              aria-pressed={onlyFavorites}
              className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all ${
                onlyFavorites
                  ? "border-ink bg-ember text-paper shadow-hard-sm"
                  : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
              }`}
            >
              <Heart className={`h-4 w-4 ${onlyFavorites ? "fill-current" : ""}`} />
              Mina favoriter{favoriteCount > 0 ? ` (${favoriteCount})` : ""}
            </button>

            <Link
              to="/tavlingar/favoriter"
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/60 transition-colors hover:border-ink hover:text-ink"
            >
              Öppna favoritlistan <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={locateMe}
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:text-ink"
            >
              <LocateFixed className="h-4 w-4" />
              {geoState === "locating" ? "Söker position…" : "Nära dig"}
            </button>

            <label className="relative ml-auto w-full sm:w-72">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök klubb, ort eller domare"
                className="w-full rounded-full border-2 border-ink/15 bg-paper py-2.5 pl-11 pr-4 text-sm font-semibold placeholder:text-ink/35 focus:border-ink focus:outline-none"
              />
            </label>
          </div>

          <p className="mt-4 text-sm font-semibold text-ink/45">
            {loading
              ? "Hämtar tävlingar…"
              : `${filtered.length} av ${all.length} kommande tävlingar · ${openCount} med öppen anmälan`}
            {geoState === "denied" && " · kunde inte hämta din position — välj län manuellt"}
          </p>
        </Reveal>

        {userPos && nearby.length > 0 && (
          <Reveal className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-4xl tracking-wide">Nära dig</h2>
              <p className="text-sm font-semibold text-ink/45">
                {nearby.length} tävlingar på kartan · närmast {formatDistance(nearby[0].distanceKm)} bort
              </p>
            </div>
            <Suspense
              fallback={
                <div className="mt-5 h-64 animate-pulse rounded-3xl border-2 border-ink/10 bg-ink/5" />
              }
            >
              <CompetitionMap center={userPos} competitions={nearby.slice(0, 60)} className="mt-5" />
            </Suspense>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.slice(0, 6).map((c) => (
                <Link
                  key={c.key}
                  to={c.path}
                  className="flex items-start gap-3 rounded-2xl border-2 border-ink/15 bg-[#FCFAF4] p-4 transition-colors hover:border-ink"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
                  <span>
                    <span className="block text-sm font-bold text-ink">{c.name}</span>
                    <span className="block text-xs font-semibold text-ink/55">
                      {c.location || c.county} · {formatDistance(c.distanceKm)}
                      {c.approximate ? " (ungefärligt)" : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}



        {!loading && groups.length === 0 && (
          <p className="mt-16 text-lg font-semibold text-ink/50">
            {onlyFavorites && favoriteCount === 0
              ? "Du har inga favoriter än — tryck på hjärtat på en tävling för att spara den."
              : "Inga tävlingar matchar filtret."}
          </p>
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

        <Reveal className="mt-20">
          <h2 className="font-display text-4xl tracking-wide">Tävlingar län för län</h2>
          <p className="mt-2 text-sm font-semibold text-ink/45">
            Egen sida per län med kommande agility- och hooperstävlingar.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {COUNTIES.map((c) => (
              <Link
                key={c.slug}
                to={`/tavlingar/lan/${c.slug}`}
                className="rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </Reveal>


        <Reveal className="mt-16">
          <div className="mx-auto grid max-w-4xl items-center gap-8 rounded-3xl border-2 border-ink bg-ink p-8 text-paper shadow-hard sm:p-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="font-display text-4xl leading-[0.95] sm:text-5xl">
                Tävlingar är bättre med en plan.
              </h2>
              <p className="mt-4 leading-relaxed text-paper/60">
                Rita träningsbanan inför starten, dela den med klubben — och få
                tävlingspåminnelser och nya banor i nyhetsbrevet.
              </p>
              <Link to="/banplanerare" className="group mt-5 inline-flex items-center gap-2 font-bold text-tang">
                Öppna planeraren
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </div>
            <EmailCapture variant="dark" compact />
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
