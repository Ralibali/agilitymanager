import { describe, expect, it } from "vitest";
import type { PlacedObstacle } from "@/lib/course";
import {
  alignObstacles,
  applyNumberingSequence,
  clampGroupDelta,
  computeSegmentLabels,
  copyObstacles,
  deleteObstacles,
  distributeObstacles,
  duplicateObstacles,
  formatMeters,
  idsInRect,
  moveToNumber,
  nearestObstacle,
  obstacleLocalBounds,
  placeLabelsAwayFrom,
  pasteObstacles,
  replaceCompetingOrder,
  reverseNumbering,
  rotateObstacles,
  setPosition,
  setRotation,
  toggleLock,
  translateObstacles,
  withNumbers,
} from "./editorOps";

const arena = { width: 30, height: 40 };

function ob(id: string, x: number, y: number, extra: Partial<PlacedObstacle> = {}): PlacedObstacle {
  return { id, type: "jump", x, y, rotation: 0, ...extra };
}

const ids = (list: PlacedObstacle[]) => list.map((o) => o.id);

describe("obstacleLocalBounds", () => {
  it("rak tunnel = bredd × djup, böjd tunnel blir djupare åt böjsidan", () => {
    const straight = obstacleLocalBounds({ type: "tunnel", curveDeg: 0 });
    expect(straight.maxX - straight.minX).toBeCloseTo(3);
    expect(straight.maxY - straight.minY).toBeCloseTo(0.6);
    const bent = obstacleLocalBounds({ type: "tunnel", curveDeg: 180, curveSide: "right" });
    expect(bent.maxY - bent.minY).toBeGreaterThan(1);
  });
});

describe("withNumbers", () => {
  it("numrerar bara tävlande hinder i listordning", () => {
    const list = [ob("s", 1, 1, { type: "start" }), ob("a", 5, 5), ob("b", 10, 5), ob("f", 2, 2, { type: "finish" })];
    const n = withNumbers(list);
    expect(n.map((o) => o.number)).toEqual([undefined, 1, 2, undefined]);
  });
});

describe("replaceCompetingOrder", () => {
  it("behåller icke-tävlande hinder på sina index", () => {
    const list = [ob("a", 1, 1), ob("s", 1, 1, { type: "start" }), ob("b", 2, 2), ob("c", 3, 3)];
    const next = replaceCompetingOrder(list, [list[3], list[0], list[2]]);
    expect(ids(next)).toEqual(["c", "s", "a", "b"]);
  });

  it("vägrar en ordning som inte matchar hinderlistan", () => {
    const list = [ob("a", 1, 1), ob("b", 2, 2)];
    expect(replaceCompetingOrder(list, [list[0]])).toBe(list);
    expect(replaceCompetingOrder(list, [list[0], ob("x", 1, 1)])).toBe(list);
  });
});

describe("applyNumberingSequence", () => {
  const list = [ob("a", 1, 1), ob("b", 2, 2), ob("s", 3, 3, { type: "start" }), ob("c", 4, 4), ob("d", 5, 5), ob("e", 6, 6)];

  it("klickade hinder får 1..k, resten följer i tidigare ordning", () => {
    const next = withNumbers(applyNumberingSequence(list, ["d", "a"]));
    const byNumber = next.filter((o) => o.number != null).sort((x, y) => x.number! - y.number!);
    expect(ids(byNumber)).toEqual(["d", "a", "b", "c", "e"]);
    // Starten ligger kvar på sitt index.
    expect(next[2].id).toBe("s");
  });

  it("ignorerar dubbletter, okända id:n och icke-tävlande hinder", () => {
    const next = applyNumberingSequence(list, ["c", "c", "zzz", "s", "b"]);
    const order = ids(withNumbers(next).filter((o) => o.number != null).sort((x, y) => x.number! - y.number!));
    expect(order).toEqual(["c", "b", "a", "d", "e"]);
  });

  it("numrerar om från #n och behåller nummer 1..n-1", () => {
    // Behåll a (#1) och b (#2), numrera om från #3: e, c
    const next = applyNumberingSequence(list, ["e", "c"], 2);
    const order = ids(withNumbers(next).filter((o) => o.number != null).sort((x, y) => x.number! - y.number!));
    expect(order).toEqual(["a", "b", "e", "c", "d"]);
  });

  it("ett behållet hinder som klickas flyttas till klickpositionen", () => {
    const next = applyNumberingSequence(list, ["a"], 2);
    const order = ids(withNumbers(next).filter((o) => o.number != null).sort((x, y) => x.number! - y.number!));
    expect(order).toEqual(["b", "a", "c", "d", "e"]);
  });

  it("tom sekvens ändrar ingenting", () => {
    expect(ids(applyNumberingSequence(list, []))).toEqual(ids(list));
  });
});

describe("moveToNumber / reverseNumbering", () => {
  const list = [ob("a", 1, 1), ob("b", 2, 2), ob("c", 3, 3), ob("f", 4, 4, { type: "finish" }), ob("d", 5, 5)];
  const order = (l: PlacedObstacle[]) =>
    ids(withNumbers(l).filter((o) => o.number != null).sort((x, y) => x.number! - y.number!));

  it("flyttar ett hinder till ett givet nummer", () => {
    expect(order(moveToNumber(list, "d", 1))).toEqual(["d", "a", "b", "c"]);
    expect(order(moveToNumber(list, "a", 3))).toEqual(["b", "c", "a", "d"]);
  });

  it("klampar nummer till 1..N och ignorerar ogiltiga värden", () => {
    expect(order(moveToNumber(list, "a", 99))).toEqual(["b", "c", "d", "a"]);
    expect(order(moveToNumber(list, "d", -5))).toEqual(["d", "a", "b", "c"]);
    expect(moveToNumber(list, "a", Number.NaN)).toBe(list);
    expect(moveToNumber(list, "f", 1)).toBe(list);
  });

  it("vänder banordningen", () => {
    expect(order(reverseNumbering(list))).toEqual(["d", "c", "b", "a"]);
    expect(reverseNumbering(list)[3].id).toBe("f");
  });
});

describe("gruppförflyttning", () => {
  it("klampar så att hela gruppen stannar inom ytan och behåller formen", () => {
    const d = clampGroupDelta([{ x: 1, y: 5 }, { x: 4, y: 5 }], -10, 0, arena);
    expect(d.dx).toBeCloseTo(-0.5);
    const list = [ob("a", 1, 5), ob("b", 4, 5), ob("c", 20, 20)];
    const moved = translateObstacles(list, ["a", "b"], -10, 3, arena);
    expect(moved[0]).toMatchObject({ x: 0.5, y: 8 });
    expect(moved[1]).toMatchObject({ x: 3.5, y: 8 });
    expect(moved[2]).toBe(list[2]);
  });

  it("flyttar aldrig låsta hinder", () => {
    const list = [ob("a", 5, 5, { locked: true }), ob("b", 10, 10)];
    const moved = translateObstacles(list, ["a", "b"], 1, 1, arena);
    expect(moved[0]).toBe(list[0]);
    expect(moved[1]).toMatchObject({ x: 11, y: 11 });
  });

  it("ingen förflyttning ger samma lista", () => {
    const list = [ob("a", 0.5, 0.5)];
    expect(translateObstacles(list, ["a"], -1, -1, arena)).toBe(list);
  });
});

describe("rotation", () => {
  it("roterar ett ensamt hinder på stället", () => {
    const list = [ob("a", 5, 5, { rotation: 350 })];
    expect(rotateObstacles(list, ["a"], 45, arena)[0]).toMatchObject({ x: 5, y: 5, rotation: 35 });
    expect(rotateObstacles(list, ["a"], -360, arena)).toBe(list);
  });

  it("roterar en grupp kring dess mittpunkt", () => {
    const list = [ob("a", 10, 10), ob("b", 14, 10)];
    const r = rotateObstacles(list, ["a", "b"], 90, arena);
    expect(r[0]).toMatchObject({ x: 12, y: 8, rotation: 90 });
    expect(r[1]).toMatchObject({ x: 12, y: 12, rotation: 90 });
  });

  it("sätter exakt vinkel och position", () => {
    const list = [ob("a", 5, 5)];
    expect(setRotation(list, "a", -30)[0].rotation).toBe(330);
    expect(setRotation(list, "a", Number.NaN)).toBe(list);
    expect(setPosition(list, "a", { x: 100, y: 7.123 }, arena)[0]).toMatchObject({ x: 29.5, y: 7.12 });
    expect(setPosition([ob("l", 5, 5, { locked: true })], "l", { x: 2 }, arena)[0].x).toBe(5);
  });
});

describe("kopiera, klistra in, duplicera, ta bort, lås", () => {
  it("kopior får nya id:n, hamnar sist och är olåsta", () => {
    const list = [ob("a", 5, 5, { locked: true, number: 1 }), ob("b", 8, 5)];
    const clip = copyObstacles(list, ["a"]);
    expect(clip[0]).not.toHaveProperty("id");
    expect(clip[0]).not.toHaveProperty("number");
    const { obstacles, newIds } = pasteObstacles(list, clip, arena);
    expect(obstacles).toHaveLength(3);
    expect(newIds).toHaveLength(1);
    expect(obstacles[2]).toMatchObject({ id: newIds[0], x: 7, y: 7, locked: false });
    expect(newIds[0]).not.toBe("a");
  });

  it("klistrar in urklipp från större yta inom den nuvarande", () => {
    const { obstacles } = pasteObstacles([], [{ type: "jump", x: 39, y: 50, rotation: 0 }], arena);
    expect(obstacles[0].x).toBeLessThanOrEqual(arena.width - 0.5);
    expect(obstacles[0].y).toBeLessThanOrEqual(arena.height - 0.5);
  });

  it("duplicerar en grupp med bibehållen form", () => {
    const list = [ob("a", 5, 5), ob("b", 8, 6)];
    const { obstacles, newIds } = duplicateObstacles(list, ["a", "b"], arena);
    const copies = obstacles.filter((o) => newIds.includes(o.id));
    expect(copies[1].x - copies[0].x).toBeCloseTo(3);
    expect(copies[1].y - copies[0].y).toBeCloseTo(1);
  });

  it("tar bort olåsta och växlar lås för en grupp", () => {
    const list = [ob("a", 5, 5, { locked: true }), ob("b", 8, 6)];
    expect(ids(deleteObstacles(list, ["a", "b"]))).toEqual(["a"]);
    const locked = toggleLock(list, ["a", "b"]);
    expect(locked.every((o) => o.locked)).toBe(true);
    expect(toggleLock(locked, ["a", "b"]).every((o) => !o.locked)).toBe(true);
  });
});

describe("justera och fördela", () => {
  const list = [ob("a", 2, 10), ob("b", 6, 12), ob("c", 20, 20), ob("l", 9, 9, { locked: true })];

  it("justerar mittpunkter", () => {
    expect(alignObstacles(list, ["a", "b", "c"], "left").slice(0, 3).map((o) => o.x)).toEqual([2, 2, 2]);
    expect(alignObstacles(list, ["a", "b", "c"], "bottom").slice(0, 3).map((o) => o.y)).toEqual([20, 20, 20]);
    const h = alignObstacles(list, ["a", "b", "c", "l"], "vcenter");
    expect(h[0].y).toBeCloseTo(14);
    expect(h[3]).toBe(list[3]);
  });

  it("kräver minst två hinder för justering och tre för fördelning", () => {
    expect(alignObstacles(list, ["a"], "left")).toBe(list);
    expect(distributeObstacles(list, ["a", "b"], "x")).toBe(list);
  });

  it("fördelar jämnt mellan ytterpunkterna", () => {
    const d = distributeObstacles(list, ["a", "b", "c"], "x");
    expect(d.slice(0, 3).map((o) => o.x)).toEqual([2, 11, 20]);
  });
});

describe("markering och mätning", () => {
  const list = [ob("a", 2, 2), ob("b", 6, 6), ob("c", 10, 10)];

  it("väljer hinder vars mitt ligger i rutan oavsett dragriktning", () => {
    expect(idsInRect(list, { x: 7, y: 7 }, { x: 1, y: 1 })).toEqual(["a", "b"]);
  });

  it("hittar närmaste hinder inom radien", () => {
    expect(nearestObstacle(list, { x: 6.4, y: 6.2 }, 1)?.id).toBe("b");
    expect(nearestObstacle(list, { x: 4, y: 4 }, 1)).toBeNull();
  });

  it("formaterar meter med svensk decimal", () => {
    expect(formatMeters(5.25)).toBe("5,3 m");
    expect(formatMeters(5.25, 2)).toBe("5,25 m");
  });
});

describe("computeSegmentLabels", () => {
  it("ger en etikett per följdpar med mitt–mitt-avstånd", () => {
    const list = withNumbers([
      ob("a", 5, 20, { rotation: 90 }),
      ob("s", 2, 2, { type: "start" }),
      ob("b", 11, 20, { rotation: 90 }),
      ob("c", 11, 26, { rotation: 0 }),
    ]);
    const labels = computeSegmentLabels(list);
    expect(labels).toHaveLength(3);
    expect(labels[2]).toMatchObject({ fromNumber: "Start", toNumber: 1 });
    expect(labels[0]).toMatchObject({ fromId: "a", toId: "b", fromNumber: 1, toNumber: 2 });
    expect(labels[0].centerDistanceM).toBeCloseTo(6);
    expect(labels[1].centerDistanceM).toBeCloseTo(6);
    // Etiketten ligger mellan hindren, på hundlinjen.
    expect(labels[0].x).toBeGreaterThan(5);
    expect(labels[0].x).toBeLessThan(11);
    // Mätt från ribba till ribba längs hundlinjen: minst mitt–mitt-avståndet.
    expect(labels[0].pathDistanceM).toBeGreaterThan(5.9);
    expect(labels[0].pathDistanceM).toBeLessThan(8);
  });

  it("returnerar inget för färre än två numrerade hinder", () => {
    expect(computeSegmentLabels(withNumbers([ob("a", 5, 5)]))).toEqual([]);
  });
});

describe("placeLabelsAwayFrom", () => {
  it("låter fria etiketter ligga kvar och flyttar skymda längs normalen", () => {
    const labels = [
      { x: 0, y: 0, nx: 0, ny: 1 },
      { x: 10, y: 10, nx: 1, ny: 0 },
    ];
    const placed = placeLabelsAwayFrom(labels, [{ x: 10, y: 10.2 }], 1, 1.2);
    expect(placed[0]).toMatchObject({ lx: 0, ly: 0 });
    expect(Math.hypot(placed[1].lx - 10, placed[1].ly - 10.2)).toBeGreaterThanOrEqual(1);
    expect(placed[1].ly).toBe(10);
  });
});
