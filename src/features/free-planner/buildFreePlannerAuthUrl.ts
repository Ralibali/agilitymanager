/**
 * Bygger auth-URL:er för gratis banbyggaren.
 * Bevarar source + sport och skickar användaren vidare till fulla V3-banbyggaren.
 */

export type FreePlannerAuthMode = "signup" | "login";
export type FreePlannerSport = "agility" | "hoopers";

export interface BuildFreePlannerAuthUrlInput {
  mode: FreePlannerAuthMode;
  source?: string | null;
  sport?: FreePlannerSport;
}

export const FREE_PLANNER_DEFAULT_SOURCE = "free_course_planner";
export const FREE_PLANNER_REDIRECT = "/v3/course-planner-v2";

export function buildFreePlannerAuthUrl(input: BuildFreePlannerAuthUrlInput): string {
  const params = new URLSearchParams();
  params.set("mode", input.mode);
  params.set("redirect", FREE_PLANNER_REDIRECT);
  params.set("source", input.source && input.source.trim() ? input.source.trim() : FREE_PLANNER_DEFAULT_SOURCE);
  if (input.sport) params.set("sport", input.sport);
  return `/auth?${params.toString()}`;
}

export function buildFreePlannerSelfUrl(sport: FreePlannerSport, source?: string | null): string {
  const params = new URLSearchParams();
  params.set("sport", sport);
  if (source && source.trim()) params.set("source", source.trim());
  return `/banplanerare?${params.toString()}`;
}
