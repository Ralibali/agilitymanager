import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { CompetitionLanding } from "@/components/competitions/CompetitionLanding";
import { NotFound } from "./NotFound";
import { COUNTIES, countyFromSlug, countySlug } from "@/lib/swedishCounties";
import type { UnifiedCompetition } from "@/lib/competitionData";

export default function CountyCompetitionsPage() {
  const { countySlug: slug } = useParams<{ countySlug: string }>();
  const county = countyFromSlug(slug);

  const match = useCallback(
    (c: UnifiedCompetition) => !!county && countySlug(c.county) === county.slug,
    [county],
  );

  if (!county) return <NotFound />;

  const label = `${county.name} län`;

  return (
    <CompetitionLanding
      kicker="Tävlingar i länet"
      title={`Agility & hoopers i ${county.name}.`}
      intro={`Alla kommande agility- och hooperstävlingar i ${label} — med datum, klasser, domare och sista anmälningsdag. Listan uppdateras automatiskt från arrangörernas källor.`}
      seoTitle={`Agilitytävlingar i ${label} 2026 | AgilityManager`}
      seoDescription={`Kommande agility- och hooperstävlingar i ${label}: datum, arrangör, klasser, domare och sista anmälningsdag. Uppdateras automatiskt.`}
      canonicalPath={`/tavlingar/lan/${county.slug}`}
      match={match}
      emptyText={`Inga kommande tävlingar i ${label} just nu — kolla hela kalendern eller ett grannlän.`}
    >
      {() => (
        <div className="mt-16">
          <h2 className="font-display text-4xl tracking-wide">Tävlingar i andra län</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {COUNTIES.filter((c) => c.slug !== county.slug).map((c) => (
              <Link
                key={c.slug}
                to={`/tavlingar/lan/${c.slug}`}
                className="rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-bold text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </CompetitionLanding>
  );
}
