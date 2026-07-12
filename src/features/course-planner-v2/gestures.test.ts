import { describe, it, expect } from "vitest";
import { distance, midpoint, computePinchGesture } from "./gestures";

describe("gestures", () => {
  it("distance is euclidean", () => {
    expect(distance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })).toBe(5);
  });

  it("midpoint averages coords", () => {
    expect(midpoint({ clientX: 0, clientY: 0 }, { clientX: 10, clientY: 20 })).toEqual({
      clientX: 5,
      clientY: 10,
    });
  });

  it("computePinchGesture returns scale + pan + midpoint", () => {
    const prev: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
      { clientX: 0, clientY: 0 },
      { clientX: 10, clientY: 0 },
    ];
    const curr: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
      { clientX: -5, clientY: 5 },
      { clientX: 15, clientY: 5 },
    ];
    const g = computePinchGesture(prev, curr);
    expect(g.scale).toBeCloseTo(2, 5); // dist 10 → 20
    expect(g.panPx.dxPx).toBe(0); // mid prev=5, mid curr=5
    expect(g.panPx.dyPx).toBe(5);
    expect(g.midClient).toEqual({ clientX: 5, clientY: 5 });
  });

  it("computePinchGesture: pure translation gives scale=1", () => {
    const prev: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
      { clientX: 0, clientY: 0 },
      { clientX: 10, clientY: 0 },
    ];
    const curr: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
      { clientX: 20, clientY: 30 },
      { clientX: 30, clientY: 30 },
    ];
    const g = computePinchGesture(prev, curr);
    expect(g.scale).toBeCloseTo(1, 5);
    expect(g.panPx).toEqual({ dxPx: 20, dyPx: 30 });
  });

  it("computePinchGesture: degenerate previous distance returns scale=1", () => {
    const prev: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
      { clientX: 100, clientY: 100 },
      { clientX: 100, clientY: 100 },
    ];
    const curr: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
      { clientX: 0, clientY: 0 },
      { clientX: 50, clientY: 0 },
    ];
    const g = computePinchGesture(prev, curr);
    expect(g.scale).toBe(1);
  });
});
