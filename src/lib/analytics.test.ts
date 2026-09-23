import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

async function setup(hostname = "agilitymanager.se") {
  const gtag = vi.fn();
  vi.stubGlobal("window", {
    location: { hostname, origin: `https://${hostname}`, href: `https://${hostname}/banplanerare?email=private@example.test`, pathname: "/banplanerare", search: "?email=private@example.test" },
    history: { pushState: vi.fn(), replaceState: vi.fn() },
    addEventListener: vi.fn(), gtag,
  });
  vi.stubGlobal("document", { referrer: "", cookie: "", querySelector: () => ({}), addEventListener: vi.fn() });
  vi.stubGlobal("localStorage", { getItem: () => "declined" });
  const analytics = await import("./analytics");
  const runtime = await import("./ga4Runtime");
  runtime.initGa4({ measurementId: "G-TEST123", hosts: ["agilitymanager.se"], excluded: ["/admin"], consentKey: "test-consent" });
  gtag.mockClear();
  return { ...analytics, ...runtime, gtag };
}

describe("analytics.track", () => {
  it("är en no-op utan window eller initierad mätning", async () => {
    const { track } = await import("./analytics");
    expect(() => track("planner_open")).not.toThrow();
    vi.stubGlobal("window", {});
    expect(() => track("planner_open")).not.toThrow();
  });

  it("skickar inga produkthändelser före statistikmedgivande", async () => {
    const { track, gtag } = await setup();
    track("course_saved", { sport: "agility" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("skickar till GA4 efter medgivande och filtrerar privat data", async () => {
    const { track, gtag, setAnalyticsConsent } = await setup();
    setAnalyticsConsent(true);
    gtag.mockClear();
    track("course_saved", { sport: "agility", email: "private@example.test" });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "course_saved", expect.objectContaining({
      sport: "agility", send_to: "G-TEST123", page_location: "https://agilitymanager.se/banplanerare",
    }));
    expect(gtag.mock.calls[0][2]).not.toHaveProperty("email");
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("private@example.test");
  });

  it("skickar en händelse även utan egenskaper", async () => {
    const { track, gtag, setAnalyticsConsent } = await setup();
    setAnalyticsConsent(true);
    gtag.mockClear();
    track("planner_open");
    expect(gtag).toHaveBeenCalledWith("event", "planner_open", expect.objectContaining({ send_to: "G-TEST123" }));
  });

  it("slutar skicka när medgivandet återkallas", async () => {
    const { track, gtag, setAnalyticsConsent } = await setup();
    setAnalyticsConsent(true);
    setAnalyticsConsent(false);
    gtag.mockClear();
    track("course_shared");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("skickar inte från en förhandsvisningsdomän", async () => {
    const { track, gtag, setAnalyticsConsent } = await setup("preview.example.test");
    setAnalyticsConsent(true);
    gtag.mockClear();
    track("course_saved");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("låter inte fel från mätsnutten avbryta produktflödet", async () => {
    const { track, gtag, setAnalyticsConsent } = await setup();
    setAnalyticsConsent(true);
    gtag.mockImplementation(() => { throw new Error("blockerad"); });
    expect(() => track("course_shared")).not.toThrow();
  });

  it("har unika händelsenamn", async () => {
    const { ANALYTICS_EVENTS } = await import("./analytics");
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });
});
