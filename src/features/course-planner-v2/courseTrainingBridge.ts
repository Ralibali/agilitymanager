/**
 * Mappar bana → förifyllda värden och kontext till Logga pass-sheet:en.
 *
 * OBS: Kopplingen mellan bana och loggat pass är transient. `training_sessions`
 * har idag ingen `course_id`-kolumn, så vi sparar INTE någon relation i DB.
 * `LogContext` lever bara i UI/analytics tills schemat uttryckligen stödjer
 * en riktig relation.
 */
import type { ObstacleTypeV2, Sport } from "./config";

/** Sport-strängen som `training_sessions.sport` och LogContext förväntar. */
export type LogSport = "Agility" | "Hoopers";

export function courseSportToLogSport(sport: Sport): LogSport {
  return sport === "hoopers" ? "Hoopers" : "Agility";
}

/**
 * Mappa banans hindertyper till formulärets svenska options.
 * Endast typer som har en riktig motsvarighet i formuläret returneras –
 * vi hittar inte på labels och lägger inte in banans namn i taggar/notes.
 */
const AGILITY_MAP: Partial<Record<ObstacleTypeV2, string>> = {
  jump: "Hopp",
  wall: "Hopp",
  longjump: "Hopp",
  tire: "Hopp",
  combo: "Hopp",
  tunnel: "Tunnel",
  weave_8: "Slalom",
  weave_10: "Slalom",
  weave_12: "Slalom",
  aframe: "A-ram",
  dogwalk: "Gångbro",
  table: "Bordstopp",
};

const HOOPERS_MAP: Partial<Record<ObstacleTypeV2, string>> = {
  hoop: "Hoop",
  tunnel: "Tunnel",
  barrel: "Tunna",
  fence: "Staket",
};

export function mapObstacleTypesToFormOptions(
  sport: Sport,
  types: ObstacleTypeV2[],
  maxCount = 8,
): string[] {
  const map = sport === "hoopers" ? HOOPERS_MAP : AGILITY_MAP;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const type of types) {
    const label = map[type];
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= maxCount) break;
  }
  return out;
}

/**
 * Rimlig default-duration för ett banpass. Endast heuristik utifrån
 * antal tävlingshinder — inga påhittade siffror utanför formulärets
 * validationsspann (1–600 min).
 */
export function defaultDurationForCourse(competingObstacleCount: number): number {
  if (competingObstacleCount <= 6) return 15;
  if (competingObstacleCount <= 14) return 20;
  return 25;
}
