import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowRight, Check, Share2 } from "lucide-react";
import { CompetitionLanding } from "@/components/competitions/CompetitionLanding";
import { SITE_URL } from "@/components/Seo";
import { buildClubDirectory } from "@/lib/clubs";
import { slugify } from "@/lib/competitionSlug";
import { countySlug } from "@/lib/swedishCounties";
import type { UnifiedCompetition } from "@/lib/competitionData";

function ShareButton({ name, path }: { name: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}${path}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — tävlingar`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* avbruten delning eller blockerat urklipp — inget att göra */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-tang px-5 py-2.5 text-sm font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Länken är kopierad" : "Dela klubbens tävlingar"}
    </button>
  );
}

export default function ClubCompetitionsPage() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const slug = (clubSlug ?? "").toLowerCase();
  const path = `/tavlingar/klubb/${slug}`;

  const match = useCallback(
    (c: UnifiedCompetition) => !!slug && slugify(c.club) === slug,
    [slug],
  );

  // Namnet ur adressen används bara tills tävlingarna har hämtats.
  const readable = slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
  const nameFor = (comps: UnifiedCompetition[]) => buildClubDirectory(comps)[0]?.name ?? readable;

  return (
    <CompetitionLanding
      kicker="Arrangör"
      title={(comps) => `${nameFor(comps) || "Klubbens"} tävlingar.`}
      intro={(comps) =>
        `Kommande agility- och hooperstävlingar arrangerade av ${nameFor(comps) || "klubben"} — datum, klasser, domare och sista anmälningsdag.`
      }
      seoTitle={(comps) => `${nameFor(comps)} — kommande tävlingar | AgilityManager`}
      seoDescription={(comps) =>
        `Alla kommande agility- och hooperstävlingar arrangerade av ${nameFor(comps)}: datum, plats, klasser, domare och anmälningsstatus.`
      }
      canonicalPath={path}
      match={match}
      emptyText={(comps) => `Inga kommande tävlingar från ${nameFor(comps) || "klubben"} just nu.`}
    >
      {(comps) => {
        const club = buildClubDirectory(comps)[0];
        const judges = [...new Set(comps.flatMap((c) => c.judges).map((j) => j.trim()).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, "sv"),
        );
        return (
          <div className="mt-14 space-y-8">
            {club && (
              <dl className="grid grid-cols-1 gap-4 rounded-3xl border-2 border-ink/15 bg-cream/40 p-6 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-wider text-ink/45">Tävlar i</dt>
                  <dd className="mt-1 font-bold [overflow-wrap:anywhere]">{club.locations.join(", ") || "Okänd ort"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-extrabold uppercase tracking-wider text-ink/45">Sporter</dt>
                  <dd className="mt-1 font-bold capitalize">{club.sports.join(" & ")}</dd>
                </div>
                {judges.length > 0 && (
                  <div>
                    <dt className="text-xs font-extrabold uppercase tracking-wider text-ink/45">Domare</dt>
                    <dd className="mt-1 font-bold [overflow-wrap:anywhere]">{judges.slice(0, 6).join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="flex flex-wrap gap-3">
              {club && <ShareButton name={club.name} path={path} />}
              {club?.county && (
                <Link
                  to={`/tavlingar/lan/${countySlug(club.county)}`}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-5 py-2.5 text-sm font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5"
                >
                  Alla tävlingar i {club.county} län
                </Link>
              )}
              <Link
                to="/klubbar"
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/70 hover:border-ink hover:text-ink"
              >
                Alla klubbar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        );
      }}
    </CompetitionLanding>
  );
}
