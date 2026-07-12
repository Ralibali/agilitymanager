/**
 * Central growth/analytics event layer.
 * Safe in SSR, tests, and when providers are missing – never throws.
 */

const STORAGE_KEY = 'am_growth_events';
const MAX_STORED = 50;

export interface GrowthEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  pathname: string;
}

function safeGetPathname(): string {
  try {
    if (typeof window === 'undefined') return '';
    return window.location?.pathname ?? '';
  } catch {
    return '';
  }
}

function persistEvent(event: GrowthEvent) {
  try {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: GrowthEvent[] = raw ? JSON.parse(raw) : [];
    list.push(event);
    while (list.length > MAX_STORED) list.shift();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage kan vara blockerad, ignorera tyst.
  }
}

export function trackGrowthEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  try {
    const event: GrowthEvent = {
      name,
      properties,
      timestamp: new Date().toISOString(),
      pathname: safeGetPathname(),
    };

    if (typeof window !== 'undefined') {
      // Flock (befintlig analytics)
      try {
        const flock = (window as unknown as { flock?: (n: string, p?: unknown) => void }).flock;
        if (typeof flock === 'function') flock(name, properties);
      } catch {
        // ignore
      }

      // gtag
      try {
        const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
        if (typeof gtag === 'function') gtag('event', name, properties ?? {});
      } catch {
        // ignore
      }
    }

    persistEvent(event);
  } catch {
    // Aldrig blockera användaren pga tracking.
  }
}
