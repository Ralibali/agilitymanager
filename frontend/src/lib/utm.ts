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

/** Call once on app load to capture UTM params from URL into localStorage */
export function captureUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const hasUtm = UTM_KEYS.some(k => params.has(k));
  if (!hasUtm && !document.referrer) return;

  const data: UtmData = {};
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) data[key] = val;
  }
  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    data.referrer = document.referrer;
  }
  data.landing_page = window.location.pathname;

  // Only store if we have something meaningful
  if (Object.keys(data).length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

/** Retrieve stored UTM data (and clear it) */
export function getAndClearUtmData(): UtmData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  localStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
