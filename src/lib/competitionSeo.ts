// ── Titlar, beskrivningar och strukturerad data för tävlingssidor ──────────
// Delas av React-sidorna och byggets förrendering, så att HTML:en Google
// läser utan JavaScript alltid stämmer med sidan besökaren ser.
import { SITE_ORIGIN } from "./firstByteSeo";
import { longDate, type UnifiedCompetition } from "./competitionData";
import type { CountyInfo } from "./swedishCounties";

export interface PageSeo {
  title: string;
  description: string;
  canonicalPath: string;
}

const year = (now: Date) => now.getFullYear();

export function calendarSeo(now = new Date()): PageSeo {
  return {
    title: `Tävlingskalender agility & hoopers ${year(now)} | AgilityManager`,
    description:
      "Alla kommande agility- och hooperstävlingar i Sverige: datum, klasser, domare, sista anmälningsdag och plats. Filtrera på sport och län.",
    canonicalPath: "/tavlingar",
  };
}

export function clubsSeo(): PageSeo {
  return {
    title: "Agilityklubbar i Sverige — klubbar som arrangerar tävlingar | AgilityManager",
    description:
      "Alla svenska agility- och hoopersklubbar med kommande tävlingar, sorterade per län. Se var klubben tävlar, nästa datum och hur många tävlingar som har öppen anmälan.",
    canonicalPath: "/klubbar",
  };
}

export function countySeo(county: CountyInfo, now = new Date()): PageSeo {
  const label = `${county.name} län`;
  return {
    title: `Agilitytävlingar i ${label} ${year(now)} | AgilityManager`,
    description: `Kommande agility- och hooperstävlingar i ${label}: datum, arrangör, klasser, domare och sista anmälningsdag. Uppdateras automatiskt.`,
    canonicalPath: `/tavlingar/lan/${county.slug}`,
  };
}

export function clubSeo(name: string, slug: string): PageSeo {
  return {
    title: `${name} — kommande tävlingar | AgilityManager`,
    description: `Alla kommande agility- och hooperstävlingar arrangerade av ${name}: datum, plats, klasser, domare och anmälningsstatus.`,
    canonicalPath: `/tavlingar/klubb/${slug}`,
  };
}

export function competitionSeo(comp: UnifiedCompetition): PageSeo & { jsonLd: Record<string, unknown> } {
  const agility = comp.sport === "agility";
  const date = comp.dateStart ? comp.dateStart.slice(0, 10) : "";
  const title = (
    agility
      ? `${comp.name} – ${comp.club || "agilitytävling"}, ${comp.location} ${date}`
      : `${comp.name} – hoopers i ${comp.location} ${date}`
  ).trim();
  const description = `${agility ? "Agilitytävling" : "Hooperstävling"} i ${comp.location || "Sverige"}${
    comp.club ? ` arrangerad av ${comp.club}` : ""
  }${comp.dateStart ? ` den ${longDate(comp.dateStart)}` : ""}. ${
    agility ? "Klasser, domare, sista anmälningsdag och plats." : "Klasser, anmälningstider, pris och kontakt."
  }`;
  return {
    title: title.slice(0, 70),
    description: description.slice(0, 158),
    canonicalPath: comp.path,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: comp.name,
      startDate: comp.dateStart ?? undefined,
      endDate: (agility ? comp.dateEnd : null) ?? comp.dateStart ?? undefined,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      sport: agility ? "Dog agility" : "Dog hoopers",
      location: {
        "@type": "Place",
        name: comp.location || "Sverige",
        address: { "@type": "PostalAddress", addressLocality: comp.location || "", addressCountry: "SE" },
      },
      organizer: comp.club ? { "@type": "Organization", name: comp.club } : undefined,
      url: `${SITE_ORIGIN}${comp.path}`,
    },
  };
}
