from pathlib import Path
p = Path('src/features/course-planner-v2/pdfHelpers.ts')
s = p.read_text()
s = 'import { buildDogPath } from "./dogPath";\n' + s
start = s.index('  // Banlinje (numrerade hinder)')
end = s.index('  // Hinder + nummer', start)
s = s[:start] + s[end:]
needle = '  // Nummer-brickor'
path = '''  // Samma samplade hundväg som editor och uppspelning, även en ensam
  // böjd tunnel. Rita ovanpå hindren så vägen inte döljs av deras fyllning.
  if (showPath) {
    const { points } = buildDogPath(obstacles.filter(o =>
      !["start", "finish", "number", "handler_zone"].includes(o.type)));
    if (points.length > 1) {
      doc.setDrawColor(...PDF_BRAND.secondary);
      doc.setLineWidth(0.6);
      doc.setLineDashPattern([1.5, 1], 0);
      const steps = points.slice(1).map((p, i) => [
        (p.x - points[i].x) * mmPerM, (p.y - points[i].y) * mmPerM,
      ]);
      doc.lines(steps, m2x(points[0].x), m2y(points[0].y), [1, 1], "S", false);
      doc.setLineDashPattern([], 0);
    }
  }

'''
assert needle in s
s = s.replace(needle, path + needle)
s = s.replace('return { w, h, mmPerM };', 'return { w: w + dimMargin, h: h + dimMargin, mmPerM };')
s = s.replace('Returnerar de faktiska arena-måtten (mm) som ritades', 'Returnerar det upptagna utrymmet inklusive linjaler (mm)')
p.write_text(s)
p = Path('src/features/course-planner-v2/buildPdf.ts')
s = p.read_text()
assert 'maxHeight: pageH - 32 - 12,' in s
p.write_text(s.replace('maxHeight: pageH - 32 - 12,', 'maxHeight: pageH - 32 - 40, // reservera plats för skala, QR och sidfot'))

Path('src/features/course-planner-v2/pdfExportGeometry.test.ts').write_text('''import { describe, expect, it, vi } from "vitest";
import jsPDF from "jspdf";
import { drawArenaVector } from "./pdfHelpers";

describe("PDF geometry and occupied layout", () => {
  it("prints the curved dog path through a single tunnel, not its chord", () => {
    const doc = new jsPDF();
    const lines = vi.spyOn(doc, "lines");
    const layout = drawArenaVector(doc, {
      x: 10, y: 20, maxWidth: 180, maxHeight: 180,
      arenaWidthM: 30, arenaHeightM: 30, grid: false, showDimensions: false,
      obstacles: [{ id: "t", type: "tunnel", x: 10, y: 10, rotation: 0,
        number: 1, curveDeg: 180, curveSide: "left" }],
    });
    // Two tunnel outline strokes followed by the independently visible path.
    expect(lines.mock.calls).toHaveLength(3);
    const last = lines.mock.calls.at(-1)!;
    const steps = last[0] as number[][];
    expect(steps.length).toBeGreaterThan(40);
    let x = last[1], y = last[2], minY = y;
    for (const step of steps) { x += step[0]; y += step[1]; minY = Math.min(minY, y); }
    // A semicircle with a 3m chord has radius 1.5m (independent oracle).
    expect(minY).toBeCloseTo(20 + 8.5 * layout.mmPerM, 6);
    expect(y).toBeCloseTo(20 + 10 * layout.mmPerM, 6);
    expect(x).toBeCloseTo(10 + 11.5 * layout.mmPerM, 6);
  });
  it("reports ruler margin in consumed height so following text cannot overlap", () => {
    const doc = new jsPDF();
    const layout = drawArenaVector(doc, {
      x: 12, y: 50, maxWidth: 186, maxHeight: 117,
      arenaWidthM: 30, arenaHeightM: 40, obstacles: [], grid: false,
    });
    expect(layout.h).toBeCloseTo(117, 8);
    expect(layout.h).toBeCloseTo(8 + 40 * layout.mmPerM, 8);
  });
});
''')
