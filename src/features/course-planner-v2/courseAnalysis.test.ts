import { describe, it, expect } from "vitest";
import { computeApproachIssues, analyzeCourse } from "./courseAnalysis";
import type { ObstacleLite } from "./validation";

function ob(partial: Partial<ObstacleLite> & { id: string; type: ObstacleLite["type"]; x: number; y: number }): ObstacleLite {
  return { rotation: 0, ...partial } as ObstacleLite;
}

describe("computeApproachIssues — Prompt C", () => {
  it("flaggar däck som tas i 45°-vinkel", () => {
    // Tire roterad 0° → travel-axel pekar +Y. Hund kommer från (5,0) → tire vid (0,5):
    // approach-vektor (-5, +5), normaliserad (-0.707, 0.707). Vinkel mot (0,1) = 45°.
    const obstacles: ObstacleLite[] = [
      ob({ id: "j1", type: "jump", x: 5, y: 0, number: 1 }),
      ob({ id: "tire", type: "tire", x: 0, y: 5, rotation: 0, number: 2 }),
    ];
    const issues = computeApproachIssues(obstacles);
    const bad = issues.find((i) => i.code === "bad_approach_angle" && i.obstacleId === "tire");
    expect(bad).toBeDefined();
    expect(bad?.level).toBe("error");
  });

  it("flaggar inte däck med rak ansats", () => {
    // Tire vid (0,5), föregående hopp rakt söder om — approach (0, +5) parallellt entryDir.
    const obstacles: ObstacleLite[] = [
      ob({ id: "j1", type: "jump", x: 0, y: 0, number: 1 }),
      ob({ id: "tire", type: "tire", x: 0, y: 5, rotation: 0, number: 2 }),
    ];
    const issues = computeApproachIssues(obstacles);
    expect(issues.find((i) => i.code === "bad_approach_angle" && i.obstacleId === "tire")).toBeUndefined();
  });
});

describe("analyzeCourse — bananalys", () => {
  it("ger låg svårighet på enkel rak bana", () => {
    const obstacles: ObstacleLite[] = [
      ob({ id: "1", type: "jump", x: 0, y: 0, number: 1 }),
      ob({ id: "2", type: "jump", x: 0, y: 6, number: 2 }),
      ob({ id: "3", type: "jump", x: 0, y: 12, number: 3 }),
    ];
    const a = analyzeCourse(obstacles);
    expect(a.difficultyLabel).toBe("Lätt");
    expect(a.sharpTurns).toBe(0);
  });

  it("ger högre svårighet med många riktningsbyten", () => {
    const obstacles: ObstacleLite[] = [
      ob({ id: "1", type: "jump", x: 0, y: 0, number: 1 }),
      ob({ id: "2", type: "jump", x: 5, y: 0, number: 2 }),
      ob({ id: "3", type: "jump", x: 5, y: 5, number: 3 }),
      ob({ id: "4", type: "jump", x: 0, y: 5, number: 4 }),
      ob({ id: "5", type: "jump", x: 0, y: 0.5, number: 5 }),
    ];
    const a = analyzeCourse(obstacles);
    expect(a.difficultyScore).toBeGreaterThan(0);
  });
});
