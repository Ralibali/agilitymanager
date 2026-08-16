import { describe, expect, it } from "vitest";
import type { UnifiedCompetition } from "./competitionData";
import {
  DEFAULT_DOG_PROFILE,
  filterMatching,
  hoopersSizeFor,
  matchCompetition,
  explainMatch,
  type DogProfile,
  addProfile,
  createProfile,
  duplicateProfile,
  patchActive,
  profileLabel,
  removeProfile,
  selectProfile,
  MAX_DOG_PROFILES,
  type DogProfileStore,
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


describe("flera matchningsprofiler", () => {
  function store(): DogProfileStore {
    const first = createProfile({ name: "Rio" });
    return { profiles: [first], activeId: first.id };
  }

  it("lägger till och aktiverar en ny profil", () => {
    const next = addProfile(store());
    expect(next.profiles).toHaveLength(2);
    expect(next.activeId).toBe(next.profiles[1].id);
  });

  it("respekterar maxantalet profiler", () => {
    let s = store();
    for (let i = 0; i < MAX_DOG_PROFILES + 3; i += 1) s = addProfile(s);
    expect(s.profiles).toHaveLength(MAX_DOG_PROFILES);
  });

  it("uppdaterar endast den aktiva profilen", () => {
    const s = addProfile(store(), { name: "Nova" });
    const next = patchActive(s, { size: "S" });
    expect(next.profiles[0].size).toBe("M");
    expect(next.profiles[1].size).toBe("S");
  });

  it("växlar aktiv profil", () => {
    const s = addProfile(store(), { name: "Nova" });
    const next = selectProfile(s, s.profiles[0].id);
    expect(next.activeId).toBe(s.profiles[0].id);
  });

  it("duplicerar en profil med kopienamn", () => {
    const s = store();
    const next = duplicateProfile(s, s.profiles[0].id);
    expect(next.profiles[1].name).toBe("Rio (kopia)");
    expect(next.profiles[1].id).not.toBe(s.profiles[0].id);
  });

  it("tar bort profiler men behåller minst en", () => {
    const s = addProfile(store(), { name: "Nova" });
    const one = removeProfile(s, s.profiles[1].id);
    expect(one.profiles).toHaveLength(1);
    expect(removeProfile(one, one.profiles[0].id).profiles).toHaveLength(1);
  });

  it("faller tillbaka på ett läsbart namn", () => {
    expect(profileLabel({ ...DEFAULT_DOG_PROFILE, name: "  " }, 1)).toBe("Profil 2");
  });
});

describe("explainMatch", () => {
  it("förklarar en matchande tävling", () => {
    const res = explainMatch(comp({ classes: ["Ag1", "Ag2"] }), { ...dog, name: "Rio" });
    expect(res.matches).toBe(true);
    expect(res.summary).toContain("Rio");
    expect(res.reasons.find((r) => r.key === "class")?.state).toBe("ok");
    expect(res.reasons.find((r) => r.key === "size")?.detail).toContain("45 cm");
  });

  it("förklarar fel sport", () => {
    const res = explainMatch(comp({ sport: "hoopers" }), dog);
    expect(res.reasons.find((r) => r.key === "sport")?.state).toBe("no");
    expect(res.summary).toContain("fel sport");
  });

  it("flaggar saknad klasslista som okänd", () => {
    const res = explainMatch(comp({ classes: [] }), dog);
    expect(res.reasons.find((r) => r.key === "class")?.state).toBe("unknown");
  });

  it("förklarar hoopersstorlek", () => {
    const hoop = { ...DEFAULT_DOG_PROFILE, sport: "hoopers" as const, size: "S" as const };
    const res = explainMatch(comp({ sport: "hoopers", classes: ["Startklass"] }), hoop);
    expect(res.reasons.find((r) => r.key === "size")?.detail).toContain("Small");
  });
});

describe("matchScore", () => {
  const dog = { ...DEFAULT_DOG_PROFILE, sport: "agility" as const, agilityLevel: "Klass 1" as const };
  const base = { key: "k", sport: "agility", classes: ["Klass 1"], dateStart: "2026-05-01" } as never;

  it("ger full match när klassen finns", () => {
    const r = matchScore(base, dog);
    expect(r.tier).toBe("strong");
    expect(r.label).toBe("Bra match");
  });

  it("ger 'Nästan' när klasslistan saknas", () => {
    const r = matchScore({ ...(base as object), classes: [] } as never, dog);
    expect(r.tier).toBe("likely");
  });

  it("ger ingen match vid fel sport", () => {
    const r = matchScore({ ...(base as object), sport: "hoopers" } as never, dog);
    expect(r.score).toBe(0);
    expect(r.tier).toBe("none");
  });

  it("sorterar starkast match först", () => {
    const weak = { ...(base as object), key: "w", classes: ["Klass 3"], dateStart: "2026-04-01" } as never;
    const list = sortByMatchScore([weak, base], dog);
    expect(list[0]).toBe(base);
  });
});
