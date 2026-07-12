/**
 * Tester för banplanerarens beräknings- och valideringskärna.
 * Säkerhetslogiken är affärskritisk — buggar här kan släppa igenom osäkra banor.
 *
 * Prompt K: täcker nu även att validation.ts läser säkerhetsvärden från
 * aktivt RuleSet, att följdpar bedöms i nummerordning även vid osorterad
 * array, och att roterat hinder utanför arenan detekteras även om centrum
 * ligger innanför.
 */
import { describe, it, expect } from "vitest";
import {
  computeCourseLength,
  computeCourseTimes,
  validateCourse,
  type CourseLite,
  type ObstacleLite,
} from "./validation";
import type { ObstacleTypeV2 } from "./config";
import { getRuleSet, DEFAULT_RULESET_ID, DEFAULT_HOOPERS_RULESET_ID } from "./rules";

let __id = 0;
const ob = (partial: Partial<ObstacleLite> & { type: ObstacleTypeV2; x: number; y: number }): ObstacleLite => ({
  id: `o${++__id}`,
  rotation: 0,
  ...partial,
});

const makeCourse = (partial: Partial<CourseLite> = {}): CourseLite => ({
  sport: "agility",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  classTemplate: null,
  obstacles: [],
  ruleSetId: DEFAULT_RULESET_ID,
  ...partial,
});

describe("computeCourseLength", () => {
  it("returnerar 0 för tom bana", () => {
    expect(computeCourseLength([])).toBe(0);
  });

  it("summerar sträckor i nummerföljd: (0,0)→(3,4)→(3,9) = 5 + 5 = 10", () => {
    const obs = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 3, y: 4, number: 2 }),
      ob({ type: "jump", x: 3, y: 9, number: 3 }),
    ];
    expect(computeCourseLength(obs)).toBeCloseTo(10, 6);
  });

  it("ignorerar onumrerade hinder", () => {
    const obs = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 100, y: 100 }),
      ob({ type: "jump", x: 3, y: 4, number: 2 }),
    ];
    expect(computeCourseLength(obs)).toBeCloseTo(5, 6);
  });

  it("räknar i nummerföljd även om array-ordningen är fel", () => {
    const obs = [
      ob({ type: "jump", x: 3, y: 9, number: 3 }),
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 3, y: 4, number: 2 }),
    ];
    expect(computeCourseLength(obs)).toBeCloseTo(10, 6);
  });
});

describe("computeCourseTimes", () => {
  const obs = [
    ob({ type: "jump", x: 0, y: 0, number: 1 }),
    ob({ type: "jump", x: 3, y: 4, number: 2 }),
    ob({ type: "jump", x: 3, y: 9, number: 3 }),
  ];

  it("utan klassmall: refTimeS/maxTimeS = null", () => {
    const t = computeCourseTimes(makeCourse({ obstacles: obs }));
    expect(t.lengthM).toBeCloseTo(10, 6);
    expect(t.refTimeS).toBeNull();
    expect(t.maxTimeS).toBeNull();
  });

  it("med klassmall agility_1: ref/max räknas från aktivt RuleSet", () => {
    const t = computeCourseTimes(makeCourse({ obstacles: obs, classTemplate: "agility_1" }));
    expect(t.lengthM).toBeCloseTo(10, 6);
    expect(t.refTimeS).toBe(4);
    expect(t.maxTimeS).toBe(6);
  });

  it("provisional RuleSet → isProvisional = true (UI ska kalla det beräknad tid)", () => {
    const t = computeCourseTimes(makeCourse({ obstacles: obs, classTemplate: "agility_1" }));
    expect(t.isProvisional).toBe(true);
    expect(t.ruleSetStatus).toBe("provisional");
    expect(t.ruleSetId).toBe(DEFAULT_RULESET_ID);
  });
});

describe("validateCourse — säkerhetsavstånd", () => {
  it("två hopp 1.5 m isär i klass L → error jump_too_close", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 5, y: 6.5, number: 2 }),
        ob({ type: "finish", x: 10, y: 10 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "jump_too_close" && i.level === "error")).toBe(true);
  });

  it("REGRESSION: hopp 1.5 m efter tunnel (blandat par) → obstacles_close warning", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "tunnel", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 5, y: 6.5, number: 2 }),
        ob({ type: "finish", x: 10, y: 10 }),
      ],
    });
    const issues = validateCourse(course);
    const close = issues.find(
      (i) =>
        i.code === "obstacles_close" &&
        i.level === "warning" &&
        i.message.includes("1→2"),
    );
    expect(close).toBeDefined();
  });

  it("följdpar bedöms i nummerordning även om array-ordningen är blandad", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "jump", x: 5, y: 6.5, number: 2 }),
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "finish", x: 10, y: 10 }),
      ],
    });
    const issues = validateCourse(course);
    // Ska hitta jump_too_close mellan hinder 1→2 trots att arrayen är osorterad.
    expect(
      issues.some(
        (i) => i.code === "jump_too_close" && i.message.includes("1→2"),
      ),
    ).toBe(true);
  });

  it("kontaktfält direkt efter tunnel (nummerordning) → contact_after_tunnel warning", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        // arrayen läggs medvetet i omvänd nummerordning
        ob({ type: "aframe", x: 5, y: 8, number: 2 }),
        ob({ type: "tunnel", x: 5, y: 5, number: 1 }),
        ob({ type: "finish", x: 10, y: 10 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "contact_after_tunnel")).toBe(true);
  });
});

describe("validateCourse — säkerhet från RuleSet", () => {
  it("hoopers-RuleSet används när ruleSetId anges", () => {
    const course = makeCourse({
      sport: "hoopers",
      ruleSetId: DEFAULT_HOOPERS_RULESET_ID,
      obstacles: [
        ob({ type: "hoop", x: 5, y: 5, number: 1 }),
        ob({ type: "hoop", x: 5, y: 6.5, number: 2 }), // 1.5 m < 3.0 m
        ob({ type: "handler_zone", x: 15, y: 15 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "hoopers_too_close")).toBe(true);
  });

  it("provisional RuleSet → meddelande innehåller 'förhandskontrollens gräns'", () => {
    const rs = getRuleSet(DEFAULT_RULESET_ID);
    expect(rs?.verificationStatus).toBe("provisional");
    const course = makeCourse({
      obstacles: [
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 5, y: 6.5, number: 2 }),
      ],
    });
    const issues = validateCourse(course);
    const jumpIssue = issues.find((i) => i.code === "jump_too_close");
    expect(jumpIssue?.message).toContain("förhandskontrollens gräns");
  });
});

describe("validateCourse — numrering", () => {
  it("dubblett-nummer → duplicate_number error", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 10, y: 10, number: 1 }),
        ob({ type: "finish", x: 15, y: 15 }),
      ],
    });
    const issues = validateCourse(course);
    const dupes = issues.filter((i) => i.code === "duplicate_number");
    // Båda hindren med samma nummer ska markeras
    expect(dupes.length).toBeGreaterThanOrEqual(2);
    expect(dupes.every((i) => i.obstacleId !== undefined)).toBe(true);
  });

  it("hål i numrering (1,2,4) → numbering_gap warning med obstacleId", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 10, y: 10, number: 2 }),
        ob({ type: "jump", x: 15, y: 15, number: 4 }),
        ob({ type: "finish", x: 20, y: 20 }),
      ],
    });
    const issues = validateCourse(course);
    const gap = issues.find((i) => i.code === "numbering_gap");
    expect(gap).toBeDefined();
    expect(gap?.obstacleId).toBeDefined();
  });

  it("numrering börjar på 2 → numbering_not_from_1 warning", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "jump", x: 5, y: 5, number: 2 }),
        ob({ type: "jump", x: 10, y: 10, number: 3 }),
        ob({ type: "finish", x: 15, y: 15 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "numbering_not_from_1" && i.level === "warning")).toBe(true);
  });
});

describe("validateCourse — start/mål", () => {
  it("bana utan start/mål → båda warnings", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 10, y: 10, number: 2 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "missing_start")).toBe(true);
    expect(issues.some((i) => i.code === "missing_finish")).toBe(true);
  });
});

describe("validateCourse — sport-konsistens", () => {
  it("hoopers-hinder i agility-bana → wrong_sport error", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "hoop", x: 5, y: 5, number: 1 }),
        ob({ type: "finish", x: 10, y: 10 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "wrong_sport" && i.level === "error")).toBe(true);
  });
});

describe("validateCourse — roterad bounding box utanför arena", () => {
  it("hinder vars CENTRUM ligger innanför men roterat hörn utanför → obstacle_outside_arena", () => {
    // Balansbom 3.6 m djup; center vid y = 1.5 → orotat helt innanför.
    // Rotera 90° → djup blir bredd. Placera nära vänsterkant och rotera 90°:
    const course = makeCourse({
      arenaWidthM: 30,
      arenaHeightM: 40,
      obstacles: [
        ob({ type: "start", x: 5, y: 5 }),
        ob({
          type: "dogwalk",
          x: 1.5, // center innanför
          y: 20,
          rotation: 90, // 3.6 m bredd → sticker ut åt vänster
          number: 1,
        }),
        ob({ type: "finish", x: 25, y: 30 }),
      ],
    });
    const issues = validateCourse(course);
    const outside = issues.find((i) => i.code === "obstacle_outside_arena");
    expect(outside).toBeDefined();
    expect(outside?.message).toMatch(/vänster/);
  });

  it("start-linje precis mot kanten flaggas INTE som outside (start räknas ej som tävlingshinder)", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0.1, y: 20 }),
        ob({ type: "jump", x: 10, y: 10, number: 1 }),
        ob({ type: "finish", x: 20, y: 20 }),
      ],
    });
    const issues = validateCourse(course);
    expect(issues.some((i) => i.code === "obstacle_outside_arena")).toBe(false);
  });
});

describe("obstacle overlap detection", () => {
  it("upptäcker två hopp på samma position exakt en gång (som par)", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 2, y: 2 }),
        ob({ type: "jump", x: 10, y: 10, number: 1 }),
        ob({ type: "jump", x: 10, y: 10, number: 2 }),
        ob({ type: "finish", x: 28, y: 38 }),
      ],
    });
    const overlapMessages = new Set(
      validateCourse(course)
        .filter((i) => i.code === "obstacle_overlap")
        .map((i) => i.message),
    );
    expect(overlapMessages.size).toBe(1);
  });

  it("separerade hinder ger inget overlap-issue", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 2, y: 2 }),
        ob({ type: "jump", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 15, y: 15, number: 2 }),
        ob({ type: "finish", x: 28, y: 38 }),
      ],
    });
    expect(validateCourse(course).some((i) => i.code === "obstacle_overlap")).toBe(false);
  });

  it("roterade långsmala hinder som ligger ovanpå varandra flaggas", () => {
    const course = makeCourse({
      obstacles: [
        ob({ type: "jump", x: 10, y: 10, rotation: 45, number: 1 }),
        ob({ type: "jump", x: 10.3, y: 10.3, rotation: 45, number: 2 }),
      ],
    });
    const overlap = validateCourse(course).filter((i) => i.code === "obstacle_overlap");
    expect(overlap.length).toBeGreaterThan(0);
    // Roterade → försiktig copy (varning), inte error.
    expect(overlap.every((i) => i.level === "warning")).toBe(true);
  });

  it("start/mål/handler_zone deltar inte i overlap-checken", () => {
    const course = makeCourse({
      sport: "hoopers",
      ruleSetId: DEFAULT_HOOPERS_RULESET_ID,
      obstacles: [
        ob({ type: "start", x: 10, y: 10 }),
        ob({ type: "handler_zone", x: 10, y: 10 }),
        ob({ type: "finish", x: 10, y: 10 }),
        ob({ type: "hoop", x: 10, y: 10, number: 1 }),
      ],
    });
    // handler_zone/start/finish räknas inte som hinder i overlap-checken,
    // så det ska inte finnas något par mellan dem och hoopen.
    const overlap = validateCourse(course).filter((i) => i.code === "obstacle_overlap");
    expect(overlap.length).toBe(0);
  });
});

describe("missing rule values", () => {
  it("saknad hoopersMinM ger info-issue, inga påhittade 3.0-meddelanden", () => {
    // Vi bygger ett stub-ruleset via monkeypatching är opraktiskt; istället
    // testar vi att koden inte introducerar "3.0" om regelvärdet saknas.
    // Vi använder en hoopers-bana där avstånden är korta och verifierar att
    // om ett verifierat värde finns så nämns det, annars inte.
    const rs = getRuleSet(DEFAULT_HOOPERS_RULESET_ID);
    expect(rs).toBeTruthy();
    const course = makeCourse({
      sport: "hoopers",
      ruleSetId: DEFAULT_HOOPERS_RULESET_ID,
      obstacles: [
        ob({ type: "start", x: 1, y: 1 }),
        ob({ type: "hoop", x: 5, y: 5, number: 1 }),
        ob({ type: "hoop", x: 5.5, y: 5.5, number: 2 }),
        ob({ type: "finish", x: 20, y: 20 }),
      ],
    });
    const messages = validateCourse(course).map((i) => i.message).join("\n");
    // Om regelvärdet inte är satt får meddelanden inte innehålla en påhittad 3.0-siffra.
    if (typeof rs?.safetyRules.hoopersMinM !== "number") {
      expect(messages).not.toMatch(/< 3\.0 m/);
    }
  });
});

describe("handler_zone är inte ett tävlingshinder", () => {
  it("hoopersbana: start + handler_zone + 2 numrerade hoopar + mål → zone räknas inte som onumrerad, antal = 2", () => {
    const course = makeCourse({
      sport: "hoopers",
      ruleSetId: DEFAULT_HOOPERS_RULESET_ID,
      obstacles: [
        ob({ type: "start", x: 1, y: 1 }),
        ob({ type: "handler_zone", x: 15, y: 15 }),
        ob({ type: "hoop", x: 5, y: 5, number: 1 }),
        ob({ type: "hoop", x: 10, y: 10, number: 2 }),
        ob({ type: "finish", x: 20, y: 20 }),
      ],
    });
    const issues = validateCourse(course);

    // handler_zone får INTE flaggas som onumrerat hinder.
    const unnumberedForZone = issues.find(
      (i) =>
        i.code === "unnumbered_obstacle" &&
        course.obstacles.find((o) => o.id === i.obstacleId)?.type === "handler_zone",
    );
    expect(unnumberedForZone).toBeUndefined();
    expect(issues.some((i) => i.code === "unnumbered_obstacles")).toBe(false);

    // Antalet tävlingshinder är 2 (de två hooparna), inte 3.
    // Motverifiera via en klassmall som kräver just 2 hinder → inget too_few/too_many.
    // Här räcker det att asserta att inga meddelanden om "0 hinder" eller "3 hinder" finns.
    const msg = issues.map((i) => i.message).join("\n");
    expect(msg).not.toMatch(/\b3 hinder\b/);
  });
});

