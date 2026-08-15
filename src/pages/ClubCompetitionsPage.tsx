import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { CompetitionLanding } from "@/components/competitions/CompetitionLanding";
import { slugify } from "@/lib/competitionSlug";
import { countySlug } from "@/lib/swedishCounties";
import type { UnifiedCompetition } from "@/lib/competitionData";

export default function ClubCompetitionsPage() {
  const { clubSlug } = useParams<{ clubSlug: string }>();

  const match = useCallback(
    (c: UnifiedCompetition) => !!clubSlug && slugify(c.club) === clubSlug.toLowerCase(),
    [clubSlug],
  );

  const readable = (clubSlug ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

  return (
    <CompetitionLanding
      kicker="Arrangör"
      title={`${readable || "Klubbens"} tävlingar.`}
      intro={`Kommande agility- och hooperstävlingar arrangerade av ${readable || "klubben"} — datum, klasser, domare och sista anmälningsdag.`}
      seoTitle={`${readable} — kommande tävlingar | AgilityManager`}
      seoDescription={`Alla kommande agility- och hooperstävlingar arrangerade av ${readable}: datum, plats, klasser, domare och anmälningsstatus.`}
      canonicalPath={`/tavlingar/klubb/${(clubSlug ?? "").toLowerCase()}`}
      match={match}
      emptyText={`Inga kommande tävlingar från ${readable || "klubben"} just nu.`}
    >
      {(comps) => {
        const county = comps.find((c) => c.county)?.county;
        if (!county) return null;
        return (
          <div className="mt-14">
            <Link
              to={`/tavlingar/lan/${countySlug(county)}`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-5 py-2.5 text-sm font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5"
            >
              Se alla tävlingar i {county} län
            </Link>
          </div>
        );
      }}
    </CompetitionLanding>
  );
}
