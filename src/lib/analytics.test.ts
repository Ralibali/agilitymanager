import { afterEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS, track } from "./analytics";

// Testerna körs i node-miljö (ingen jsdom i projektet), så vi sätter en
// minimal window-stub när vi vill verifiera att händelsen skickas vidare.
const g = globalThis as { window?: unknown };

afterEach(() => {
  delete g.window;
});

describe("analytics.track", () => {
  it("är en no-op när det inte finns någon window", () => {
    expect(() => track("planner_open")).not.toThrow();
  });

  it("är en no-op när ingen mätsnutt finns", () => {
    g.window = {};
    expect(() => track("planner_open")).not.toThrow();
  });

  it("skickar händelsen till plausible när den finns", () => {
    const spy = vi.fn();
    g.window = { plausible: spy };
    track("course_saved", { sport: "agility" });
    expect(spy).toHaveBeenCalledWith("course_saved", { props: { sport: "agility" } });
  });

  it("skickar utan props när inga props anges", () => {
    const spy = vi.fn();
    g.window = { plausible: spy };
    track("planner_open");
    expect(spy).toHaveBeenCalledWith("planner_open", undefined);
  });

  it("sväljer fel från mätsnutten", () => {
    g.window = {
      plausible: () => {
        throw new Error("blockerad");
      },
    };
    expect(() => track("course_shared")).not.toThrow();
  });

  it("har unika händelsenamn", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });
});
