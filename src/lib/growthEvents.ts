import { trackEvent } from "@/lib/analyticsLoader";
import { readConsent } from "@/lib/cookieConsent";

export type GrowthEventName =
  | "landing_cta_clicked"
  | "auth_viewed"
  | "auth_started"
  | "signup_submitted"
  | "signup_completed"
  | "signup_confirmation_required"
  | "signup_failed"
  | "login_submitted"
  | "login_completed"
  | "login_failed"
  | "password_reset_requested"
  | "checkout_started"
  | "checkout_failed";

type GrowthProperties = Record<string, string | number | boolean | null | undefined>;

const META_STANDARD_EVENTS: Partial<Record<GrowthEventName, string>> = {
  signup_submitted: "Lead",
  signup_completed: "CompleteRegistration",
  checkout_started: "InitiateCheckout",
};

function cleanProperties(properties: GrowthProperties): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined,
    ),
  );
}

/**
 * Gemensam, samtyckesstyrd spårning för produktens tillväxttratt.
 * Plausible hanteras via analyticsLoader och Meta får endast events när
 * användaren uttryckligen har godkänt marknadsföring.
 */
export function trackGrowthEvent(name: GrowthEventName, properties: GrowthProperties = {}) {
  const clean = cleanProperties(properties);
  trackEvent(name, clean);

  if (typeof window === "undefined" || !readConsent()?.marketing || !window.fbq) return;

  try {
    const standardEvent = META_STANDARD_EVENTS[name];
    if (standardEvent) window.fbq("track", standardEvent, clean);
    else window.fbq("trackCustom", name, clean);
  } catch {
    // Analys får aldrig påverka användarflödet.
  }
}
