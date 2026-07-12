import { describe, it, expect } from "vitest";
import {
  buildFreePlannerAuthUrl,
  buildFreePlannerSelfUrl,
  FREE_PLANNER_DEFAULT_SOURCE,
  FREE_PLANNER_REDIRECT,
} from "./buildFreePlannerAuthUrl";

describe("buildFreePlannerAuthUrl", () => {
  it("signup with defaults uses fallback source and planner redirect", () => {
    const url = buildFreePlannerAuthUrl({ mode: "signup" });
    const search = new URL(url, "https://x.test").searchParams;
    expect(search.get("mode")).toBe("signup");
    expect(search.get("redirect")).toBe(FREE_PLANNER_REDIRECT);
    expect(search.get("source")).toBe(FREE_PLANNER_DEFAULT_SOURCE);
    expect(search.get("sport")).toBeNull();
  });

  it("preserves source and sport", () => {
    const url = buildFreePlannerAuthUrl({ mode: "login", source: "landing_hero", sport: "hoopers" });
    const search = new URL(url, "https://x.test").searchParams;
    expect(search.get("mode")).toBe("login");
    expect(search.get("source")).toBe("landing_hero");
    expect(search.get("sport")).toBe("hoopers");
    expect(search.get("redirect")).toBe(FREE_PLANNER_REDIRECT);
  });

  it("URL-encodes special characters exactly once", () => {
    const url = buildFreePlannerAuthUrl({ mode: "signup", source: "a b&c=d" });
    expect(url).toContain("source=a+b%26c%3Dd");
    // säkerställ att redirect inte dubbel-encodas
    expect(url).toContain("redirect=%2Fv3%2Fcourse-planner-v2");
    expect(url).not.toContain("%25");
  });

  it("trims blank source to default", () => {
    const url = buildFreePlannerAuthUrl({ mode: "signup", source: "   " });
    expect(new URL(url, "https://x.test").searchParams.get("source")).toBe(FREE_PLANNER_DEFAULT_SOURCE);
  });

  it("buildFreePlannerSelfUrl keeps sport and source", () => {
    const url = buildFreePlannerSelfUrl("agility", "seo_landing");
    const search = new URL(url, "https://x.test").searchParams;
    expect(search.get("sport")).toBe("agility");
    expect(search.get("source")).toBe("seo_landing");
  });
});
