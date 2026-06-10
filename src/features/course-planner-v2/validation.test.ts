/**
 * Tester för banplanerarens beräknings- och valideringskärna.
 * Säkerhetslogiken är affärskritisk — buggar här kan släppa igenom osäkra banor.
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
      ob({ type: "jump", x: 100, y: 100 }), // onumrerad — ska ignoreras
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

  it("utan klassmall: refTimeS och maxTimeS = null, längd stämmer", () => {
    const t = computeCourseTimes(makeCourse({ obstacles: obs }));
    expect(t.lengthM).toBeCloseTo(10, 6);
    expect(t.refTimeS).toBeNull();
    expect(t.maxTimeS).toBeNull();
  });

  it("med klassmall agility_1 (refSpeed 2.5, maxFactor 1.5): ref=4s, max=6s för 10 m", () => {
    const t = computeCourseTimes(makeCourse({ obstacles: obs, classTemplate: "agility_1" }));
    expect(t.lengthM).toBeCloseTo(10, 6);
    // round(10 / 2.5) = 4
    expect(t.refTimeS).toBe(4);
    // round(4 * 1.5) = 6
    expect(t.maxTimeS).toBe(6);
  });
});

describe("validateCourse — säkerhetsavstånd", () => {
  it("två hopp 1.5 m isär i klass L (combo 4.0) → error jump_too_close", () => {
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

  it("REGRESSION: hopp 1.5 m efter tunnel (blandat par) i klass L → warning, inte tyst", () => {
    // Detta fall föll tidigare i ingen-gren och flaggades aldrig.
    const course = makeCourse({
      obstacles: [
        ob({ type: "start", x: 0, y: 0 }),
        ob({ type: "tunnel", x: 5, y: 5, number: 1 }),
        ob({ type: "jump", x: 5, y: 6.5, number: 2 }),
        ob({ type: "finish", x: 10, y: 10 }),
      ],
    });
    const issues = validateCourse(course);
    // ska ge en avstånds-relaterad varning för paret 1→2
    const close = issues.find(
      (i) =>
        i.code === "obstacles_close" &&
        i.level === "warning" &&
        i.message.includes("1→2"),
    );
    expect(close).toBeDefined();
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
    expect(issues.some((i) => i.code === "duplicate_number" && i.level === "error")).toBe(true);
  });

  it("hål i numrering (1,2,4) → numbering_gap warning", () => {
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
    expect(issues.some((i) => i.code === "numbering_gap" && i.level === "warning")).toBe(true);
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
