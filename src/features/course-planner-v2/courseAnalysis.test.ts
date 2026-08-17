import { describe, expect, it } from "vitest";
import { analyzeCourse, computeFlowCoachIssues } from "./courseAnalysis";
import type { ObstacleLite } from "./validation";

function jump(id: string, number: number, x: number, y: number, rotation = 0): ObstacleLite {
  return { id, type: "jump", number, x, y, rotation };
}

describe("planner course intelligence", () => {
  it("keeps empty courses neutral and bounded", () => {
    const analysis = analyzeCourse([]);
    expect(analysis.difficultyScore).toBe(0);
    expect(analysis.flowScore).toBe(100);
    expect(analysis.hotspots).toEqual([]);
    expect(analysis.spacingVariability).toBe(0);
  });

  it("recognises a simple straight line as easy flowing", () => {
    const obstacles = [
      jump("1", 1, 4, 10),
      jump("2", 2, 9, 10),
      jump("3", 3, 14, 10),
      jump("4", 4, 19, 10),
      jump("5", 5, 24, 10),
    ];
    const analysis = analyzeCourse(obstacles);
    expect(analysis.sharpTurns).toBe(0);
    expect(analysis.difficultyScore).toBeLessThan(35);
    expect(analysis.flowScore).toBeGreaterThan(70);
    expect(analysis.hotspots.filter((h) => h.score >= 52)).toHaveLength(0);
  });

  it("returns deterministic, sorted hotspots for a tight technical sequence", () => {
    const obstacles = [
      jump("1", 1, 5, 5),
      jump("2", 2, 8, 5),
      jump("3", 3, 5.2, 5.4),
      jump("4", 4, 8.2, 5.8),
      jump("5", 5, 5.4, 6.2),
    ];
    const analysis = analyzeCourse(obstacles);
    expect(analysis.hotspots.length).toBeGreaterThan(0);
    for (let i = 1; i < analysis.hotspots.length; i++) {
      expect(analysis.hotspots[i - 1].score).toBeGreaterThanOrEqual(analysis.hotspots[i].score);
    }
    expect(analysis.difficultyScore).toBeGreaterThanOrEqual(0);
    expect(analysis.difficultyScore).toBeLessThanOrEqual(100);
    expect(analysis.flowScore).toBeGreaterThanOrEqual(0);
    expect(analysis.flowScore).toBeLessThanOrEqual(100);
  });

  it("adds a human-readable course profile without calling it an official class", () => {
    const obstacles = [
      jump("1", 1, 4, 8),
      jump("2", 2, 9, 8),
      jump("3", 3, 14, 8),
      jump("4", 4, 19, 8),
    ];
    const issues = computeFlowCoachIssues(obstacles);
    const profile = issues.find((issue) => issue.code === "course_profile");
    expect(profile).toBeTruthy();
    expect(profile?.level).toBe("info");
    expect(profile?.message).toContain("planeringsstöd");
    expect(profile?.message.toLowerCase()).not.toContain("officiell klassning:");
  });
});
