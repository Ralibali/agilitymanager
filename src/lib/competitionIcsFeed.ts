// ── iCal-export av flera tävlingar på en gång ──────────────────────────────
import type { UnifiedCompetition } from "./competitionData";

export const ICS_SITE_URL = "https://agilitymanager.se";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(iso: string, addDays = 0): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Radbrytning enligt RFC 5545 (max 75 oktetter per rad). */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

export interface IcsFeedOptions {
  /** Kalenderns namn i mobilens kalenderapp. */
  calendarName?: string;
  /** Tidsstämpel, injicerbar för tester. */
  now?: Date;
  /** Bas-URL för länkar i beskrivningen. */
  siteUrl?: string;
}

function stamp(now: Date): string {
  return `${now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** Bygger en iCal-fil med ett VEVENT per tävling: datum, arrangör och plats. */
export function buildIcsFeed(
  comps: UnifiedCompetition[],
  { calendarName = "AgilityManager – matchande tävlingar", now = new Date(), siteUrl = ICS_SITE_URL }: IcsFeedOptions = {},
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgilityManager//Tavlingskalender//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];

  comps
    .filter((c) => Boolean(c.dateStart))
    .forEach((c) => {
      const start = c.dateStart as string;
      const end = c.dateEnd ?? start;
      const url = `${siteUrl}${c.path}`;
      const details = [
        c.club ? `Arrangör: ${c.club}` : null,
        c.location ? `Plats: ${c.location}${c.county ? `, ${c.county} län` : ""}` : null,
        c.classes.length ? `Klasser: ${c.classes.join(", ")}` : null,
        c.registrationCloses ? `Sista anmälningsdag: ${c.registrationCloses}` : null,
        url,
      ]
        .filter(Boolean)
        .join("\n");

      lines.push(
        "BEGIN:VEVENT",
        `UID:${c.sport}-${c.id}@agilitymanager.se`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART;VALUE=DATE:${icsDate(start)}`,
        `DTEND;VALUE=DATE:${icsDate(end, 1)}`,
        `SUMMARY:${icsEscape(c.name)}`,
        `LOCATION:${icsEscape([c.location, c.county ? `${c.county} län` : "", c.club].filter(Boolean).join(", "))}`,
        `DESCRIPTION:${icsEscape(details)}`,
        `URL:${url}`,
        "END:VEVENT",
      );
    });

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n");
}

/** Antal tävlingar som faktiskt hamnar i filen (kräver startdatum). */
export function icsFeedCount(comps: UnifiedCompetition[]): number {
  return comps.filter((c) => Boolean(c.dateStart)).length;
}

/** Filnamn baserat på hundens profilnamn. */
export function icsFeedFilename(profileName: string): string {
  const slug = profileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `agilitymanager-tavlingar${slug ? `-${slug}` : ""}.ics`;
}
