import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyArrive,
  FIRST_PARTY_COLLECT_PATH,
  FIRST_PARTY_STORAGE_KEY,
  readStoredEvents,
  shouldTrackArrive,
  track,
  trackArriveOnce,
  trackPlannerUsedOnce,
} from "./firstPartyEvents";

function installBrowser() {
  const store = new Map<string, string>();
  const session = new Map<string, string>();
  const sendBeacon = vi.fn(() => true);
  vi.stubGlobal("window", {
    location: { pathname: "/banplanerare", search: "?bana=abc" },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    sessionStorage: {
      getItem: (k: string) => session.get(k) ?? null,
      setItem: (k: string, v: string) => void session.set(k, v),
    },
  });
  vi.stubGlobal("document", { referrer: "https://example.com" });
  vi.stubGlobal("navigator", { sendBeacon });
  return { store, session, sendBeacon };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("classifyArrive / shouldTrackArrive", () => {
  it("markerar delningslänk och publik bansida", () => {
    expect(classifyArrive("/banplanerare", "?bana=xyz")).toBe("share_link");
    expect(classifyArrive("/banplanerare", "?delad=id")).toBe("share_link");
    expect(classifyArrive("/bana/abc", "")).toBe("shared_course");
    expect(classifyArrive("/banplanerare", "")).toBe("planner");
    expect(classifyArrive("/", "")).toBe("home");
    expect(classifyArrive("/delade-banor", "")).toBe("shared_index");
  });

  it("spårar bara organiska ytor", () => {
    expect(shouldTrackArrive("/")).toBe(true);
    expect(shouldTrackArrive("/banplanerare")).toBe(true);
    expect(shouldTrackArrive("/bana/1")).toBe(true);
    expect(shouldTrackArrive("/delade-banor")).toBe(true);
    expect(shouldTrackArrive("/tavlingar")).toBe(false);
    expect(shouldTrackArrive("/priser")).toBe(false);
  });
});

describe("track", () => {
  it("skickar beacon och sparar i localStorage utan PII-fält", () => {
    const { sendBeacon, store } = installBrowser();
    track("share", { via: "link" });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith(FIRST_PARTY_COLLECT_PATH, expect.any(Blob));

    const stored = JSON.parse(store.get(FIRST_PARTY_STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      event: "share",
      via: "link",
      path: "/banplanerare",
      search: "?bana=abc",
      referrer: "https://example.com",
    });
    expect(stored[0]).not.toHaveProperty("email");
    expect(stored[0]).not.toHaveProperty("token");
    expect(readStoredEvents()).toHaveLength(1);
  });

  it("sväljer fel från beacon och storage", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/", search: "" },
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    vi.stubGlobal("document", { referrer: "" });
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("offline");
      },
    });
    expect(() => track("arrive", { via: "home" })).not.toThrow();
  });
});

describe("once-hjälpare", () => {
  it("arrive och planner_used fyras bara en gång per session", () => {
    const { sendBeacon } = installBrowser();
    trackArriveOnce();
    trackArriveOnce();
    trackPlannerUsedOnce();
    trackPlannerUsedOnce();
    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });
});
