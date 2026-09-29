// ── Klubbkatalog byggd från tävlingsdatan ─────────────────────────────────
import { registrationOpen, type UnifiedCompetition } from "./competitionData";
import { slugify } from "./competitionSlug";

export interface ClubSummary {
  slug: string;
  /** Vanligaste stavningen av klubbnamnet i datan. */
  name: string;
  county: string | null;
  sports: ("agility" | "hoopers")[];
  upcoming: number;
  openRegistration: number;
  /** Datum (YYYY-MM-DD) för klubbens nästa tävling. */
  nextDate: string | null;
  locations: string[];
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, n] of counts) {
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

/** Samlar tävlingarna per arrangerande klubb. Tävlingar utan klubb hoppas över. */
export function buildClubDirectory(comps: UnifiedCompetition[]): ClubSummary[] {
  const byClub = new Map<string, UnifiedCompetition[]>();
  for (const c of comps) {
    const slug = slugify(c.club);
    if (!slug) continue;
    byClub.set(slug, [...(byClub.get(slug) ?? []), c]);
  }
  return [...byClub.entries()]
    .map(([slug, list]) => {
      const dates = list.map((c) => c.dateStart?.slice(0, 10)).filter((d): d is string => !!d).sort();
      return {
        slug,
        name: mostCommon(list.map((c) => c.club.trim())) ?? slug,
        county: mostCommon(list.map((c) => c.county).filter((c): c is string => !!c)),
        sports: (["agility", "hoopers"] as const).filter((s) => list.some((c) => c.sport === s)),
        upcoming: list.length,
        openRegistration: list.filter((c) => registrationOpen(c.registrationCloses)).length,
        nextDate: dates[0] ?? null,
        locations: [...new Set(list.map((c) => c.location.trim()).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, "sv"),
        ),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/** Grupperar klubbar per län, i bokstavsordning med "Okänt län" sist. */
export function groupClubsByCounty(clubs: ClubSummary[]): [string, ClubSummary[]][] {
  const groups = new Map<string, ClubSummary[]>();
  for (const club of clubs) {
    const key = club.county ?? "";
    groups.set(key, [...(groups.get(key) ?? []), club]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, "sv");
  });
}

/** Matchar på klubbnamn, ort och län, oberoende av åäö och skiftläge. */
export function filterClubs(clubs: ClubSummary[], query: string): ClubSummary[] {
  const q = slugify(query);
  if (!q) return clubs;
  return clubs.filter((c) =>
    [c.name, c.county ?? "", ...c.locations].some((field) => slugify(field).includes(q)),
  );
}
