import { describe, expect, it } from "vitest";
import { PREBUILT_COURSES } from "./templates";
import {
  isOfficialSwedishCompetitionTemplate,
  validateOfficialSwedishCourse,
} from "./officialCourseQuality";
import { buildDogPath, computeDogPathPairDistances } from "./dogPath";

function withIds(course: (typeof PREBUILT_COURSES)[number]) {
  return {
    ...course,
    obstacles: course.obstacles.map((o, index) => ({ ...o, id: `${course.key}-${index}` })),
  };
}

describe("inbyggda svenska tävlingsbanor", () => {
  const swedish = PREBUILT_COURSES.filter((course) =>
    isOfficialSwedishCompetitionTemplate(course.classTemplate),
  );

  it("har täckning för agility och hopp i klass 1, 2 och 3", () => {
    expect(swedish.map((c) => c.classTemplate).sort()).toEqual([
      "agility_1",
      "agility_2",
      "agility_3",
      "agility_hopp_1",
      "agility_hopp_2",
      "agility_hopp_3",
    ].sort());
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

describe("hundlinjens färdriktning", () => {
  it("vänder ett hinder automatiskt när nummerföljden kommer från motsatt sida", () => {
    const path = buildDogPath([
      { id: "1", type: "jump", x: 5, y: 5, rotation: 0, number: 1 },
      { id: "2", type: "jump", x: 5, y: 12, rotation: 180, number: 2 },
      { id: "3", type: "jump", x: 5, y: 19, rotation: 0, number: 3 },
    ]);

    expect(path.anchors).toHaveLength(3);
    // Oberoende av om rotationen är 0 eller 180 ska hunden färdas nedåt
    // genom sekvensen och alltså lämna #2 på sidan närmast #3.
    expect(path.anchors[1].exit.y).toBeGreaterThan(path.anchors[1].entry.y);
  });
});
