/**
 * Kvalitetsgrind för banbanken: varje färdig bana som visas i biblioteket
 * (original och spegelvänd) ska klara planerarens egen regelkontroll utan
 * fel eller varningar. Det är det som etiketten "Kontrollerad mot svenska
 * klassregler" i biblioteket utlovar.
 */
import { describe, expect, it } from "vitest";
import { COURSE_BANK } from "./courseBank";
import { validateCourse } from "./validation";
import { getDefaultRuleSetIdForSport } from "./rules";

describe("banbanken klarar regelkontrollen", () => {
  for (const course of COURSE_BANK) {
    it(`${course.key} (${course.classTemplate})`, () => {
      const issues = validateCourse({
        sport: course.sport,
        sizeClass: course.defaultSize,
        arenaWidthM: course.arenaWidthM,
        arenaHeightM: course.arenaHeightM,
        classTemplate: course.classTemplate,
        obstacles: course.obstacles.map((o, i) => ({ ...o, id: `${course.key}-${i}` })),
        ruleSetId: getDefaultRuleSetIdForSport(course.sport),
      });
      const problems = issues
        .filter((i) => i.level !== "info")
        .map((i) => `${i.level} ${i.code}: ${i.message}`);
      expect(problems).toEqual([]);
    });
  }
});
