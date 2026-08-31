import { describe, expect, it } from "vitest";
import { clampPan, nearestStep, ZOOM_MAX, ZOOM_MIN, ZOOM_STEPS } from "./useCanvasViewport";

describe("nearestStep", () => {
  it("steppar upp till nästa zoomnivå", () => {
    expect(nearestStep(1.0, 1)).toBe(1.5);
    expect(nearestStep(0.5, 1)).toBe(0.75);
  });

  it("steppar ner till föregående zoomnivå", () => {
    expect(nearestStep(1.0, -1)).toBe(0.75);
    expect(nearestStep(2.0, -1)).toBe(1.5);
  });

  it("klämmer vid min/max", () => {
    expect(nearestStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(nearestStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });

  it("hanterar värden mellan stegen", () => {
    expect(nearestStep(1.2, 1)).toBe(1.5);
    expect(nearestStep(1.2, -1)).toBe(1.0);
  });

  it("alla steg ligger inom min/max", () => {
    for (const z of ZOOM_STEPS) {
      expect(z).toBeGreaterThanOrEqual(ZOOM_MIN);
      expect(z).toBeLessThanOrEqual(ZOOM_MAX);
    }
  });
});

describe("clampPan", () => {
  // Arena 40 x 25, zoom 1 → visible = arena + padding (här approximerat 42).
  it("tillåter pan inom gränserna", () => {
    const v = clampPan(0, 40, 42);
    expect(v).toBe(0);
  });

  it("klämmer så arenan aldrig försvinner helt ur vy (positiv riktning)", () => {
    const v = clampPan(100, 40, 42);
    // viewMin = center - vis/2 + pan ≤ arena - 2
    expect(20 - 21 + v).toBeLessThanOrEqual(40 - 2 + 1e-9);
  });

  it("klämmer så arenan aldrig försvinner helt ur vy (negativ riktning)", () => {
    const v = clampPan(-100, 40, 42);
    // viewMax = center + vis/2 + pan ≥ 2
    expect(20 + 21 + v).toBeGreaterThanOrEqual(2 - 1e-9);
  });

  it("är symmetrisk runt noll", () => {
    expect(clampPan(100, 40, 42)).toBe(-clampPan(-100, 40, 42));
  });
});
