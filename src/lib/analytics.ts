/**
 * Lättviktig händelselogg för produktflödena.
 *
 * Ingen ny beroende och inget eget insamlingssystem: om Plausible (eller en
 * annan `window.plausible`-kompatibel skriptsnutt) finns på sidan skickas
 * händelsen dit, annars är anropet en tyst no-op. Det gör att vi kan märka
 * upp flödena nu och koppla på mätning senare utan kodändring.
 */

export const ANALYTICS_EVENTS = [
  "planner_open",
  "course_created",
  "course_saved",
  "course_shared",
  "course_exported",
  "competition_viewed",
  "competition_favorited",
  "dog_profile_created",
  "training_plan_created",
  "training_completed",
  "instructor_group_created",
  "student_invited",
  "account_created",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

type Props = Record<string, string | number | boolean | undefined>;

type PlausibleFn = (event: string, options?: { props?: Props }) => void;
type UmamiFn = (event: string, data?: Props) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
    umami?: { track: UmamiFn };
  }
}

/** Skickar en produkthändelse om en mätsnutt finns. Kastar aldrig. */
export function track(event: AnalyticsEvent, props?: Props): void {
  try {
    if (typeof window === "undefined") return;
    const cleanProps = props && Object.keys(props).length ? props : undefined;

    if (typeof window.plausible === "function") {
      window.plausible(event, cleanProps ? { props: cleanProps } : undefined);
    }

    if (typeof window.umami?.track === "function") {
      window.umami.track(event, cleanProps);
    }
  } catch {
    /* mätning får aldrig påverka appen */
  }
}
