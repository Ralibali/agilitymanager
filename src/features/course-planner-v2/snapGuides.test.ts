import { describe, expect, it } from "vitest";
import { computeAlignmentSnap } from "./snapGuides";

const arena = { width: 30, height: 40 };

describe("smarta stödlinjer", () => {
  it("snäpper x mot ett annat hinder och ritar en lodrät stödlinje mellan dem", () => {
    const res = computeAlignmentSnap({ x: 17.1, y: 31 }, [{ x: 17, y: 20 }, { x: 5, y: 8 }], 0.3, arena);
    expect(res).toMatchObject({ x: 17, y: 31, snappedX: true, snappedY: false });
    expect(res.guides).toEqual([{ axis: "x", value: 17, from: 18.8, to: 32.2 }]);
  });

  it("snäpper båda axlarna och väljer det närmaste målet", () => {
    const res = computeAlignmentSnap({ x: 10.2, y: 5.05 }, [{ x: 10.1, y: 30 }, { x: 10.25, y: 12 }, { x: 22, y: 5 }], 0.3, arena);
    expect(res.x).toBe(10.25);
    expect(res.y).toBe(5);
    expect(res.guides.map((g) => g.axis)).toEqual(["x", "y"]);
  });

  it("banans mittlinjer fungerar som stödlinjer", () => {
    const res = computeAlignmentSnap({ x: 14.9, y: 7 }, [], 0.3, arena);
    expect(res.x).toBe(15);
    expect(res.guides).toEqual([{ axis: "x", value: 15, from: 0, to: 40, center: true }]);
  });

  it("utanför toleransen händer ingenting", () => {
    const res = computeAlignmentSnap({ x: 12, y: 12 }, [{ x: 13, y: 25 }], 0.3, arena);
    expect(res).toEqual({ x: 12, y: 12, snappedX: false, snappedY: false, guides: [] });
  });
});
