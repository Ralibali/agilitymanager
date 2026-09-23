import { sendAnalyticsEvent } from './ga4Runtime';
/** Consent-gated GA4 product events. */
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

/** Skickar en produkthändelse efter statistikmedgivande. Kastar aldrig. */
export function track(event: AnalyticsEvent, props?: Props): void {
  sendAnalyticsEvent(event, { props });
}
