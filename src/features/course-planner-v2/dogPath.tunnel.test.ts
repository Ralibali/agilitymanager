/**
 * Geometriska regressionstester för tunneln: ritad form, beräknad hundväg
 * och uppspelning ska bygga på EXAKT samma kurva.
 *
 * Testerna är oberoende av implementationen: de mäter egenskaper (båglängd,
 * ändpunkter, bukt-riktning, monotona avstånd) i stället för att spegla koden.
 */
import { describe, expect, it } from "vitest";
import {
  buildDogPath,
  computeDogPathPairDistances,
  getObstacleAnchors,
  sampleDogPathAt,
  type DogPathObstacle,
} from "./dogPath";
import { getObstacleDefV2 } from "./config";
import { tunnelGeometryLocal, tunnelPathLengthM } from "./tunnelGeometry";

const TUNNEL_W = getObstacleDefV2("tunnel")!.sizeM.w;

function tunnel(p: Partial<DogPathObstacle> = {}): DogPathObstacle {
  return { id: "t", type: "tunnel", x: 10, y: 10, rotation: 0, number: 1, ...p };
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("tunnelGeometryLocal", () => {
  it("rak tunnel: kordan är hela längden", () => {
    const g = tunnelGeometryLocal(4, 0, "right");
    expect(g.lengthM).toBeCloseTo(4, 6);
    expect(g.centerline[0]).toEqual({ x: -2, y: 0 });
    expect(g.centerline[g.centerline.length - 1]).toEqual({ x: 2, y: 0 });
  });

  it("böjd tunnel: ändarna ligger kvar, båglängden följer R·θ", () => {
    for (const deg of [15, 45, 90, 120, 180]) {
      const g = tunnelGeometryLocal(4, deg, "right");
      expect(g.centerline[0].x).toBeCloseTo(-2, 6);
      expect(g.centerline[0].y).toBeCloseTo(0, 6);
      expect(g.centerline[g.centerline.length - 1].x).toBeCloseTo(2, 6);
      expect(g.centerline[g.centerline.length - 1].y).toBeCloseTo(0, 6);
      expect(g.lengthM).toBeCloseTo(tunnelPathLengthM(4, deg), 6);
      expect(g.lengthM).toBeGreaterThan(4);
    }
  });

  it("curveSide speglar bukten, inte längden", () => {
    const right = tunnelGeometryLocal(4, 90, "right");
    const left = tunnelGeometryLocal(4, 90, "left");
    const midR = right.centerline[Math.floor(right.centerline.length / 2)];
    const midL = left.centerline[Math.floor(left.centerline.length / 2)];
    expect(midR.y).toBeGreaterThan(0.2);
    expect(midL.y).toBeCloseTo(-midR.y, 6);
    expect(midL.x).toBeCloseTo(midR.x, 6);
    expect(left.lengthM).toBeCloseTo(right.lengthM, 9);
  });

  it("alla punkter ligger på cirkeln (konstant radie)", () => {
    const g = tunnelGeometryLocal(4, 120, "left");
    const theta = (120 * Math.PI) / 180;
    const r = 2 / Math.sin(theta / 2);
    const c = { x: 0, y: r * Math.cos(theta / 2) }; // left ⇒ centrum åt +y
    for (const p of g.centerline) expect(dist(p, c)).toBeCloseTo(r, 6);
  });
});

describe("hundvägen genom tunneln", () => {
  it("bana med ENDAST en böjd tunnel har båglängd, inte kordalängd", () => {
    const path = buildDogPath([tunnel({ curveDeg: 90, curveSide: "right" })]);
    const expected = tunnelPathLengthM(TUNNEL_W, 90);
    expect(path.total).toBeCloseTo(expected, 3);
    expect(path.obstacleM).toBeCloseTo(expected, 3);
    expect(path.airM).toBeCloseTo(0, 9);
    // Den samplade linjen ska vara lika lång som den rapporterade totalen.
    let measured = 0;
    for (let i = 1; i < path.points.length; i++) measured += dist(path.points[i], path.points[i - 1]);
    expect(measured).toBeCloseTo(path.total, 6);
  });

  it("rak tunnel ensam ger exakt hindrets längd", () => {
    const path = buildDogPath([tunnel({ curveDeg: 0 })]);
    expect(path.total).toBeCloseTo(TUNNEL_W, 6);
  });

  it("linjen följer bågen — ingen genväg mellan ändarna", () => {
    const path = buildDogPath([tunnel({ curveDeg: 120, curveSide: "right" })]);
    const mid = path.points[Math.floor(path.points.length / 2)];
    const straightMid = { x: 10, y: 10 };
    expect(dist(mid, straightMid)).toBeGreaterThan(0.5);
  });

  it("rotation flyttar bågen med hindret", () => {
    const a = getObstacleAnchors(tunnel({ curveDeg: 90, rotation: 0 }));
    const b = getObstacleAnchors(tunnel({ curveDeg: 90, rotation: 90 }));
    expect(b.internalLengthM).toBeCloseTo(a.internalLengthM, 9);
    // 90° rotation: entry (-w/2,0) ⇒ (0,-w/2) relativt centrum
    expect(b.entry.x).toBeCloseTo(10, 6);
    expect(b.entry.y).toBeCloseTo(10 - TUNNEL_W / 2, 6);
  });

  it("passage åt motsatt håll ger samma längd och spegelvänd ordning", () => {
    const forward = buildDogPath([
      { id: "a", type: "jump", x: 2, y: 10, rotation: 90, number: 1 },
      tunnel({ curveDeg: 90, curveSide: "right", number: 2 }),
    ]);
    const reversed = buildDogPath([
      { id: "a", type: "jump", x: 18, y: 10, rotation: 90, number: 1 },
      tunnel({ curveDeg: 90, curveSide: "right", number: 2 }),
    ]);
    const fwdTunnel = forward.anchors[1];
    const revTunnel = reversed.anchors[1];
    expect(fwdTunnel.internalLengthM).toBeCloseTo(revTunnel.internalLengthM, 6);
    // Hunden går in i tunneln från den sida den kommer ifrån.
    expect(fwdTunnel.entry.x).toBeLessThan(fwdTunnel.exit.x);
    expect(revTunnel.entry.x).toBeGreaterThan(revTunnel.exit.x);
    // Bågen är densamma, bara traverserad baklänges.
    expect(revTunnel.innerPoints.map((p) => [p.x, p.y]).reverse()).toEqual(
      fwdTunnel.innerPoints.map((p) => [p.x, p.y]),
    );
  });

  it("total = hinderlängd + luftlängd och cum är monoton", () => {
    const path = buildDogPath([
      { id: "j1", type: "jump", x: 3, y: 3, rotation: 0, number: 1 },
      tunnel({ x: 10, y: 8, curveDeg: 75, curveSide: "left", number: 2 }),
      { id: "j2", type: "jump", x: 18, y: 14, rotation: 45, number: 3 },
    ]);
    expect(path.total).toBeCloseTo(path.obstacleM + path.airM, 6);
    for (let i = 1; i < path.cum.length; i++) {
      expect(path.cum[i]).toBeGreaterThanOrEqual(path.cum[i - 1]);
      expect(path.cum[i] - path.cum[i - 1]).toBeCloseTo(dist(path.points[i], path.points[i - 1]), 9);
    }
    expect(path.cum[path.cum.length - 1]).toBeCloseTo(path.total, 6);
  });

  it("uppspelningen hoppar inte genom tunneln", () => {
    const path = buildDogPath([
      { id: "j1", type: "jump", x: 3, y: 3, rotation: 0, number: 1 },
      tunnel({ x: 10, y: 8, curveDeg: 120, curveSide: "right", number: 2 }),
      { id: "j2", type: "jump", x: 18, y: 14, rotation: 45, number: 3 },
    ]);
    let prev = sampleDogPathAt(path, 0)!;
    const steps = 400;
    for (let i = 1; i <= steps; i++) {
      const pose = sampleDogPathAt(path, i / steps)!;
      const step = dist(pose, prev);
      // Inget steg får vara mycket större än en jämn fördelning av totalen.
      expect(step).toBeLessThan((path.total / steps) * 4 + 0.05);
      prev = pose;
    }
  });

  it("mellan-hinder-sträckor mäts på luftsegmenten, inte genom hindren", () => {
    const obstacles: DogPathObstacle[] = [
      { id: "j1", type: "jump", x: 5, y: 5, rotation: 0, number: 1 },
      tunnel({ id: "t1", x: 12, y: 12, curveDeg: 90, curveSide: "right", number: 2 }),
      { id: "j2", type: "jump", x: 20, y: 20, rotation: 0, number: 3 },
    ];
    const pairs = computeDogPathPairDistances(obstacles);
    const path = buildDogPath(obstacles);
    expect(pairs).toHaveLength(2);
    const sum = pairs.reduce((a, p) => a + p.distanceM, 0);
    expect(sum).toBeCloseTo(path.airM, 6);
    for (const p of pairs) expect(p.distanceM).toBeGreaterThan(0);
  });

  it("böjning påverkar bara tunnelns egen längd — luftsträckorna är oförändrade", () => {
    const make = (deg: number): DogPathObstacle[] => [
      { id: "j1", type: "jump", x: 5, y: 5, rotation: 0, number: 1 },
      tunnel({ id: "t1", x: 12, y: 12, curveDeg: deg, curveSide: "right", number: 2 }),
      { id: "j2", type: "jump", x: 20, y: 20, rotation: 0, number: 3 },
    ];
    const straight = buildDogPath(make(0));
    const bent = buildDogPath(make(90));
    expect(bent.obstacleM).toBeGreaterThan(straight.obstacleM);
    // Ändpunkterna ligger kvar ⇒ luftvägen mellan hindren är i stort sett
    // oförändrad (bara in-/utgångstangenten skiljer).
    expect(Math.abs(bent.airM - straight.airM) / straight.airM).toBeLessThan(0.02);
  });
});
