import { describe, expect, it } from "vitest";
import { validateAgilityCourse } from "./agilityCourseRules";
import { COURSE_BANK } from "./courseBank";

describe("course bank", () => {
  it("contains a useful mix of agility and jumping courses", () => {
    expect(COURSE_BANK.length).toBeGreaterThanOrEqual(8);
    expect(COURSE_BANK.some((course) => course.kind === "agility")).toBe(true);
    expect(COURSE_BANK.some((course) => course.kind === "jumping")).toBe(true);
    expect(new Set(COURSE_BANK.map((course) => course.competitionClass))).toEqual(new Set([1, 2, 3]));
  });

  for (const course of COURSE_BANK) {
    it(`${course.id} passes the built-in Swedish plan checks`, () => {
      const result = validateAgilityCourse(
        course.obstacles,
        course.ring,
        course.kind,
        course.competitionClass,
        course.ruleset,
      );

      expect(
        result.issues.filter((issue) => issue.severity === "error"),
        JSON.stringify(result.issues, null, 2),
      ).toEqual([]);
      expect(result.validCompetitionCourse).toBe(true);
    });
  }
});
