import { hasConsent } from '@/lib/cookieConsent';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const STORAGE_KEY = 'agility_utm';

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
}

function safeRemoveStoredUtm() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage kan vara blockerat i privata lägen.
  }
}

/**
 * Captures campaign attribution only after marketing consent.
 * UTM/referrer data is not required for the service to work and should not be
 * persisted before the user has accepted marketing/campaign measurement.
 */
export function captureUtmParams() {
  if (typeof window === 'undefined') return;

  if (!hasConsent('marketing')) {
    safeRemoveStoredUtm();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const hasUtm = UTM_KEYS.some(k => params.has(k));
  const hasExternalReferrer = !!document.referrer && !document.referrer.includes(window.location.hostname);
  if (!hasUtm && !hasExternalReferrer) return;

  const data: UtmData = {};
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) data[key] = val;
  }
  if (hasExternalReferrer) {
    data.referrer = document.referrer;
  }
  data.landing_page = window.location.pathname;

  if (Object.keys(data).length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // No-op om lagring nekas.
    }
  }
}

/** Retrieve stored UTM data (and clear it) */
export function getAndClearUtmData(): UtmData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
