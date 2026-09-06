/**
 * Böjd tunnel ska omfattas av bounds-kontrollen: bågen buktar utanför den
 * raka rektangeln, och tidigare AABB utgick från en rak tunnel.
 */
import { describe, expect, it } from "vitest";
import { tunnelWorldAabb } from "./tunnelGeometry";
import { validateCourse } from "./validation";
import { DEFAULT_RULESET_ID } from "./rules";

describe("tunnelns båge i bounds", () => {
  it("bågens AABB är högre än den raka tunnelns", () => {
    const straight = tunnelWorldAabb({ x: 10, y: 10 }, 5, 0.6, 0, 0, "right");
    const bent = tunnelWorldAabb({ x: 10, y: 10 }, 5, 0.6, 0, 120, "right");
    expect(bent.maxY - bent.minY).toBeGreaterThan(straight.maxY - straight.minY + 0.5);
    // Kordan (ändarnas placering) är oförändrad — gamla banors mått består.
    // Bredden växer bara med tunnelrörets tjocklek när ändarna lutar.
    expect(Math.abs(bent.minX - straight.minX)).toBeLessThan(0.4);
  });

  it("speglad böj buktar åt andra hållet", () => {
    const right = tunnelWorldAabb({ x: 10, y: 10 }, 5, 0.6, 0, 120, "right");
    const left = tunnelWorldAabb({ x: 10, y: 10 }, 5, 0.6, 0, 120, "left");
    expect(right.maxY - 10).toBeCloseTo(10 - left.minY, 5);
  });

  it("rotation roterar bågens AABB", () => {
    const a = tunnelWorldAabb({ x: 10, y: 10 }, 5, 0.6, 0, 120, "right");
    const b = tunnelWorldAabb({ x: 10, y: 10 }, 5, 0.6, 90, 120, "right");
    expect(b.maxX - b.minX).toBeCloseTo(a.maxY - a.minY, 5);
  });

  it("flaggar en böjd tunnel vars båge går utanför banan", () => {
    const near = { id: "t", type: "tunnel" as const, x: 10, y: 1.2, rotation: 0, number: 1 };
    const base = {
      sport: "agility" as const, sizeClass: "L" as const, arenaWidthM: 30, arenaHeightM: 40,
      classTemplate: null, ruleSetId: DEFAULT_RULESET_ID,
    };
    const outside = (obstacles: typeof base extends never ? never : unknown[]) =>
      validateCourse({ ...base, obstacles } as never).some((i) => i.code === "obstacle_outside_arena");
    expect(outside([near])).toBe(false);
    expect(outside([{ ...near, curveDeg: 170, curveSide: "left" as const }])).toBe(true);
  });
});
