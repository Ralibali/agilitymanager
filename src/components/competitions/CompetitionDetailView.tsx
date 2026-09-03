import { Link } from "react-router";
import { ArrowLeft, ArrowRight, CalendarPlus, ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { CompetitionCard } from "./CompetitionCard";
import { FavoriteButton } from "./FavoriteButton";
import { MatchExplainer } from "./MatchExplainer";
import {
  buildIcs,
  dateRange,
  deadlineInfo,
  downloadIcs,
  longDate,
  relativeUpdated,
  type UnifiedCompetition,
} from "@/lib/competitionData";
import { SITE_URL } from "@/components/Seo";
import { countySlug } from "@/lib/swedishCounties";
import { slugify } from "@/lib/competitionSlug";

const TONE_STYLE: Record<string, string> = {
  open: "bg-forest text-paper",
  urgent: "bg-tang text-ink",
  closed: "bg-ink/10 text-ink/50",
  unknown: "bg-ink/10 text-ink/55",
};

export interface DetailFact {
  label: string;
  value: string;
}

export function CompetitionDetailView({
  comp,
  facts,
  updatedAt,
  related,
  notes,
}: {
  comp: UnifiedCompetition;
  facts: DetailFact[];
  updatedAt: string | null;
  related: UnifiedCompetition[];
  notes?: string;
}) {
  const deadline = deadlineInfo(comp.registrationCloses);
  const provisional = (comp.status ?? "").toLowerCase().includes("ansökt");

  const handleIcs = () => {
    downloadIcs(
      `${comp.sport}-${comp.id}`,
      buildIcs({
        id: `${comp.sport}-${comp.id}`,
        name: comp.name,
        club: comp.club,
        location: comp.location,
        dateStart: comp.dateStart,
        dateEnd: comp.dateEnd,
        url: `${SITE_URL}${comp.path}`,
        description: `${comp.name} — ${comp.club || "arrangör okänd"}, ${comp.location}. Se detaljer på AgilityManager: ${SITE_URL}${comp.path}`,
      }),
    );
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteNav />

      <section className="relative overflow-hidden border-b-2 border-ink pt-[6.5rem]">
        <div className="field-grid pointer-events-none absolute inset-0 [background-size:56px_56px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:pb-16">
          <Link
            to="/tavlingar"
            className="inline-flex items-center gap-2 text-sm font-bold text-ink/60 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Alla tävlingar
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-wider ${TONE_STYLE[deadline.tone]}`}>
              {deadline.label}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-wider ${
                comp.sport === "agility" ? "bg-forest/10 text-forest" : "bg-tang/20 text-ember"
              }`}
            >
              {comp.sport}
            </span>
            {provisional && (
              <span className="rounded-full border-2 border-ink/20 px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-wider text-ink/55">
                Ej fastställd — status “{comp.status}”
              </span>
            )}
          </div>

          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[1.02] tracking-[0.01em] sm:text-7xl">
            {comp.name}
          </h1>

          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-lg font-semibold text-ink/65">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-forest" />
              {comp.location || "Plats ej angiven"}
              {comp.county && (
                <>
                  {" · "}
                  <Link to={`/tavlingar/lan/${countySlug(comp.county)}`} className="underline decoration-2 underline-offset-4 hover:text-ink">
                    {comp.county} län
                  </Link>
                </>
              )}
            </span>
            <span>{dateRange(comp.dateStart, comp.dateEnd)}</span>
            {comp.club && (
              <Link
                to={`/tavlingar/klubb/${slugify(comp.club)}`}
                className="underline decoration-2 underline-offset-4 hover:text-ink"
              >
                Alla tävlingar från {comp.club}
              </Link>
            )}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={handleIcs}
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-6 py-3 text-sm font-bold text-paper shadow-hard-sm transition-transform hover:-translate-y-0.5"
            >
              <CalendarPlus className="h-4 w-4" /> Lägg i kalendern
            </button>
            <FavoriteButton compKey={comp.key} variant="pill" />
            <Link
              to="/banplanerare"
              className="group inline-flex items-center gap-2 rounded-full border-2 border-ink bg-tang px-6 py-3 text-sm font-bold text-ink shadow-hard-sm transition-transform hover:-translate-y-0.5"
            >
              Rita träningsbanan inför starten
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {comp.sourceUrl && (
              <a
                href={comp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                Till anmälan <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink/45">
            <RefreshCw className="h-4 w-4" /> {relativeUpdated(updatedAt)} · data hämtas automatiskt från arrangörens källa
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <div className="rounded-3xl border-2 border-ink bg-[#FCFAF4] p-6 shadow-hard sm:p-8">
              <h2 className="font-display text-4xl tracking-wide">Tävlingsinformation</h2>
              <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {facts.map((f) => (
                  <div key={f.label} className="border-t-2 border-dashed border-ink/10 pt-3">
                    <dt className="text-[0.72rem] font-extrabold uppercase tracking-wider text-ink/45">{f.label}</dt>
                    <dd className="mt-1 text-base font-semibold leading-snug">{f.value}</dd>
                  </div>
                ))}
              </dl>

              {comp.classes.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-[0.72rem] font-extrabold uppercase tracking-wider text-ink/45">Klasser</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {comp.classes.map((c) => (
                      <span key={c} className="rounded-full border-2 border-ink/15 px-3 py-1 text-sm font-bold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8">
                <MatchExplainer comp={comp} variant="detail" />
              </div>

              {notes && <p className="mt-8 whitespace-pre-line leading-relaxed text-ink/70">{notes}</p>}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-3xl border-2 border-ink bg-ink p-6 text-paper shadow-hard sm:p-8">
              <h2 className="font-display text-4xl leading-[1.02]">Planera fram till start.</h2>
              <ul className="mt-5 space-y-3 text-paper/70">
                <li>• Rita banan du vill träna inför tävlingen — gratis, direkt i webbläsaren.</li>
                <li>• Spara tävlingen i kalendern och håll koll på sista anmälningsdag ({comp.registrationCloses ? longDate(comp.registrationCloses) : "ej angiven"}).</li>
                <li>• Dela banan med klubben inför gemensam träning.</li>
              </ul>
              <Link
                to="/banplanerare"
                className="group mt-6 inline-flex items-center gap-2 font-bold text-tang"
              >
                Öppna banplaneraren
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </div>
          </Reveal>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <Reveal>
              <h2 className="font-display text-5xl tracking-wide">Fler tävlingar i närheten</h2>
              <div className="mt-3 h-0.5 w-full bg-ink/10" />
            </Reveal>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.key} delay={i * 70}>
                  <CompetitionCard comp={r} />
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
