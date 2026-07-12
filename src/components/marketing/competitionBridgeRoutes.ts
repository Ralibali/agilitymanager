/**
 * Route-byggare för CompetitionProductBridge.
 * Håller URL-parametrar konsekvent och undviker dubbel-encoding.
 */

export type BridgeDestination = "signup" | "planner";

export interface BuildSignupUrlInput {
  source: string;
  competitionId?: string | null;
  sport?: "agility" | "hoopers";
  extra?: Record<string, string>;
}

export interface BuildPlannerUrlInput {
  source: string;
  sport?: "agility" | "hoopers";
}

/**
 * Bygger /auth?mode=signup&source=…&competition=… utan dubbel-encoding.
 * URLSearchParams gör encoding en gång, korrekt.
 */
export function buildSignupUrl(input: BuildSignupUrlInput): string {
  const params = new URLSearchParams();
  params.set("mode", "signup");
  params.set("source", input.source);
  if (input.competitionId) params.set("competition", input.competitionId);
  if (input.sport) params.set("sport", input.sport);
  if (input.extra) {
    for (const [k, v] of Object.entries(input.extra)) {
      if (v) params.set(k, v);
    }
  }
  return `/auth?${params.toString()}`;
}

export function buildPlannerUrl(input: BuildPlannerUrlInput): string {
  const params = new URLSearchParams();
  params.set("source", input.source);
  if (input.sport) params.set("sport", input.sport);
  return `/banplanerare?${params.toString()}`;
}
