import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarPlus, Heart, LocateFixed, MapPin, Search } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import { Seo, SITE_URL } from "@/components/Seo";
import { CompetitionCard } from "@/components/competitions/CompetitionCard";
import {
  deadlineInfo,
  downloadIcs,
  fetchUpcomingCompetitions,
  monthLabel,
  type UnifiedCompetition,
} from "@/lib/competitionData";
import { formatDistance, sortByDistance, type GeoPoint } from "@/lib/competitionGeo";
import { COUNTIES, nearestCounty } from "@/lib/swedishCounties";
import { useFavoriteCompetitions } from "@/lib/favoriteCompetitions";
import { filterMatching, matchCompetition, sortByMatchScore, useDogProfile } from "@/lib/dogMatch";
import { useDogProfileSync } from "@/lib/dogMatchSync";
import { DogMatchPanel } from "@/components/competitions/DogMatchPanel";
import { ProfileQuickSwitch } from "@/components/competitions/ProfileQuickSwitch";
import { readFilterPrefs, writeFilterPrefs } from "@/lib/competitionFilterPrefs";

import { buildIcsFeed, icsFeedCount, icsFeedFilename } from "@/lib/competitionIcsFeed";


const CompetitionMap = lazy(() =>
  import("@/components/competitions/CompetitionMap").then((m) => ({ default: m.CompetitionMap })),
);


type SportFilter = "alla" | "agility" | "hoopers";

export default function CompetitionsPage() {
  const initialPrefs = useMemo(() => readFilterPrefs(), []);
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sport, setSport] = useState<SportFilter>(initialPrefs.sport);
  const [county, setCounty] = useState<string>(initialPrefs.county);
  const [onlyOpen, setOnlyOpen] = useState(initialPrefs.onlyOpen);
  const [query, setQuery] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "denied">("idle");
  const [userPos, setUserPos] = useState<GeoPoint | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(initialPrefs.onlyFavorites);
  const [matchOn, setMatchOn] = useState(initialPrefs.matchOn);
  const [sortMode, setSortMode] = useState<"datum" | "match">("datum");

  useEffect(() => {
    writeFilterPrefs({ sport, county, onlyOpen, onlyFavorites, matchOn });
  }, [sport, county, onlyOpen, onlyFavorites, matchOn]);

  const {
    profile: dogProfile,
    profiles: dogProfiles,
    activeId: dogProfileId,
    update: updateDogProfile,
    select: selectDogProfile,
    add: addDogProfile,
    duplicate: duplicateDogProfile,
    remove: removeDogProfile,
    canAdd: canAddDogProfile,
  } = useDogProfile();

  const { state: syncState } = useDogProfileSync();


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



  /** Hämtar listan. Vid omladdning behålls befintliga siffror så de aldrig blinkar bort. */
  const loadCompetitions = useCallback((mode: "initial" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    let cancelled = false;
    fetchUpcomingCompetitions()
      .then((list) => {
        if (!cancelled) setAll(list);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadCompetitions("initial"), [loadCompetitions]);

  const counties = useMemo(
    () => [...new Set(all.map((c) => c.county).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "sv")),
    [all],
  );

  /** Urval utan matchningsfiltret – bas för alla live-räknare. */
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (county !== "alla" && c.county !== county) return false;
      if (onlyFavorites && !favoriteKeys.includes(c.key)) return false;
      if (onlyOpen && deadlineInfo(c.registrationCloses).tone === "closed") return false;
      if (q) {
        const hay = `${c.name} ${c.club} ${c.location} ${c.county ?? ""} ${c.judges.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, county, onlyOpen, query, onlyFavorites, favoriteKeys]);

  const filtered = useMemo(
    () =>
      base.filter((c) => {
        if (sport !== "alla" && c.sport !== sport) return false;
        if (matchOn && !matchCompetition(c, dogProfile).matches) return false;
        return true;
      }),
    [base, sport, matchOn, dogProfile],
  );

  const matchCount = useMemo(() => filterMatching(base, dogProfile).length, [base, dogProfile]);

  /** Antal matchande tävlingar per sparad profil inom nuvarande filter. */
  const profileCounts = useMemo(() => {
    const map: Record<string, number> = {};
    dogProfiles.forEach((p) => {
      map[p.id] = filterMatching(base, p).length;
    });
    return map;
  }, [base, dogProfiles]);


  /** Tävlingar som hamnar i iCal-filen: matchande inom nuvarande filter. */
  const icsList = useMemo(
    () => (matchOn ? filtered : filterMatching(filtered, dogProfile)),
    [matchOn, filtered, dogProfile],
  );
  const icsCount = useMemo(() => icsFeedCount(icsList), [icsList]);

  /** Laddar ner de filtrerade tävlingarna som en iCal-fil till mobilkalendern. */
  const exportIcsFeed = () => {
    if (icsList.length === 0) return;
    downloadIcs(
      icsFeedFilename(dogProfile.name),
      buildIcsFeed(icsList, {
        calendarName: `AgilityManager – tävlingar för ${dogProfile.name.trim() || "din hund"}`,
        siteUrl: SITE_URL,
      }),
    );
  };

  /** Aktiverar matchning för en profil och sätter sportfiltret därefter. */
  const activateProfile = (id: string) => {
    const next = dogProfiles.find((p) => p.id === id);
    selectDogProfile(id);
    setMatchOn(true);
    if (next) setSport(next.sport);
  };


  /** Tävlingar sorterade efter matchstyrka mot aktiv hundprofil. */
  const ranked = useMemo(() => sortByMatchScore(filtered, dogProfile), [filtered, dogProfile]);

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
        <Reveal className="mb-8">
          <DogMatchPanel
            profile={dogProfile}
            profiles={dogProfiles}
            activeId={dogProfileId}
            onSelect={(id) => {
              selectDogProfile(id);
              const next = dogProfiles.find((p) => p.id === id);
              if (matchOn && next) setSport(next.sport);
            }}
            onAdd={addDogProfile}
            onDuplicate={duplicateDogProfile}
            onRemove={removeDogProfile}
            canAdd={canAddDogProfile}
            onChange={updateDogProfile}
            active={matchOn}
            onToggle={(next) => {
              setMatchOn(next);
              if (next) setSport(dogProfile.sport);
            }}
            matchCount={matchCount}
            loading={loading}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {syncState === "synced"
              ? "Dina matchningsprofiler är sparade på ditt konto och följer med till andra enheter."
              : syncState === "syncing"
                ? "Synkar dina matchningsprofiler med ditt konto …"
                : syncState === "error"
                  ? "Kunde inte synka profilerna just nu — de sparas ändå i den här webbläsaren."
                  : "Profilerna sparas i den här webbläsaren. Logga in för att synka dem mellan enheter."}
          </p>
        </Reveal>


        <Reveal className="mb-6">
          <ProfileQuickSwitch
            profiles={dogProfiles}
            activeId={dogProfileId}
            active={matchOn}
            counts={profileCounts}
            onActivate={activateProfile}
            onDuplicate={duplicateDogProfile}
            onRemove={removeDogProfile}
            onAdd={addDogProfile}
            canAdd={canAddDogProfile}

            onClear={() => {
              setMatchOn(false);
              setSport("alla");
            }}
            loading={loading}
          />
        </Reveal>

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

            <div className="inline-flex overflow-hidden rounded-full border-2 border-ink/15">
              {(["datum", "match"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSortMode(m)}
                  aria-pressed={sortMode === m}
                  className={`px-4 py-2.5 text-sm font-bold transition-colors ${
                    sortMode === m ? "bg-ink text-paper" : "bg-paper text-ink/60 hover:text-ink"
                  }`}
                >
                  {m === "datum" ? "Datum" : "Matchstyrka"}
                </button>
              ))}
            </div>

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
              onClick={exportIcsFeed}
              disabled={icsCount === 0}
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-tang px-5 py-2.5 text-sm font-bold text-ink shadow-hard-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-ink/15 disabled:bg-paper disabled:text-ink/35 disabled:shadow-none"
            >
              <CalendarPlus className="h-4 w-4" />
              Lägg matchande i kalendern{icsCount > 0 ? ` (${icsCount})` : ""}
            </button>

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

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p aria-live="polite" className="text-sm font-semibold text-ink/45">
              {loading && all.length === 0
                ? "Hämtar tävlingar…"
                : `${filtered.length} av ${all.length} kommande tävlingar · ${openCount} med öppen anmälan`}
              {matchOn &&
                ` · matchade mot ${dogProfile.name.trim() || "din hund"} (${
                  dogProfile.sport === "agility" ? dogProfile.agilityLevel : dogProfile.hoopersLevel
                }, ${dogProfile.size})`}
              {refreshing && all.length > 0 && " · uppdaterar i bakgrunden…"}
              {geoState === "denied" && " · kunde inte hämta din position — välj län manuellt"}
            </p>
            <button
              onClick={() => loadCompetitions("refresh")}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1 text-xs font-bold text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Uppdatera listan
            </button>
          </div>

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
              : matchOn
                ? "Inga tävlingar matchar hundens klass just nu — prova en annan klass eller stäng av matchningen."
                : "Inga tävlingar matchar filtret."}

          </p>
        )}


        {sortMode === "match" && ranked.length > 0 && (
          <div className="mt-14">
            <Reveal>
              <h2 className="font-display text-5xl tracking-wide">Bäst match först</h2>
              <p className="mt-2 text-sm font-semibold text-ink/45">
                Rangordnat mot {dogProfile.name.trim() || "din hund"} — sport, klass och storlek.
              </p>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {ranked.map((c, i) => (
                <Reveal key={c.key} delay={Math.min(i, 6) * 70}>
                  <CompetitionCard comp={c} />
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {sortMode === "datum" && groups.map(([month, comps]) => (
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
