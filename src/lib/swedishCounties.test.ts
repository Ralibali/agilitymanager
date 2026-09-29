import { describe, expect, it } from "vitest";
import { countySlug, normalizeCounty } from "./swedishCounties";

describe("normalizeCounty", () => {
  it("slår ihop källornas olika stavningar till samma län", () => {
    expect(normalizeCounty("Stockholm")).toBe("Stockholms");
    expect(normalizeCounty("Stockholms län")).toBe("Stockholms");
    expect(normalizeCounty("Västra Götaland")).toBe("Västra Götalands");
    expect(normalizeCounty("norrbotten")).toBe("Norrbottens");
    expect(normalizeCounty("Skåne län")).toBe("Skåne");
    expect(normalizeCounty("Örebro")).toBe("Örebro");
  });

  it("behåller okända namn och ger null för tomma", () => {
    expect(normalizeCounty("Åland")).toBe("Åland");
    expect(normalizeCounty("  ")).toBeNull();
    expect(normalizeCounty(null)).toBeNull();
  });
});

describe("countySlug", () => {
  it("ger samma slug för alla stavningar av ett län", () => {
    expect(countySlug("Stockholm")).toBe("stockholms");
    expect(countySlug("Stockholms")).toBe("stockholms");
    expect(countySlug("Västra Götaland")).toBe("vastra-gotalands");
    expect(countySlug("")).toBe("");
  });
});
