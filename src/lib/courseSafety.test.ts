import { describe, expect, it } from "vitest";
import {
  ARENA_MAX_M,
  ARENA_MIN_M,
  MAX_GRID_LINES,
  MAX_RENDER_OBSTACLES,
  clampArenaM,
  gridTicks,
  sanitizePreviewObstacles,
} from "./courseSafety";

/**
 * Regressionstest för säkerhetsrapportens H1: fientlig course_data (t.ex.
 * arenaWidthM: 1e12, tusentals hinder, ogiltiga typer) får aldrig kunna
 * allokera enorma rutnätsarrayer eller rendera okontrollerat i CoursePreviewSvg.
 */
describe("courseSafety — fientlig bandata", () => {
  it("clampArenaM begränsar extrema och icke-numeriska värden", () => {
    expect(clampArenaM(1e12, 30)).toBe(ARENA_MAX_M);
    expect(clampArenaM(-50, 40)).toBe(ARENA_MIN_M);
    expect(clampArenaM(0, 30)).toBe(ARENA_MIN_M);
    expect(clampArenaM(Number.NaN, 30)).toBe(30);
    expect(clampArenaM(Number.POSITIVE_INFINITY, 40)).toBe(40);
    expect(clampArenaM("1e12", 30)).toBe(30);
    expect(clampArenaM("10; DROP TABLE", 30)).toBe(30);
    expect(clampArenaM(undefined, 25)).toBe(25);
  });

  it("gridTicks allokerar aldrig fler än MAX_GRID_LINES linjer", () => {
    const hostile = gridTicks(1e12);
    expect(hostile.length).toBeLessThanOrEqual(MAX_GRID_LINES);
    expect(hostile[hostile.length - 1]).toBeLessThanOrEqual(ARENA_MAX_M);
    // Noll/negativ stegstorlek får inte ge oändlig loop eller tom krasch.
    const zeroStep = gridTicks(30, 0);
    expect(zeroStep.length).toBeLessThanOrEqual(MAX_GRID_LINES);
    expect(zeroStep.length).toBeGreaterThan(1);
    // Vanlig plan ger fortfarande ett vettigt rutnät.
    expect(gridTicks(30, 5)).toEqual([0, 5, 10, 15, 20, 25, 30]);
  });

  it("sanitizePreviewObstacles kapperar antal, koordinater och typer", () => {
    const arenaW = 30;
    const arenaH = 40;
    const hostile = Array.from({ length: MAX_RENDER_OBSTACLES + 100 }, (_, i) => ({
      id: `evil-${i}`.repeat(10),
      type: i % 3 === 0 ? "jump" : i % 3 === 1 ? "__proto__" : "tunnel",
      x: i % 2 === 0 ? 1e9 : -1e9,
      y: Number.NaN,
      rotation: Number.POSITIVE_INFINITY,
      number: 10_000,
      curveDeg: 720,
      curveSide: "up",
      zIndex: 1e9,
    }));

    const clean = sanitizePreviewObstacles(hostile, arenaW, arenaH);

    // Kappad till render-taket.
    expect(clean.length).toBeLessThanOrEqual(MAX_RENDER_OBSTACLES);
    // Ogiltiga typer ("__proto__") är bortfiltrerade.
    expect(clean.every((o) => o.type === "jump" || o.type === "tunnel")).toBe(true);
    for (const o of clean) {
      expect(o.x).toBeGreaterThanOrEqual(0);
      expect(o.x).toBeLessThanOrEqual(arenaW);
      expect(o.y).toBeGreaterThanOrEqual(0);
      expect(o.y).toBeLessThanOrEqual(arenaH);
      expect(Math.abs(o.rotation)).toBeLessThanOrEqual(360);
      if (o.number != null) expect(o.number).toBeLessThanOrEqual(999);
      if (o.curveDeg != null) expect(o.curveDeg).toBeLessThanOrEqual(90);
      expect(o.curveSide).not.toBe("up");
      expect(o.id.length).toBeLessThanOrEqual(64);
    }
  });

  it("sanitizePreviewObstacles hanterar skräpdata utan att kasta", () => {
    expect(sanitizePreviewObstacles(null, 30, 40)).toEqual([]);
    expect(sanitizePreviewObstacles("banan", 30, 40)).toEqual([]);
    expect(sanitizePreviewObstacles([null, 42, "x", undefined, []], 30, 40)).toEqual([]);
    // Arena-dimensionerna själva är fientliga — hindren klämms ändå in.
    const clean = sanitizePreviewObstacles(
      [{ type: "jump", x: 999, y: -999, rotation: 0 }],
      1e12,
      -50,
    );
    expect(clean).toHaveLength(1);
    expect(clean[0].x).toBeLessThanOrEqual(ARENA_MAX_M);
    expect(clean[0].y).toBeLessThanOrEqual(ARENA_MIN_M);
  });

  it("viewBox-värdena som CoursePreviewSvg bygger är alltid begränsade", () => {
    // Samma uträkning som komponenten: viewBox={`0 0 ${w} ${h}`}.
    const w = clampArenaM(1e12, 30);
    const h = clampArenaM(-50, 40);
    const viewBox = `0 0 ${w} ${h}`;
    expect(viewBox).toBe(`0 0 ${ARENA_MAX_M} ${ARENA_MIN_M}`);
    // Inga NaN/Infinity kan läcka in i SVG-attribut.
    expect(viewBox).not.toMatch(/NaN|Infinity/);
  });
});
