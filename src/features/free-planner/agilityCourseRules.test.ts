import { describe, expect, it } from "vitest";
import { validateAgilityCourse, type AgilityObstacleType, type PlannerObstacle } from "./agilityCourseRules";

const ring = { widthM: 40, heightM: 30 };
const points = [
  [6, 5], [13, 5], [20, 5], [27, 5], [34, 5],
  [34, 12], [27, 12], [20, 12], [13, 12], [6, 12],
  [6, 19], [13, 19], [20, 19], [27, 19], [34, 19],
  [34, 26], [27, 26], [20, 26], [13, 26], [6, 26],
] as const;

function makeCourse(types: AgilityObstacleType[]): PlannerObstacle[] {
  return types.map((type, index) => {
    const current = points[index];
    const previous = index === 0 ? [0, 5] : points[index - 1];
    const incoming = (Math.atan2(current[1] - previous[1], current[0] - previous[0]) * 180) / Math.PI;
    return {
      id: `o-${index + 1}`,
      type,
      x: (current[0] / ring.widthM) * 100,
      y: (current[1] / ring.heightM) * 100,
      rotation: incoming - 90,
      number: index + 1,
    };
  });
}

const validSwedishAgility = makeCourse([
  "jump", "jump", "tunnel", "jump", "dogwalk",
  "jump", "weave", "jump", "tunnel", "aframe",
  "jump", "jump", "longjump", "jump", "seesaw",
  "jump", "wall", "tunnel", "jump", "jump",
]);

describe("validateAgilityCourse", () => {
  it("accepts the built-in Swedish class 1 base layout", () => {
    const result = validateAgilityCourse(validSwedishAgility, ring, "agility", 1, "sweden");
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(result.jumpPassages).toBeGreaterThanOrEqual(7);
    expect(Math.round(result.approximateLengthM)).toBe(133);
  });

  it("rejects a class 1 spread hurdle", () => {
    const course = validSwedishAgility.map((item) => ({ ...item }));
    course[3].type = "spread";
    const result = validateAgilityCourse(course, ring, "agility", 1, "sweden");
    expect(result.issues.some((issue) => issue.code === "spread-class-1")).toBe(true);
  });

  it("rejects contact obstacles in jumping", () => {
    const result = validateAgilityCourse(validSwedishAgility, ring, "jumping", 1, "sweden");
    expect(result.issues.some((issue) => issue.code === "contacts-jumping")).toBe(true);
  });

  it("detects Swedish spacing outside 6–8 metres", () => {
    const course = validSwedishAgility.map((item) => ({ ...item }));
    course[1].x = course[0].x + 2;
    const result = validateAgilityCourse(course, ring, "agility", 1, "sweden");
    expect(result.issues.some((issue) => issue.code === "spacing-sweden")).toBe(true);
  });
});
