import { describe, expect, it } from "vitest";
import { competitionCoords, formatDistance, sortByDistance } from "./competitionGeo";
import type { UnifiedCompetition } from "./competitionData";

function comp(partial: Partial<UnifiedCompetition>): UnifiedCompetition {
  return {
    key: "a-1",
    id: "1",
    sport: "agility",
    name: "Test",
    club: "Klubb",
    location: "",
    county: null,
    dateStart: "2026-08-08",
    dateEnd: null,
    registrationCloses: null,
    classes: [],
    judges: [],
    status: null,
    sourceUrl: null,
    path: "/tavlingar/1/test",
    ...partial,
  };
}

describe("competitionCoords", () => {
  it("hittar ortens koordinat", () => {
    const geo = competitionCoords(comp({ location: "Halmstad" }));
    expect(geo?.approximate).toBe(false);
    expect(geo?.point.lat).toBeCloseTo(56.674, 2);
  });

  it("hanterar sammansatta platssträngar", () => {
    const geo = competitionCoords(comp({ location: "Göteborg, Hisingen" }));
    expect(geo?.point.lng).toBeCloseTo(11.974, 2);
  });

  it("faller tillbaka på länets mittpunkt", () => {
    const geo = competitionCoords(comp({ location: "Okänd plats", county: "Hallands" }));
    expect(geo?.approximate).toBe(true);
  });

  it("returnerar null utan ort och län", () => {
    expect(competitionCoords(comp({ location: "Okänd plats" }))).toBeNull();
  });
});

describe("sortByDistance", () => {
  it("sorterar närmast först och utesluter okända platser", () => {
    const list = [
      comp({ key: "a-1", location: "Kiruna" }),
      comp({ key: "a-2", location: "Halmstad" }),
      comp({ key: "a-3", location: "Okänd plats" }),
    ];
    const sorted = sortByDistance(list, { lat: 56.674, lng: 12.857 });
    expect(sorted.map((c) => c.key)).toEqual(["a-2", "a-1"]);
    expect(sorted[0].distanceKm).toBeLessThan(5);
  });
});

describe("formatDistance", () => {
  it("formaterar avstånd", () => {
    expect(formatDistance(0.4)).toBe("under 1 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });
});
