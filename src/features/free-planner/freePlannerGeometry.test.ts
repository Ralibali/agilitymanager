import { describe, it, expect } from "vitest";
import {
  clampPercent,
  clampPercentPoint,
  clientPointToPercent,
  obstacleCountExcludingMarkers,
  nextFreeObstaclePosition,
  FREE_MIN_PCT,
  FREE_MAX_PCT,
} from "./freePlannerGeometry";

describe("freePlannerGeometry", () => {
  it("clampPercent limits to [3, 97]", () => {
    expect(clampPercent(-10)).toBe(FREE_MIN_PCT);
    expect(clampPercent(0)).toBe(FREE_MIN_PCT);
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(120)).toBe(FREE_MAX_PCT);
    expect(clampPercent(Number.NaN)).toBe(FREE_MIN_PCT);
  });

  it("clampPercentPoint clamps both axes", () => {
    expect(clampPercentPoint({ x: -5, y: 200 })).toEqual({ x: FREE_MIN_PCT, y: FREE_MAX_PCT });
  });

  it("clientPointToPercent converts and clamps", () => {
    const rect = { left: 100, top: 200, width: 400, height: 300 };
    expect(clientPointToPercent(rect, 100, 200)).toEqual({ x: FREE_MIN_PCT, y: FREE_MIN_PCT });
    expect(clientPointToPercent(rect, 300, 350)).toEqual({ x: 50, y: 50 });
    expect(clientPointToPercent(rect, 500, 500)).toEqual({ x: FREE_MAX_PCT, y: FREE_MAX_PCT });
    expect(clientPointToPercent(rect, -1000, -1000)).toEqual({ x: FREE_MIN_PCT, y: FREE_MIN_PCT });
  });

  it("clientPointToPercent handles zero-sized rect", () => {
    expect(clientPointToPercent({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({
      x: FREE_MIN_PCT,
      y: FREE_MIN_PCT,
    });
  });

  it("obstacleCountExcludingMarkers ignores start/finish", () => {
    const obstacles = [
      { id: "1", type: "start", x: 0, y: 0 },
      { id: "2", type: "jump", x: 0, y: 0 },
      { id: "3", type: "tunnel", x: 0, y: 0 },
      { id: "4", type: "finish", x: 0, y: 0 },
    ];
    expect(obstacleCountExcludingMarkers(obstacles)).toBe(2);
  });

  it("nextFreeObstaclePosition stays within bounds and varies", () => {
    const positions = Array.from({ length: 8 }, (_, i) => nextFreeObstaclePosition(i + 1));
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(FREE_MIN_PCT);
      expect(p.x).toBeLessThanOrEqual(FREE_MAX_PCT);
      expect(p.y).toBeGreaterThanOrEqual(FREE_MIN_PCT);
      expect(p.y).toBeLessThanOrEqual(FREE_MAX_PCT);
    }
    const unique = new Set(positions.map((p) => `${p.x}:${p.y}`));
    expect(unique.size).toBeGreaterThan(4);
  });
});
