import { describe, expect, it } from "vitest";
import { buildSignupUrl, buildPlannerUrl } from "./competitionBridgeRoutes";

describe("buildSignupUrl", () => {
  it("innehåller mode=signup och source", () => {
    const url = buildSignupUrl({ source: "competition_bridge" });
    expect(url).toBe("/auth?mode=signup&source=competition_bridge");
  });

  it("lägger till competition och sport", () => {
    const url = buildSignupUrl({
      source: "competition_bridge",
      competitionId: "abc-123",
      sport: "agility",
    });
    expect(url).toContain("competition=abc-123");
    expect(url).toContain("sport=agility");
    expect(url).toContain("mode=signup");
  });

  it("encodar special-tecken exakt en gång", () => {
    const url = buildSignupUrl({
      source: "competition_bridge",
      competitionId: "id med mellanslag & tecken",
    });
    // URLSearchParams använder + för mellanslag; ingen dubbel-encoding (%2520 osv).
    expect(url).not.toContain("%25");
    expect(url).toContain("competition=");
  });

  it("hoppar över tomma extra-värden", () => {
    const url = buildSignupUrl({
      source: "s",
      extra: { placement: "detail", empty: "" },
    });
    expect(url).toContain("placement=detail");
    expect(url).not.toContain("empty=");
  });
});

describe("buildPlannerUrl", () => {
  it("returnerar /banplanerare med source", () => {
    expect(buildPlannerUrl({ source: "competition_bridge" })).toBe(
      "/banplanerare?source=competition_bridge",
    );
  });

  it("inkluderar sport när angivet", () => {
    const url = buildPlannerUrl({ source: "s", sport: "hoopers" });
    expect(url).toContain("sport=hoopers");
  });
});
