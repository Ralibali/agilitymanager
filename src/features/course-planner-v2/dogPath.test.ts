/**
 * Tester för Hundens väg (Prompt B).
 *
 * Verifierar att banlängden faktiskt inkluderar obstacle-interna längder
 * (tunnelbåge, slalom, kontaktfält) och att den nya beräkningen är
 * meningsfull jämfört med center-till-center.
 */
import { describe, it, expect } from "vitest";
import {
  buildDogPath,
  computeDogPathLength,
  getObstacleAnchors,
  sampleDogPathAt,
  type DogPathObstacle,
} from "./dogPath";

const ob = (p: Partial<DogPathObstacle> & { type: DogPathObstacle["type"]; x: number; y: number }): DogPathObstacle => ({
  rotation: 0,
  number: null,
  ...p,
});

describe("getObstacleAnchors", () => {
  it("hopp: entry/exit ligger d/2 från centrum längs y vid rotation 0", () => {
    const a = getObstacleAnchors(ob({ type: "jump", x: 5, y: 5, number: 1 }));
    // jump.sizeM.d = 0.4
    expect(a.entry).toEqual({ x: 5, y: 4.8 });
    expect(a.exit).toEqual({ x: 5, y: 5.2 });
    expect(a.internalLengthM).toBeCloseTo(0.4, 6);
  });

  it("tunnel rak: entry/exit ligger w/2 från centrum längs x", () => {
    const a = getObstacleAnchors(ob({ type: "tunnel", x: 5, y: 5, number: 1 }));
    // tunnel.sizeM.w = 3.0
    expect(a.entry.x).toBeCloseTo(3.5, 6);
    expect(a.exit.x).toBeCloseTo(6.5, 6);
    expect(a.internalLengthM).toBeCloseTo(3.0, 6);
  });

  it("tunnel med curveDeg 90: båglängden är längre än chord", () => {
    const a = getObstacleAnchors(ob({ type: "tunnel", x: 0, y: 0, number: 1, curveDeg: 90 }));
    // arc = 3.0 * (π/4) / sin(π/4) ≈ 3.33
    expect(a.internalLengthM).toBeGreaterThan(3.0);
    expect(a.internalLengthM).toBeCloseTo(3.331, 2);
  });

  it("slalom 12: internal length = djup (6.6 m)", () => {
    const a = getObstacleAnchors(ob({ type: "weave_12", x: 0, y: 0, number: 1 }));
    expect(a.internalLengthM).toBeCloseTo(6.6, 6);
  });

  it("aframe: internal length = 2.7 m", () => {
    const a = getObstacleAnchors(ob({ type: "aframe", x: 0, y: 0, number: 1 }));
    expect(a.internalLengthM).toBeCloseTo(2.7, 6);
  });
});

describe("buildDogPath / computeDogPathLength", () => {
  it("tom bana → total 0", () => {
    const p = buildDogPath([]);
    expect(p.total).toBe(0);
    expect(p.points).toHaveLength(0);
  });

  it("två hopp 10 m isär → inkluderar 0.4 m × 2 internal + ~10 m air", () => {
    const obs: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 0, y: 10, number: 2 }),
    ];
    const total = computeDogPathLength(obs);
    // 0.4 + ~9.6 air (mellan exit y=0.2 och entry y=9.8) + 0.4 = ~10.4
    expect(total).toBeGreaterThan(10.0);
    expect(total).toBeLessThan(10.6);
  });

  it("krökt tunnel mellan två hopp ger längre väg än rak tunnel på samma platser", () => {
    const straight: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "tunnel", x: 0, y: 6, number: 2, rotation: 90 }), // tunnel-axis along y
      ob({ type: "jump", x: 0, y: 12, number: 3 }),
    ];
    const curved: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "tunnel", x: 0, y: 6, number: 2, rotation: 90, curveDeg: 90 }),
      ob({ type: "jump", x: 0, y: 12, number: 3 }),
    ];
    const lenStraight = computeDogPathLength(straight);
    const lenCurved = computeDogPathLength(curved);
    expect(lenCurved).toBeGreaterThan(lenStraight);
    // Skillnaden ska vara nära tunnel-bågkorrektionen ≈ 0.33 m
    expect(lenCurved - lenStraight).toBeGreaterThan(0.2);
    expect(lenCurved - lenStraight).toBeLessThan(0.5);
  });

  it("slalom (roterad 90°) mellan två hopp tvingar omväg och förlänger vägen rejält", () => {
    // Slalom på samma axel som hindren förlänger inte vägen geometriskt
    // (hunden går igenom samma sträcka), men en slalom som ligger
    // tvärställd mot förflyttningsriktningen tvingar en omväg.
    const withoutWeave: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 0, y: 10, number: 2 }),
    ];
    const withWeave: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "weave_12", x: 0, y: 5, number: 2, rotation: 90 }),
      ob({ type: "jump", x: 0, y: 10, number: 3 }),
    ];
    const diff = computeDogPathLength(withWeave) - computeDogPathLength(withoutWeave);
    // Slalomens 6.6 m + omvägen runt den ≈ +8 m totalt.
    expect(diff).toBeGreaterThan(5.5);
    expect(diff).toBeLessThan(12);
  });

  it("sampleDogPathAt vid t=1 returnerar slutpunkt med längd = total", () => {
    const obs: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 0, y: 10, number: 2 }),
    ];
    const p = buildDogPath(obs);
    const pose = sampleDogPathAt(p, 1);
    expect(pose).not.toBeNull();
    expect(pose!.x).toBeCloseTo(p.points[p.points.length - 1].x, 6);
    expect(pose!.y).toBeCloseTo(p.points[p.points.length - 1].y, 6);
    // cum sista värdet ≈ total
    expect(p.cum[p.cum.length - 1]).toBeCloseTo(p.total, 6);
  });

  it("override.controlPoints används istället för auto-anchors", () => {
    const obs: DogPathObstacle[] = [
      ob({ type: "jump", x: 0, y: 0, number: 1 }),
      ob({ type: "jump", x: 0, y: 10, number: 2 }),
    ];
    const p = buildDogPath(obs, { controlPoints: [{ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 0, y: 10 }] });
    expect(p.points).toHaveLength(3);
    expect(p.total).toBeCloseTo(10, 6);
  });
});
