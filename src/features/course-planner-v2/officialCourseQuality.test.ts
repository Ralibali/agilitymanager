import { describe, expect, it } from "vitest";
import { COURSE_BANK, type CourseBankEntry } from "./courseBank";
import {
  isOfficialSwedishCompetitionTemplate,
  validateOfficialSwedishCourse,
} from "./officialCourseQuality";
import { buildDogPath, computeDogPathPairDistances } from "./dogPath";

function withIds(course: CourseBankEntry) {
  return {
    ...course,
    obstacles: course.obstacles.map((o, index) => ({ ...o, id: `${course.key}-${index}` })),
  };
}

describe("inbyggda svenska tävlingsbanor", () => {
  const swedish = COURSE_BANK.filter((course) =>
    isOfficialSwedishCompetitionTemplate(course.classTemplate),
  );

  it("har två kvalitetstestade banor för agility och hopp i klass 1, 2 och 3", () => {
    const expected = [
      "agility_1",
      "agility_2",
      "agility_3",
      "agility_hopp_1",
      "agility_hopp_2",
      "agility_hopp_3",
    ] as const;

    expect(swedish).toHaveLength(12);
    for (const classTemplate of expected) {
      expect(swedish.filter((c) => c.classTemplate === classTemplate)).toHaveLength(2);
    }
  });

  it("har exakt sex spegelbanor och varje spegel har ett original", () => {
    const mirrors = swedish.filter((course) => course.bankKind === "mirror");
    expect(mirrors).toHaveLength(6);
    for (const mirror of mirrors) {
      expect(mirror.sourceKey).toBeTruthy();
      expect(COURSE_BANK.some((course) => course.key === mirror.sourceKey && course.bankKind === "original")).toBe(true);
    }
  });

  for (const course of swedish) {
    it(`${course.label} passerar den officiella kvalitetsgrinden`, () => {
      const issues = validateOfficialSwedishCourse(withIds(course));
      const errors = issues.filter((issue) => issue.level === "error");
      expect(errors, errors.map((e) => `${e.code}: ${e.message}`).join("\n")).toEqual([]);
    });

    it(`${course.label} har 6–8 m beräknad hundväg mellan varje följdhinder`, () => {
      const distances = computeDogPathPairDistances(
        course.obstacles
          .filter((o) => o.number != null)
          .map((o, index) => ({ ...o, id: `${course.key}-path-${index}` })),
      );
      expect(distances.length).toBeGreaterThanOrEqual(14);
      for (const pair of distances) {
        expect(pair.distanceM, `${course.label} ${pair.fromNumber}→${pair.toNumber}`).toBeGreaterThanOrEqual(5.99);
        expect(pair.distanceM, `${course.label} ${pair.fromNumber}→${pair.toNumber}`).toBeLessThanOrEqual(8.01);
      }
    });
  }
});

describe("spegelbanornas geometri", () => {
  const mirrors = COURSE_BANK.filter((course) => course.bankKind === "mirror");

  for (const mirror of mirrors) {
    it(`${mirror.label} är en exakt x-spegling av sitt original`, () => {
      const source = COURSE_BANK.find((course) => course.key === mirror.sourceKey);
      expect(source).toBeDefined();
      expect(mirror.obstacles).toHaveLength(source?.obstacles.length ?? -1);

      source?.obstacles.forEach((sourceObstacle, index) => {
        const mirroredObstacle = mirror.obstacles[index];
        expect(mirroredObstacle.type).toBe(sourceObstacle.type);
        expect(mirroredObstacle.number).toBe(sourceObstacle.number);
        expect(mirroredObstacle.y).toBeCloseTo(sourceObstacle.y, 6);
        expect(mirroredObstacle.x + sourceObstacle.x).toBeCloseTo(source.arenaWidthM, 2);
      });
    });
  }
});

describe("hundlinjens färdriktning", () => {
  it("vänder ett hinder automatiskt när nummerföljden kommer från motsatt sida", () => {
    const path = buildDogPath([
      { id: "1", type: "jump", x: 5, y: 5, rotation: 0, number: 1 },
      { id: "2", type: "jump", x: 5, y: 12, rotation: 180, number: 2 },
      { id: "3", type: "jump", x: 5, y: 19, rotation: 0, number: 3 },
    ]);

    expect(path.anchors).toHaveLength(3);
    expect(path.anchors[1].exit.y).toBeGreaterThan(path.anchors[1].entry.y);
  });
});
