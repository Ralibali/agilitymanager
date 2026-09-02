// ── Tävlingsdata: typer, hämtning och presentationshjälp ───────────────────
import { supabase } from "@/integrations/supabase/client";
import { getCountyForLocation } from "./swedishCityCounty";
import { buildCompetitionSlug } from "./competitionSlug";

export interface AgilityCompetition {
  id: string;
  competition_name: string | null;
  club_name: string | null;
  location: string | null;
  region: string | null;
  indoor_outdoor: string | null;
  date_start: string | null;
  date_end: string | null;
  last_registration_date: string | null;
  classes_agility: string[] | null;
  classes_hopp: string[] | null;
  classes_other: string[] | null;
  judges: string[] | null;
  status: string | null;
  status_code: string | null;
  source_url: string | null;
  fetched_at: string | null;
  sport: string | null;
}

export interface HoopersCompetition {
  id: string;
  competition_id: string;
  competition_name: string | null;
  club_name: string | null;
  organizer: string | null;
  location: string | null;
  county: string | null;
  date: string | null;
  type: string | null;
  classes: string[] | null;
  price_per_lopp: string | null;
  registration_opens: string | null;
  registration_closes: string | null;
  registration_status: string | null;
  contact_person: string | null;
  contact_email: string | null;
  judge: string | null;
  source_url: string | null;
  extra_info: string | null;
  fetched_at: string | null;
}

/** Enhetlig vy som både agility- och hooperstävlingar mappas till. */
export interface UnifiedCompetition {
  key: string;
  id: string;
  sport: "agility" | "hoopers";
  name: string;
  club: string;
  location: string;
  county: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  registrationCloses: string | null;
  classes: string[];
  judges: string[];
  status: string | null;
  sourceUrl: string | null;
  path: string;
}

export const AGILITY_SELECT =
  "id,competition_name,club_name,location,region,indoor_outdoor,date_start,date_end,last_registration_date,classes_agility,classes_hopp,classes_other,judges,status,status_code,source_url,fetched_at,sport";

export const HOOPERS_SELECT =
  "id,competition_id,competition_name,club_name,organizer,location,county,date,type,classes,price_per_lopp,registration_opens,registration_closes,registration_status,contact_person,contact_email,judge,source_url,extra_info,fetched_at";

/** Rensar HTML/entiteter som följer med från källsidorna. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/<[^<>]*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function agilityToUnified(c: AgilityCompetition): UnifiedCompetition {
  const name = stripHtml(c.competition_name) || "Agilitytävling";
  const club = stripHtml(c.club_name);
  const location = stripHtml(c.location);
  return {
    key: `a-${c.id}`,
    id: c.id,
    sport: "agility",
    name,
    club,
    location,
    county: c.region || getCountyForLocation(location),
    dateStart: c.date_start,
    dateEnd: c.date_end,
    registrationCloses: c.last_registration_date,
    classes: [...(c.classes_agility ?? []), ...(c.classes_hopp ?? []), ...(c.classes_other ?? [])],
    judges: (c.judges ?? []).map(stripHtml).filter(Boolean),
    status: c.status,
    sourceUrl: c.source_url,
    path: `/tavlingar/${encodeURIComponent(c.id)}/${buildCompetitionSlug({
      club,
      name,
      location,
      date: c.date_start,
    })}`,
  };
}

export function hoopersToUnified(c: HoopersCompetition): UnifiedCompetition {
  const name = stripHtml(c.competition_name) || "Hooperstävling";
  const club = stripHtml(c.club_name || c.organizer);
  const location = stripHtml(c.location);
  return {
    key: `h-${c.competition_id}`,
    id: c.competition_id,
    sport: "hoopers",
    name,
    club,
    location,
    county: c.county || getCountyForLocation(location),
    dateStart: c.date,
    dateEnd: c.date,
    registrationCloses: c.registration_closes,
    classes: c.classes ?? [],
    judges: c.judge ? [stripHtml(c.judge)] : [],
    status: c.registration_status,
    sourceUrl: c.source_url,
    path: `/tavlingar/hoopers/${encodeURIComponent(c.competition_id)}/${buildCompetitionSlug({
      club,
      name,
      location,
      date: c.date,
    })}`,
  };
}

/** Hämtar kommande tävlingar för båda sporterna. */
export async function fetchUpcomingCompetitions(): Promise<UnifiedCompetition[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [agility, hoopers] = await Promise.all([
    supabase
      .from("competitions")
      .select(AGILITY_SELECT)
      .gte("date_start", today)
      .order("date_start", { ascending: true })
      .limit(400),
    supabase
      .from("hoopers_competitions")
      .select(HOOPERS_SELECT)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(200),
  ]);

  const list = [
    ...((agility.data ?? []) as unknown as AgilityCompetition[]).map(agilityToUnified),
    ...((hoopers.data ?? []) as unknown as HoopersCompetition[]).map(hoopersToUnified),
  ];
  return list.sort((a, b) => (a.dateStart ?? "").localeCompare(b.dateStart ?? ""));
}

// ── Datum & presentation ───────────────────────────────────────────────────

const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

export function monthLabel(iso: string | null): string {
  if (!iso) return "Datum saknas";
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: "–", month: "" };
  const d = new Date(iso);
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()].slice(0, 3) };
}

export function longDate(iso: string | null): string {
  if (!iso) return "Datum ej satt";
  return new Date(iso).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function dateRange(start: string | null, end: string | null): string {
  if (!start) return "Datum ej satt";
  if (!end || end === start) return longDate(start);
  return `${longDate(start)} – ${new Date(end).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

/** Antal hela dagar kvar till ett datum (negativt = passerat). */
export function daysUntil(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type DeadlineTone = "open" | "urgent" | "closed" | "unknown";

export interface DeadlineInfo {
  tone: DeadlineTone;
  label: string;
}

/** Beslutsstöd: hur bråttom är anmälan? */
export function deadlineInfo(registrationCloses: string | null, now: Date = new Date()): DeadlineInfo {
  const days = daysUntil(registrationCloses, now);
  if (days === null) return { tone: "unknown", label: "Anmälningsdatum saknas" };
  if (days < 0) return { tone: "closed", label: "Anmälan stängd" };
  if (days === 0) return { tone: "urgent", label: "Sista anmälningsdag i dag" };
  if (days <= 7) return { tone: "urgent", label: `Anmälan stänger om ${days} ${days === 1 ? "dag" : "dagar"}` };
  return { tone: "open", label: `Anmälan öppen — ${days} dagar kvar` };
}

export function relativeUpdated(iso: string | null): string {
  if (!iso) return "Uppdateringstid okänd";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 60) return `Uppdaterad för ${Math.max(diffMin, 1)} min sedan`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `Uppdaterad för ${h} ${h === 1 ? "timme" : "timmar"} sedan`;
  const d = Math.round(h / 24);
  return `Uppdaterad för ${d} ${d === 1 ? "dag" : "dagar"} sedan`;
}

// ── Kalenderexport (.ics) ──────────────────────────────────────────────────

function icsEscape(text: string): string {
  return text.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function icsDate(iso: string, addDays = 0): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Bygger en .ics-sträng för en tävling (heldagshändelse). */
export function buildIcs(comp: {
  id: string;
  name: string;
  club: string;
  location: string;
  dateStart: string | null;
  dateEnd: string | null;
  url: string;
  description?: string;
}): string {
  const start = comp.dateStart ?? new Date().toISOString().slice(0, 10);
  const end = comp.dateEnd ?? start;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgilityManager//Tavlingskalender//SV",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${comp.id}@agilitymanager.se`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${icsDate(start)}`,
    `DTEND;VALUE=DATE:${icsDate(end, 1)}`,
    `SUMMARY:${icsEscape(comp.name)}`,
    `LOCATION:${icsEscape([comp.location, comp.club].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${icsEscape(comp.description ?? `Tävling via AgilityManager. ${comp.url}`)}`,
    `URL:${comp.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
