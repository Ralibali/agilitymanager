// ── Gamla adresser som Google fortfarande rankar ──────────────────────────
// Sidorna togs bort i redesignen (augusti 2026) men har visningar och klick i
// Search Console. Varje adress leder till närmaste befintliga innehåll.
// Byggsteget skriver även en statisk omdirigeringssida per fast adress, så
// att flytten syns utan JavaScript (Lovable-hostingen saknar 301-regler).
import { countyFromSlug, countySlug } from "./swedishCounties";

/** Fasta gamla adresser → ny adress. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/blogg/agility-regler-sverige": "/blogg/regelverk-agility-hoopers-sverige",
  "/hoopers-regler": "/blogg/regelverk-agility-hoopers-sverige",
  "/hoopers": "/blogg/hoopers-for-nyborjare",
  // Tunna äldre hoopersartiklar med samma sökavsikt som den befintliga guiden.
  "/blogg/hoopers-hund": "/blogg/hoopers-for-nyborjare",
  "/blogg/borja-med-hoopers": "/blogg/hoopers-for-nyborjare",
  "/klubb": "/klubbar",
  "/coach": "/instruktor",
  "/hjalp/resultathamtning": "/resultat",
};

/** Gamla kalenderfilter (?region=gotland) leder till länssidan. */
export function legacyCalendarPath(search: URLSearchParams): string | null {
  const region = search.get("region");
  if (!region) return null;
  const county = countyFromSlug(countySlug(region));
  return county ? `/tavlingar/lan/${county.slug}` : null;
}
