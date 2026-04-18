/**
 * Slug-helpers för tävlingsdetalj-sidor.
 *
 * URL-struktur: /tavlingar/[id]/[slug]
 *  - `id` är unik identifierare (från competitions.id eller hoopers competition_id).
 *    Används för exakt routing — om slug ändras eller misstavas hittas tävlingen ändå.
 *  - `slug` är ett SEO-vänligt segment (klubb + plats + datum). Strippas från
 *    åäö och specialtecken. Behöver ej vara unikt.
 *
 * Beslutet att hålla slug separat från `id` (istället för att lagra i DB) gör
 * att vi kan ändra slug-strategin när som helst utan migration.
 */

export function slugify(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é|è|ê/g, "e")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface SlugParts {
  club?: string | null;
  name?: string | null;
  location?: string | null;
  date?: string | null;
}

/**
 * Bygger SEO-slug för tävling. Prioriterar klubb + datum eftersom
 * dessa är mest unika och beskrivande.
 *
 * Exempel: "stockholms-bk-2026-05-15" eller "uppsala-bk-jonkoping-2026-05-15"
 */
export function buildCompetitionSlug({ club, name, location, date }: SlugParts): string {
  const parts: string[] = [];
  if (club) parts.push(slugify(club));
  else if (name) parts.push(slugify(name));
  if (location) parts.push(slugify(location));
  if (date) parts.push(date.slice(0, 10));
  const joined = parts.filter(Boolean).join("-");
  return joined || "tavling";
}

/** Hoopers-prefix används för att skilja sport i route. */
export function buildAgilityCompetitionPath(id: string, parts: SlugParts): string {
  return `/tavlingar/${encodeURIComponent(id)}/${buildCompetitionSlug(parts)}`;
}

export function buildHoopersCompetitionPath(id: string, parts: SlugParts): string {
  return `/tavlingar/hoopers/${encodeURIComponent(id)}/${buildCompetitionSlug(parts)}`;
}
