import { describe, expect, it } from "vitest";
import { NOLLKLASS_COURSES } from "./nollklassCourses";
import { NOLLKLASS_BANK_COURSES } from "./courseBank";
import { validateNollklassCourse } from "./nollklassQuality";
import { computeDogPathPairDistances } from "./dogPath";

describe("Nollklassbanken 2026", () => {
  it("har tre varianter i både 25×30 och 15×30", () => {
    expect(NOLLKLASS_COURSES).toHaveLength(6);
    expect(new Set(NOLLKLASS_COURSES.map((c) => c.classTemplate))).toEqual(
      new Set(["noll_mur", "noll_slalom", "noll_balans"]),
    );
    expect(new Set(NOLLKLASS_COURSES.map((c) => `${c.arenaWidthM}x${c.arenaHeightM}`))).toEqual(
      new Set(["25x30", "15x30"]),
    );
  });

  it("har original + spegel för samtliga sex layouter", () => {
    expect(NOLLKLASS_BANK_COURSES).toHaveLength(12);
  });

  for (const course of NOLLKLASS_BANK_COURSES) {
    it(`${course.label} passerar Nollklass-grinden`, () => {
      const issues = validateNollklassCourse(course);
      const errors = issues.filter((issue) => issue.level === "error");
      expect(errors, errors.map((e) => `${e.code}: ${e.message}`).join("\n")).toEqual([]);
    });

    it(`${course.label} har 6–8 m hundväg mellan varje passage`, () => {
      const distances = computeDogPathPairDistances(
        course.obstacles.map((o, index) => ({ ...o, id: `${course.key}-${index}` })),
      );
      expect(distances).toHaveLength(12);
      for (const pair of distances) {
        expect(pair.distanceM, `${pair.fromNumber}→${pair.toNumber}`).toBeGreaterThanOrEqual(5.99);
        expect(pair.distanceM, `${pair.fromNumber}→${pair.toNumber}`).toBeLessThanOrEqual(8.01);
      }
    });
  }
});
