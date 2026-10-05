// ── Titlar, beskrivningar och strukturerad data för tävlingssidor ──────────
// Delas av React-sidorna och byggets förrendering, så att HTML:en Google
// läser utan JavaScript alltid stämmer med sidan besökaren ser.
import { SITE_ORIGIN } from "./firstByteSeo";
import { deadlineInfo, longDate, registrationOpen, type UnifiedCompetition } from "./competitionData";
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

function shortDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

/** Kortar av vid ett ordslut så att beskrivningen inte slutar mitt i ett ord. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).replace(/[,.;:–-]+$/, "")}…`;
}

export function competitionSeo(
  comp: UnifiedCompetition,
  now = new Date(),
): PageSeo & { jsonLd: Record<string, unknown> } {
  const agility = comp.sport === "agility";
  const kind = agility ? "agilitytävling" : "hooperstävling";
  const where = comp.location || "Sverige";
  const when = comp.dateStart ? shortDateLabel(comp.dateStart) : "";
  // Namnet först – det är vad folk söker på. Sport, ort och datum gör
  // träffen begriplig i sökresultatet även när namnet är kort.
  const full = `${comp.name} – ${kind} i ${where}${when ? `, ${when}` : ""}`;
  const title = full.length <= 70 ? full : `${comp.name}, ${where}${when ? ` ${when}` : ""}`;

  const today = now.toISOString().slice(0, 10);
  const past = !!comp.dateStart && comp.dateStart.slice(0, 10) < today;
  const status = past
    ? "Tävlingen är genomförd."
    : registrationOpen(comp.registrationCloses, now) && comp.registrationCloses
      ? `Sista anmälningsdag ${shortDateLabel(comp.registrationCloses)}.`
      : deadlineInfo(comp.registrationCloses, now).tone === "closed"
        ? "Anmälan är stängd."
        : "";
  const description = [
    `${agility ? "Agilitytävling" : "Hooperstävling"} i ${where}${comp.dateStart ? ` ${longDate(comp.dateStart)}` : ""}${
      comp.club ? `, arrangerad av ${comp.club}` : ""
    }.`,
    status,
    past
      ? "Klasser, domare och arrangörens information."
      : agility
        ? "Klasser, domare och länk till anmälan."
        : "Klasser, pris och länk till anmälan.",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: clip(title, 70),
    description: clip(description, 158),
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
