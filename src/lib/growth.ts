type GrowthEventProperties = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    flock?: (eventName: string, properties?: GrowthEventProperties) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = 'am_growth_events';
const MAX_STORED_EVENTS = 50;

export function trackGrowthEvent(
  eventName: string,
  properties: GrowthEventProperties = {},
): void {
  if (typeof window === 'undefined') return;

  const payload = {
    event: eventName,
    properties,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  try {
    window.flock?.(eventName, properties);
  } catch {
    // Analytics must never interrupt the user journey.
  }

  try {
    window.gtag?.('event', eventName, properties);
  } catch {
    // Analytics must never interrupt the user journey.
  }

  try {
    const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    const events = Array.isArray(existing) ? existing : [];
    events.push(payload);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_STORED_EVENTS)));
  } catch {
    // Local storage can be unavailable in private browsing or embedded contexts.
  }
}
