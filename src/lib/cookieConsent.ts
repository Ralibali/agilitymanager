/**
 * Cookie consent management.
 * Stores user's choice in a first-party cookie ('am_cookie_consent') as JSON.
 */

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true; // alltid true
  analytics: boolean;
  marketing: boolean;
  timestamp: string; // ISO
  version: number;
}

const COOKIE_NAME = "am_cookie_consent";
const COOKIE_MAX_AGE_DAYS = 365;
const CONSENT_VERSION = 1;

export const CONSENT_EVENT = "am:cookie-consent-changed";

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const isHttps = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax${isHttps ? ";Secure" : ""}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, "\\$1") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function readConsent(): ConsentState | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      timestamp: parsed.timestamp || new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

export function saveConsent(partial: { analytics: boolean; marketing: boolean }) {
  const state: ConsentState = {
    necessary: true,
    analytics: partial.analytics,
    marketing: partial.marketing,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  setCookie(COOKIE_NAME, JSON.stringify(state), COOKIE_MAX_AGE_DAYS);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  }
  return state;
}

export function acceptAll() {
  return saveConsent({ analytics: true, marketing: true });
}

export function rejectAll() {
  return saveConsent({ analytics: false, marketing: false });
}

export function clearConsent() {
  setCookie(COOKIE_NAME, "", -1);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const state = readConsent();
  if (!state) return false;
  return !!state[category];
}
