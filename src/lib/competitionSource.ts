// ── Källhänvisning för tävlingsdata ────────────────────────────────────────
// Agilitytävlingarna hämtas från agilitydata.se (Svenska Agilityklubben) och
// hooperstävlingarna från respektive källsida. Källan ska alltid synas där
// datan visas.

export interface CompetitionSource {
  /** Kort namn på källan, t.ex. "agilitydata.se". */
  name: string;
  /** Organisationen bakom källan. */
  organization: string;
  url: string;
}

export const AGILITY_SOURCE: CompetitionSource = {
  name: "agilitydata.se",
  organization: "Svenska Agilityklubben",
  url: "https://agilitydata.se/",
};

export const HOOPERS_SOURCE: CompetitionSource = {
  name: "svenskahoopersklubben.se",
  organization: "Svenska Hoopersklubben",
  url: "https://www.svenskahoopersklubben.se/",
};

/** Källan för en viss tävling. Tävlingens egen källsida används om den finns. */
export function competitionSource(
  sport: "agility" | "hoopers",
  sourceUrl?: string | null,
): CompetitionSource {
  const base = sport === "agility" ? AGILITY_SOURCE : HOOPERS_SOURCE;
  if (!sourceUrl) return base;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return base;
    const host = url.hostname.replace(/^www\./, "");
    return host === base.name.replace(/^www\./, "")
      ? { ...base, url: url.href }
      : { name: host, organization: base.organization, url: url.href };
  } catch {
    return base;
  }
}

export const SOURCE_DISCLAIMER =
  "Uppgifterna hämtas automatiskt och kan vara försenade eller ändrade. Kontrollera alltid hos arrangören innan du anmäler dig.";

/** Källtext för listor med tävlingar från båda sporterna. */
export const LISTING_SOURCE_TEXT = `Tävlingsuppgifter från ${AGILITY_SOURCE.name} (${AGILITY_SOURCE.organization}) och ${HOOPERS_SOURCE.organization}.`;
