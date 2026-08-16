import { describe, expect, it } from "vitest";
import type { UnifiedCompetition } from "./competitionData";
import {
  DEFAULT_DOG_PROFILE,
  filterMatching,
  hoopersSizeFor,
  matchCompetition,
  type DogProfile,
} from "./dogMatch";

function comp(partial: Partial<UnifiedCompetition>): UnifiedCompetition {
  return {
    key: "a-1",
    id: "1",
    sport: "agility",
    name: "Test",
    club: "Klubb",
    location: "Halmstad",
    county: "Hallands",
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

const dog: DogProfile = { ...DEFAULT_DOG_PROFILE, agilityLevel: "Klass 2" };

describe("matchCompetition", () => {
  it("matchar agilityklass mot hundens nivå", () => {
    const res = matchCompetition(comp({ classes: ["Ag1", "Ag2", "Ho2"] }), dog);
    expect(res.matches).toBe(true);
    expect(res.matchedClasses).toEqual(["Ag2", "Ho2"]);
  });

  it("matchar inte när nivån saknas", () => {
    expect(matchCompetition(comp({ classes: ["Ag1", "Ho1"] }), dog).matches).toBe(false);
  });

  it("matchar inte annan sport", () => {
    const res = matchCompetition(comp({ sport: "hoopers", classes: ["Klass 2"] }), dog);
    expect(res.matches).toBe(false);
  });

  it("matchar hoopersklass", () => {
    const hoopersDog: DogProfile = { ...DEFAULT_DOG_PROFILE, sport: "hoopers" };
    const res = matchCompetition(comp({ sport: "hoopers", classes: ["Startklass", "Klass 1"] }), hoopersDog);
    expect(res.matchedClasses).toEqual(["Startklass"]);
  });

  it("behåller tävlingar utan klassinformation men flaggar dem", () => {
    const res = matchCompetition(comp({ classes: [] }), dog);
    expect(res.matches).toBe(true);
    expect(res.unknownClasses).toBe(true);
  });

  it("matchar nollklass", () => {
    const puppy: DogProfile = { ...DEFAULT_DOG_PROFILE, agilityLevel: "Nollklass" };
    expect(matchCompetition(comp({ classes: ["0-klass", "Ag3"] }), puppy).matches).toBe(true);
  });
});

describe("filterMatching", () => {
  it("filtrerar listan", () => {
    const list = [comp({ key: "a-1", classes: ["Ag2"] }), comp({ key: "a-2", classes: ["Ag3"] })];
    expect(filterMatching(list, dog).map((c) => c.key)).toEqual(["a-1"]);
  });
});

describe("hoopersSizeFor", () => {
  it("mappar storleksklass till Small/Large", () => {
    expect(hoopersSizeFor("XS")).toBe("Small");
    expect(hoopersSizeFor("S")).toBe("Small");
    expect(hoopersSizeFor("M")).toBe("Large");
    expect(hoopersSizeFor("L")).toBe("Large");
  });
});
