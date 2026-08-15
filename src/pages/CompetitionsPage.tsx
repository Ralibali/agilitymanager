import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, LocateFixed, Search } from "lucide-react";
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

type SportFilter = "alla" | "agility" | "hoopers";

export default function CompetitionsPage() {
  const [all, setAll] = useState<UnifiedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<SportFilter>("alla");
  const [county, setCounty] = useState<string>("alla");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState("");

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
      if (onlyOpen && deadlineInfo(c.registrationCloses).tone === "closed") return false;
      if (q) {
        const hay = `${c.name} ${c.club} ${c.location} ${c.county ?? ""} ${c.judges.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, sport, county, onlyOpen, query]);

  const groups = useMemo(() => {
    const byMonth = new Map<string, UnifiedCompetition[]>();
    filtered.forEach((c) => {
      const key = monthLabel(c.dateStart);
      byMonth.set(key, [...(byMonth.get(key) ?? []), c]);
    });
    return [...byMonth.entries()];
  }, [filtered]);

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
          </p>
        </Reveal>

        {!loading && groups.length === 0 && (
          <p className="mt-16 text-lg font-semibold text-ink/50">Inga tävlingar matchar filtret.</p>
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
