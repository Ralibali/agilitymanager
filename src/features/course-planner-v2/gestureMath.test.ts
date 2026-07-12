import { describe, expect, it } from "vitest";
import { pinchSample, pinchScale, pinchPanDelta } from "./gestureMath";

describe("pinchSample", () => {
  it("midpoint av (0,0) och (10,0) = (5,0), avstånd 10", () => {
    const s = pinchSample({ clientX: 0, clientY: 0 }, { clientX: 10, clientY: 0 });
    expect(s.mid).toEqual({ clientX: 5, clientY: 0 });
    expect(s.dist).toBeCloseTo(10, 6);
  });
  it("diagonalt avstånd använder hypot", () => {
    const s = pinchSample({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 });
    expect(s.dist).toBeCloseTo(5, 6);
  });
});

describe("pinchScale", () => {
  it("större avstånd → skala > 1", () => {
    const start = pinchSample({ clientX: 0, clientY: 0 }, { clientX: 10, clientY: 0 });
    const now = pinchSample({ clientX: 0, clientY: 0 }, { clientX: 20, clientY: 0 });
    expect(pinchScale(start, now)).toBeCloseTo(2, 6);
  });
  it("start-avstånd ~0 → skala 1 (skydd mot div-by-zero)", () => {
    const start = { mid: { clientX: 0, clientY: 0 }, dist: 0 };
    const now = pinchSample({ clientX: 0, clientY: 0 }, { clientX: 20, clientY: 0 });
    expect(pinchScale(start, now)).toBe(1);
  });
});

describe("pinchPanDelta", () => {
  it("mittpunkten flyttas → returnerar delta i client-px", () => {
    const start = pinchSample({ clientX: 0, clientY: 0 }, { clientX: 10, clientY: 0 });
    const now = pinchSample({ clientX: 5, clientY: 20 }, { clientX: 15, clientY: 20 });
    const d = pinchPanDelta(start, now);
    expect(d.dxPx).toBeCloseTo(5, 6);
    expect(d.dyPx).toBeCloseTo(20, 6);
  });
});
