import { describe, expect, it } from "vitest";
import {
  aabbsOverlap,
  clampCenterForRotatedBox,
  clampObstacleToArena,
  computeRotatedBox,
  edgesOutsideArena,
  rotatedAabb,
  rotatedObstacleBounds,
  snapCoursePoint,
  snapToGrid,
} from "./geometry";

describe("rotatedAabb", () => {
  it("orotad rektangel ger triviala bounds", () => {
    const b = rotatedAabb({ x: 10, y: 5 }, 4, 2, 0);
    expect(b.minX).toBeCloseTo(8, 6);
    expect(b.maxX).toBeCloseTo(12, 6);
    expect(b.minY).toBeCloseTo(4, 6);
    expect(b.maxY).toBeCloseTo(6, 6);
  });

  it("90° rotation byter bredd och djup", () => {
    const b = rotatedAabb({ x: 0, y: 0 }, 4, 2, 90);
    expect(b.maxX - b.minX).toBeCloseTo(2, 6);
    expect(b.maxY - b.minY).toBeCloseTo(4, 6);
  });

  it("45° rotation ger sqrt(2)-diagonal", () => {
    const b = rotatedAabb({ x: 0, y: 0 }, 2, 2, 45);
    expect(b.maxX - b.minX).toBeCloseTo(2 * Math.SQRT2, 4);
  });
});

describe("computeRotatedBox", () => {
  it("orotad — hörn är top-left, top-right, bottom-right, bottom-left", () => {
    const box = computeRotatedBox({ x: 10, y: 10 }, 4, 2, 0);
    expect(box.corners[0]).toEqual({ x: 8, y: 9 });
    expect(box.corners[2]).toEqual({ x: 12, y: 11 });
  });

  it("AABB stämmer med rotatedAabb", () => {
    const box = computeRotatedBox({ x: 5, y: 3 }, 3, 1, 30);
    const quick = rotatedAabb({ x: 5, y: 3 }, 3, 1, 30);
    expect(box.aabb.minX).toBeCloseTo(quick.minX, 6);
    expect(box.aabb.maxY).toBeCloseTo(quick.maxY, 6);
  });
});

describe("edgesOutsideArena", () => {
  it("orotad rektangel helt inuti → tom lista", () => {
    const aabb = rotatedAabb({ x: 5, y: 5 }, 2, 2, 0);
    expect(edgesOutsideArena(aabb, 30, 40)).toEqual([]);
  });

  it("center innanför men rotation drar hörn utanför → hittar rätt kant", () => {
    // 4×1 hinder vid x=0.6, roterat 45° — halva diagonalen är ~1.77m
    // → sticker ut vänster och topp med ca 1.17m
    const aabb = rotatedAabb({ x: 0.6, y: 0.6 }, 4, 1, 45);
    const edges = edgesOutsideArena(aabb, 30, 40);
    const sides = edges.map((e) => e.edge).sort();
    expect(sides).toContain("vänster");
    expect(sides).toContain("topp");
  });

  it("marginal räknas som utanför", () => {
    const aabb = rotatedAabb({ x: 0.1, y: 20 }, 0.4, 0.4, 0);
    const edges = edgesOutsideArena(aabb, 30, 40, 0.2);
    expect(edges.some((e) => e.edge === "vänster")).toBe(true);
  });
});

describe("clampCenterForRotatedBox", () => {
  it("center som skulle ligga för nära vänsterkant flyttas in", () => {
    const clamped = clampCenterForRotatedBox({ x: 0, y: 20 }, 4, 1, 0, 30, 40);
    // AABB-halvbredd = 2 → minCenterX = 2
    expect(clamped.x).toBeCloseTo(2, 6);
    expect(clamped.y).toBeCloseTo(20, 6);
  });

  it("roterat hinder klampas efter roterad AABB, inte råmått", () => {
    // 4×1 roterat 45° → AABB ~3.54×3.54; halvbredd ~1.77
    const clamped = clampCenterForRotatedBox({ x: 0.5, y: 20 }, 4, 1, 45, 30, 40);
    expect(clamped.x).toBeGreaterThan(1.7);
  });

  it("hinder större än arenan centreras", () => {
    const clamped = clampCenterForRotatedBox({ x: 0, y: 0 }, 50, 1, 0, 30, 40);
    expect(clamped.x).toBeCloseTo(15, 6);
  });
});

describe("aabbsOverlap", () => {
  it("överlappande boxar", () => {
    expect(
      aabbsOverlap(
        { minX: 0, maxX: 2, minY: 0, maxY: 2 },
        { minX: 1, maxX: 3, minY: 1, maxY: 3 },
      ),
    ).toBe(true);
  });

  it("åtskilda boxar", () => {
    expect(
      aabbsOverlap(
        { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        { minX: 2, maxX: 3, minY: 2, maxY: 3 },
      ),
    ).toBe(false);
  });
});

describe("snapToGrid", () => {
  it("snap till 0.5 m", () => {
    expect(snapToGrid(1.23, 0.5)).toBeCloseTo(1.0, 6);
    expect(snapToGrid(1.26, 0.5)).toBeCloseTo(1.5, 6);
  });
  it("step 0 lämnar värdet oförändrat", () => {
    expect(snapToGrid(3.14, 0)).toBe(3.14);
  });
});
