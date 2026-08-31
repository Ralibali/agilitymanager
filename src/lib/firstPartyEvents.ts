/**
 * Tyst first-party-mätning för den organiska loopen.
 * Inget betalt analytics-verktyg. Misslyckad beacon får aldrig påverka UX.
 */

export const FIRST_PARTY_EVENTS = ["arrive", "planner_used", "share", "auth"] as const;
export type FirstPartyEventName = (typeof FIRST_PARTY_EVENTS)[number];

export type FirstPartyEvent = {
  event: FirstPartyEventName;
  path: string;
  search: string;
  referrer: string;
  ts: string;
  via?: string;
};

export const FIRST_PARTY_STORAGE_KEY = "am-fp-events";
export const FIRST_PARTY_COLLECT_PATH = "/api/collect";
const MAX_STORED = 50;
const ONCE_PREFIX = "am-fp-once:";

const ARRIVE_EXACT = new Set(["/", "/banplanerare", "/delade-banor"]);

export function shouldTrackArrive(pathname: string): boolean {
  return ARRIVE_EXACT.has(pathname) || pathname.startsWith("/bana/");
}

/** Varför personen landade — räcker för att se om delningsloopen stänger. */
export function classifyArrive(pathname: string, search: string): string {
  const q = new URLSearchParams(search);
  if (q.get("bana") || q.get("delad")) return "share_link";
  if (pathname.startsWith("/bana/")) return "shared_course";
  if (pathname.startsWith("/banplanerare")) return "planner";
  if (pathname === "/") return "home";
  if (pathname.startsWith("/delade-banor")) return "shared_index";
  return "other";
}

function once(key: string, run: () => void): void {
  try {
    const full = ONCE_PREFIX + key;
    if (window.sessionStorage.getItem(full)) return;
    window.sessionStorage.setItem(full, "1");
  } catch {
    /* sessionStorage kan vara avstängt — hellre dubbel än tyst */
  }
  run();
}

export function track(event: FirstPartyEventName, details: { via?: string } = {}): void {
  if (typeof window === "undefined") return;

  const payload: FirstPartyEvent = {
    event,
    path: window.location.pathname,
    search: window.location.search,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    ts: new Date().toISOString(),
    ...(details.via ? { via: details.via } : {}),
  };

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        FIRST_PARTY_COLLECT_PATH,
        new Blob([body], { type: "text/plain" }),
      );
    } else {
      void fetch(FIRST_PARTY_COLLECT_PATH, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "text/plain" },
      });
    }
  } catch {
    /* beacon får aldrig krascha appen */
  }

  try {
    const raw = window.localStorage.getItem(FIRST_PARTY_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const events = Array.isArray(existing) ? existing : [];
    events.push(payload);
    window.localStorage.setItem(
      FIRST_PARTY_STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_STORED)),
    );
  } catch {
    /* privat läge / fullt */
  }
}

export function trackArriveOnce(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (!shouldTrackArrive(path)) return;
  once(`arrive:${path}`, () => {
    track("arrive", { via: classifyArrive(path, window.location.search) });
  });
}

export function trackPlannerUsedOnce(): void {
  once("planner_used", () => track("planner_used", { via: "edit" }));
}

export function readStoredEvents(): FirstPartyEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FIRST_PARTY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
