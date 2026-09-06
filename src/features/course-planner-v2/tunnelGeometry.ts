/**
 * Banplaneraren v2 — GEMENSAM tunnelgeometri.
 *
 * En enda källa till sanning för hur en (ev. böjd) tunnel ser ut och hur
 * lång vägen genom den är. Används av:
 *  - 2D-glyphen (ObstacleGlyph)
 *  - hundens väg/uppspelning (dogPath.ts)
 *  - PDF-export (pdfHelpers.ts)
 *  - 3D-vyn (Obstacle3DPolished.tsx)
 *
 * Modell: tunneln definieras i lokala koordinater med rak axel längs x,
 * centrerad i origo. Ändarna ligger i (-w/2, 0) och (w/2, 0) — dvs. kordan
 * är alltid w (hindrets "width" enligt config), oavsett böjning. Böjningen
 * är en CIRKELBÅGE med total svängvinkel `curveDeg` (0–180°) som buktar åt
 * +y för `curveSide = "right"` och åt −y för `"left"`.
 *
 * Att kordan hålls konstant betyder att gamla banors x/y/rotation behåller
 * exakt samma innebörd: ändarnas placering ändras inte av den här modulen.
 * Det som blir korrekt är formen mellan ändarna och den beräknade längden
 * (R·θ), som nu är samma sak i ritning, mätning och uppspelning.
 *
 * OBS: hundvägen är en planeringsuppskattning, inte en säkerhetsgaranti.
 */

export interface Vec2 { x: number; y: number }

/** Antal segment längs en böjd tunnel — tätt nog för mätning och rendering. */
export const TUNNEL_SAMPLES = 48;

/** Under den här vinkeln behandlas tunneln som rak. */
const STRAIGHT_EPS_DEG = 0.5;

export function normalizeCurveDeg(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.min(180, n));
}

export function curveSideSign(side: "left" | "right" | undefined): 1 | -1 {
  return side === "left" ? -1 : 1;
}

/** Exakt båglängd: korda `w`, total svängvinkel `curveDeg`. */
export function tunnelPathLengthM(w: number, curveDeg: number): number {
  const theta = (normalizeCurveDeg(curveDeg) * Math.PI) / 180;
  if (theta < (STRAIGHT_EPS_DEG * Math.PI) / 180) return w;
  // R = (w/2)/sin(θ/2), längd = R·θ
  return (w * (theta / 2)) / Math.sin(theta / 2);
}

interface ArcSpec {
  /** Cirkelcentrum i lokala koordinater. */
  c: Vec2;
  r: number;
  /** Startvinkel (vid entry). */
  phi0: number;
  /** Signerad total vinkeländring till exit. */
  delta: number;
}

function arcSpec(w: number, curveDeg: number, side: 1 | -1): ArcSpec | null {
  const deg = normalizeCurveDeg(curveDeg);
  if (deg < STRAIGHT_EPS_DEG) return null;
  const theta = (deg * Math.PI) / 180;
  const r = (w / 2) / Math.sin(theta / 2);
  const cy = -side * r * Math.cos(theta / 2);
  const c: Vec2 = { x: 0, y: cy };
  const phi0 = Math.atan2(0 - c.y, -w / 2 - c.x);
  // Bågen svänger alltid åt −side (så att bukten hamnar åt +side·y).
  const delta = -side * theta;
  return { c, r, phi0, delta };
}

function arcPoint(a: ArcSpec, t: number, radiusOffset = 0): Vec2 {
  const phi = a.phi0 + a.delta * t;
  const rr = a.r + radiusOffset;
  return { x: a.c.x + rr * Math.cos(phi), y: a.c.y + rr * Math.sin(phi) };
}

export interface TunnelGeometry {
  /** Mittlinjen från entry till exit, i lokala koordinater. */
  centerline: Vec2[];
  /** Faktisk längd av mittlinjen (m). Rak tunnel = w. */
  lengthM: number;
  /** Enhetstangent vid entry (färdriktning in i tunneln). */
  entryDir: Vec2;
  /** Enhetstangent vid exit. */
  exitDir: Vec2;
}

function unit(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** Mittlinjen genom tunneln i lokala koordinater (entry → exit). */
export function tunnelGeometryLocal(
  w: number,
  curveDeg: number,
  curveSide: "left" | "right" | undefined,
  samples: number = TUNNEL_SAMPLES,
): TunnelGeometry {
  const side = curveSideSign(curveSide);
  const spec = arcSpec(w, curveDeg, side);
  if (!spec) {
    return {
      centerline: [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }],
      lengthM: w,
      entryDir: { x: 1, y: 0 },
      exitDir: { x: 1, y: 0 },
    };
  }
  const n = Math.max(4, Math.round(samples));
  const centerline: Vec2[] = [];
  for (let i = 0; i <= n; i++) centerline.push(arcPoint(spec, i / n, 0));
  const sgn = Math.sign(spec.delta);
  const tangentAt = (t: number): Vec2 => {
    const phi = spec.phi0 + spec.delta * t;
    return unit({ x: -Math.sin(phi) * sgn, y: Math.cos(phi) * sgn });
  };
  return {
    centerline,
    lengthM: spec.r * Math.abs(spec.delta),
    entryDir: tangentAt(0),
    exitDir: tangentAt(1),
  };
}

/** Tunnelns två väggar (ytterkanter) i lokala koordinater. */
export function tunnelEdgesLocal(
  w: number,
  d: number,
  curveDeg: number,
  curveSide: "left" | "right" | undefined,
  samples: number = TUNNEL_SAMPLES,
): { top: Vec2[]; bottom: Vec2[] } {
  const side = curveSideSign(curveSide);
  const spec = arcSpec(w, curveDeg, side);
  const r = d / 2;
  if (!spec) {
    return {
      top: [{ x: -w / 2, y: -r }, { x: w / 2, y: -r }],
      bottom: [{ x: -w / 2, y: r }, { x: w / 2, y: r }],
    };
  }
  const n = Math.max(4, Math.round(samples));
  const top: Vec2[] = [];
  const bottom: Vec2[] = [];
  // Radiell offset: "top" (lokal −y i rakt läge) ligger mot centrum när
  // tunneln buktar åt +y (right) och från centrum när den buktar åt −y.
  const outward = -side;
  for (let i = 0; i <= n; i++) {
    top.push(arcPoint(spec, i / n, outward * r));
    bottom.push(arcPoint(spec, i / n, -outward * r));
  }
  return { top, bottom };
}

function toD(points: Vec2[], prefix = "M"): string {
  return points
    .map((p, i) => `${i === 0 ? prefix : "L"} ${round(p.x)} ${round(p.y)}`)
    .join(" ");
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Sluten SVG-kontur (för fyllning) i lokala koordinater. */
export function tunnelOutlineD(
  w: number,
  d: number,
  curveDeg: number,
  curveSide: "left" | "right" | undefined,
): string {
  const { top, bottom } = tunnelEdgesLocal(w, d, curveDeg, curveSide);
  return `${toD(top)} ${toD([...bottom].reverse(), "L")} Z`;
}

/** SVG-d för en enskild vägg. */
export function tunnelEdgeD(points: Vec2[]): string {
  return toD(points);
}

/** Roterar och flyttar en lokal punkt till banans koordinatsystem. */
export function toWorld(p: Vec2, cx: number, cy: number, rotationDeg: number): Vec2 {
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c };
}

/** Roterar en riktningsvektor (ingen translation). */
export function rotateDir(v: Vec2, rotationDeg: number): Vec2 {
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * Axelinriktad bounding box i VÄRLDSKOORDINATER för en (ev. böjd) tunnel.
 *
 * En böjd tunnel buktar utanför den raka rektangeln — utan det här skulle
 * bågen kunna hamna utanför banytan utan att valideringen märker det.
 */
export function tunnelWorldAabb(
  center: Vec2,
  w: number,
  d: number,
  rotationDeg: number,
  curveDeg: number,
  curveSide: "left" | "right" | undefined,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const { top, bottom } = tunnelEdgesLocal(w, d, curveDeg, curveSide);
  const a = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of [...top, ...bottom]) {
    const x = center.x + p.x * cos - p.y * sin;
    const y = center.y + p.x * sin + p.y * cos;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
