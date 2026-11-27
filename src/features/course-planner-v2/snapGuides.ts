/**
 * Smarta stödlinjer vid dragning: när hindrets mittpunkt hamnar nära samma
 * x- eller y-värde som ett annat hinder (eller banans mittlinje) snäpper den
 * dit och en stödlinje visas — som i ett ritprogram. Alt stänger av.
 */

export interface GuideLine {
  /** "x" = lodrät linje vid x = value, "y" = vågrät linje vid y = value. */
  axis: "x" | "y";
  value: number;
  from: number;
  to: number;
  /** Banans mittlinje (ritas annorlunda än hinder-mot-hinder). */
  center?: boolean;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: GuideLine[];
}

interface Target { x: number; y: number }

function bestAxis(
  value: number,
  targets: Target[],
  axis: "x" | "y",
  centerValue: number,
  tolerance: number,
): { value: number; matches: Target[]; center: boolean } | null {
  let best: { value: number; d: number; center: boolean } | null = null;
  for (const t of targets) {
    const d = Math.abs(t[axis] - value);
    if (d <= tolerance && (!best || d < best.d - 1e-9)) best = { value: t[axis], d, center: false };
  }
  const dc = Math.abs(centerValue - value);
  if (dc <= tolerance && (!best || dc < best.d - 1e-9)) best = { value: centerValue, d: dc, center: true };
  if (!best) return null;
  const matches = best.center ? [] : targets.filter((t) => Math.abs(t[axis] - best!.value) < 1e-6);
  return { value: best.value, matches, center: best.center };
}

/**
 * Snäpp `pos` mot `targets` (andra hinders mittpunkter) och banans
 * mittlinjer. `tolerance` i meter — anroparen räknar om från skärmpixlar.
 */
export function computeAlignmentSnap(
  pos: Target,
  targets: Target[],
  tolerance: number,
  arena: { width: number; height: number },
): SnapResult {
  const guides: GuideLine[] = [];
  let { x, y } = pos;
  const bx = bestAxis(pos.x, targets, "x", arena.width / 2, tolerance);
  const by = bestAxis(pos.y, targets, "y", arena.height / 2, tolerance);
  if (bx) x = bx.value;
  if (by) y = by.value;
  const pad = 1.2;
  if (bx) {
    const ys = [y, ...bx.matches.map((t) => t.y)];
    guides.push(bx.center
      ? { axis: "x", value: x, from: 0, to: arena.height, center: true }
      : { axis: "x", value: x, from: Math.max(0, Math.min(...ys) - pad), to: Math.min(arena.height, Math.max(...ys) + pad) });
  }
  if (by) {
    const xs = [x, ...by.matches.map((t) => t.x)];
    guides.push(by.center
      ? { axis: "y", value: y, from: 0, to: arena.width, center: true }
      : { axis: "y", value: y, from: Math.max(0, Math.min(...xs) - pad), to: Math.min(arena.width, Math.max(...xs) + pad) });
  }
  return { x, y, snappedX: !!bx, snappedY: !!by, guides };
}
