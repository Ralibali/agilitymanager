/**
 * SAgiK/SKK 2022–2026 §3.1 i planerarens regelkontroll: avstånd längs
 * hundens väg, banstruktur, förbjudna hinder, bankant och ansats — samt
 * Nollklassramen, hoopers maxavstånd och tunnellängd.
 */
import { describe, expect, it } from "vitest";
import { validateCourse, type CourseLite, type ObstacleLite } from "./validation";
import { buildDogPath } from "./dogPath";
import { obstacleSizeM, tunnelLengthM } from "./obstacleSize";
import { isRuleSetExpired, SKK_AGILITY_2023 } from "./rules";

function ob(id: string, type: ObstacleLite["type"], number: number | undefined, x: number, y: number, rotation = 90): ObstacleLite {
  return { id, type, number, x, y, rotation };
}

function agility(partial: Partial<CourseLite>): CourseLite {
  return {
    sport: "agility",
    sizeClass: "L",
    arenaWidthM: 30,
    arenaHeightM: 40,
    classTemplate: "agility_2",
    ruleSetId: "skk-agility-2023",
    obstacles: [],
    ...partial,
  };
}

const codes = (course: CourseLite) => validateCourse(course).map((i) => i.code);

/** Hopp på rad längs x (rotation 90 = hunden färdas längs x). */
function jumpRow(count: number, spacing: number, startX = 7, y = 20): ObstacleLite[] {
  return Array.from({ length: count }, (_, i) => ob(`j${i + 1}`, "jump", i + 1, startX + i * spacing, y));
}

describe("SAgiK §3.1 — avstånd mätt längs hundens väg", () => {
  it("mäter hopp från ribba till ribba: 6,0 m mitt–mitt är godkänt", () => {
    const issues = validateCourse(agility({ obstacles: jumpRow(2, 6) }));
    expect(issues.some((i) => i.code === "distance_too_short")).toBe(false);
  });

  it("under 6 m är fel i en tävlingsklass och citerar §3.1", () => {
    const hit = validateCourse(agility({ obstacles: jumpRow(2, 5) })).find((i) => i.code === "distance_too_short");
    expect(hit?.level).toBe("error");
    expect(hit?.basis).toBe("official_rule");
    expect(hit?.ruleClause).toBe("§3.1");
    expect(hit?.obstacleId).toBe("j2");
  });

  it("över 8 m varnar i en tävlingsklass", () => {
    const hit = validateCourse(agility({ obstacles: jumpRow(2, 9) })).find((i) => i.code === "distance_too_long");
    expect(hit?.level).toBe("warning");
  });

  it("fri planering: korta avstånd ger bara varning och långa ingenting", () => {
    const short = validateCourse(agility({ classTemplate: null, obstacles: jumpRow(2, 5) }));
    expect(short.find((i) => i.code === "distance_too_short")?.level).toBe("warning");
    expect(codes(agility({ classTemplate: null, obstacles: jumpRow(2, 12) }))).not.toContain("distance_too_long");
  });
});

describe("SAgiK §3.1 — banstruktur", () => {
  it("banan ska inledas och avslutas med hopp; oxer får vara sist", () => {
    const tunnelFirst = [ob("t", "tunnel", 1, 8, 20, 0), ...jumpRow(2, 7, 15).map((o, i) => ({ ...o, number: i + 2 }))];
    expect(codes(agility({ obstacles: tunnelFirst }))).toContain("start_not_jump");

    const oxerLast = [...jumpRow(2, 7), ob("o", "combo", 3, 21, 20)];
    expect(codes(agility({ obstacles: oxerLast }))).not.toContain("finish_not_jump");

    const tunnelLast = [...jumpRow(2, 7), ob("t", "tunnel", 3, 22, 20, 0)];
    expect(codes(agility({ obstacles: tunnelLast }))).toContain("finish_not_jump");
  });

  it("minst 7 hoppassager och högst ett slalom", () => {
    const fewJumps = [...jumpRow(2, 7), ob("t", "tunnel", 3, 22, 20, 0), ob("j9", "jump", 4, 22, 27, 0)];
    expect(codes(agility({ obstacles: fewJumps }))).toContain("too_few_jump_passages");

    const twoWeaves = [
      ...jumpRow(1, 7),
      ob("w1", "weave_12", 2, 15, 20),
      ob("w2", "weave_12", 3, 15, 30),
      ob("j9", "jump", 4, 22, 30),
    ];
    expect(codes(agility({ obstacles: twoWeaves }))).toContain("too_many_weaves");
  });

  it("8/10-pinnars slalom och bord är inte tillåtna i tävlingsklass — med förklaring", () => {
    const issues = validateCourse(agility({
      classTemplate: "agility_1",
      obstacles: [...jumpRow(1, 7), ob("w", "weave_10", 2, 15, 20), ob("b", "table", 3, 24, 20)],
    }));
    const weave = issues.find((i) => i.code === "type_forbidden" && i.obstacleId === "w");
    const table = issues.find((i) => i.code === "type_forbidden" && i.obstacleId === "b");
    expect(weave?.message).toContain("12 pinnar");
    expect(table?.message).toContain("2017");
  });

  it("hinder närmare bankanten än 1 m varnar", () => {
    const close = [ob("j1", "jump", 1, 15, 0.9, 0), ob("j2", "jump", 2, 15, 7, 0)];
    expect(codes(agility({ obstacles: close }))).toContain("border_clearance");
  });

  it("minst 6 m ansats före första hindret", () => {
    // Första hoppet 3 m från vänsterkanten, hunden färdas mot +x.
    expect(codes(agility({ obstacles: jumpRow(2, 7, 3) }))).toContain("start_runup_short");
    expect(codes(agility({ obstacles: jumpRow(2, 7, 9) }))).not.toContain("start_runup_short");
  });
});

describe("Nollklass", () => {
  it("kräver exakt ett specialhinder och godkänner 15×30 m", () => {
    const course = agility({
      classTemplate: "noll_slalom",
      arenaWidthM: 15,
      arenaHeightM: 30,
      obstacles: jumpRow(3, 7, 3, 10).map((o) => ({ ...o, rotation: 90 })),
    });
    const c = codes(course);
    expect(c).toContain("noll_special_count");
    expect(c).not.toContain("arena_size_differs");
  });

  it("8-pinnars slalom är inte tillåtet i Nollklass", () => {
    const c = codes(agility({ classTemplate: "noll_slalom", obstacles: [ob("w", "weave_8", 1, 15, 20)] }));
    expect(c).toContain("type_not_allowed");
  });
});

describe("Hoopers — maxavstånd", () => {
  const hoopers = (classTemplate: CourseLite["classTemplate"], ruleSetId: string, sizeClass: CourseLite["sizeClass"] = "L", gap = 7.5) => validateCourse({
    sport: "hoopers",
    sizeClass,
    arenaWidthM: 30,
    arenaHeightM: 30,
    classTemplate,
    ruleSetId,
    obstacles: [
      ob("h1", "hoop", 1, 5, 10),
      ob("h2", "hoop", 2, 5 + gap, 10),
      ob("zone", "handler_zone", undefined, 9, 24),
    ],
  });

  it("SHoK startklass: följdhinder över 7 m varnar", () => {
    expect(hoopers("hoopers_1", "hoopers-shs-2022").some((i) => i.code === "hoopers_too_far")).toBe(true);
    expect(hoopers("hoopers_2", "hoopers-shs-2022").some((i) => i.code === "hoopers_too_far")).toBe(false);
  });

  it("FCI: Small har kortare maxavstånd från dirigeringsområdet än Large", () => {
    // Hinder 2 ligger ≈ 14,1 m från DO: OK för Large H1 (15 m), inte för Small (12 m).
    expect(hoopers("hoopers_fci_h1", "hoopers-fci-2026", "L", 7).some((i) => i.code === "handler_zone_max_distance")).toBe(false);
    expect(hoopers("hoopers_fci_h1", "hoopers-fci-2026", "S", 7).some((i) => i.code === "handler_zone_max_distance")).toBe(true);
  });
});

describe("Tunnellängd", () => {
  it("en 6 m tunnel är 6 m genom hundvägen och kortar kordan när den böjs", () => {
    const straight = { type: "tunnel" as const, lengthM: 6 };
    expect(obstacleSizeM(straight).w).toBeCloseTo(6);
    const bent = { type: "tunnel" as const, lengthM: 6, curveDeg: 180 };
    expect(obstacleSizeM(bent).w).toBeCloseTo(12 / Math.PI, 2);
    expect(tunnelLengthM(bent)).toBe(6);
    const path = buildDogPath([{ id: "t", type: "tunnel", x: 15, y: 20, rotation: 0, number: 1, lengthM: 6, curveDeg: 180 }]);
    expect(path.obstacleM).toBeCloseTo(6, 1);
  });

  it("äldre tunnlar utan längd behåller sin geometri", () => {
    expect(obstacleSizeM({ type: "tunnel" }).w).toBe(3);
    expect(obstacleSizeM({ type: "tunnel", curveDeg: 90 }).w).toBe(3);
  });
});

describe("regelverkets giltighet", () => {
  it("SAgiK 2022–2026 räknas som utgånget från 2027", () => {
    expect(isRuleSetExpired(SKK_AGILITY_2023, new Date("2026-12-31T12:00:00Z"))).toBe(false);
    expect(isRuleSetExpired(SKK_AGILITY_2023, new Date("2027-01-02T12:00:00Z"))).toBe(true);
  });
});
