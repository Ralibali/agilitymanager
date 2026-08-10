/**
 * Banplaneraren v2 — hundens väg.
 *
 * Hundlinjen byggs i nummerordning och används både för rendering,
 * banlängd och säkerhetskontroller. Viktigt: ett hinder kan tas från två håll.
 * Entry/exit orienteras därför efter den faktiska nummerföljden i stället för
 * att blint anta en fast färdriktning från hindrets rotationsvärde.
 */

import { getObstacleDefV2, type ObstacleTypeV2 } from "./config";

export interface DogPathObstacle {
  id?: string;
  type: ObstacleTypeV2;
  x: number;
  y: number;
  rotation: number;
  number?: number | null;
  /** Tunnelböjning 0–180°. */
  curveDeg?: number;
  /** Tunnelsida ("left"/"right"). */
  curveSide?: "left" | "right";
}

export interface Vec2 { x: number; y: number }

export interface ObstacleAnchors {
  obstacle: DogPathObstacle;
  center: Vec2;
  entry: Vec2;
  exit: Vec2;
  /** Längd som hunden faktiskt rör sig längs INUTI hindret (m). */
  internalLengthM: number;
  /** Tangent vid entry (riktning hunden färdas in i hindret). */
  entryDir: Vec2;
  /** Tangent vid exit (riktning hunden färdas ut ur hindret). */
  exitDir: Vec2;
}

export interface DogPath {
  /** Anchors per hinder i nummerordning. */
  anchors: ObstacleAnchors[];
  /** Samplade punkter längs hela vägen. */
  points: Vec2[];
  /** Ackumulerad längd vid varje punkt. */
  cum: number[];
  /** Total längd i meter. */
  total: number;
  /** Hur mycket av totalen kommer från hinderinternt avstånd. */
  obstacleM: number;
  /** Hur mycket kommer från luftsegment mellan hinder. */
  airM: number;
}

export interface DogPathPairDistance {
  fromId?: string;
  toId?: string;
  fromNumber: number;
  toNumber: number;
  /** Beräknad hundväg från föregående hinders exit till nästa hinders entry. */
  distanceM: number;
}

/** Editbar override sparad i banans JSON. Tom = auto-genererad väg. */
export interface CourseDogPathOverride {
  controlPoints?: Vec2[];
}

const SAMPLES_PER_AIR_SEGMENT = 18;

/* ───────────── Hjälpfunktioner ───────────── */

/** Vilken axel är "huvudriktningen" hunden tar genom hindret. */
function travelAxis(type: ObstacleTypeV2): "depth" | "width" | "point" {
  switch (type) {
    case "tunnel":
      return "width";
    case "weave_8":
    case "weave_10":
    case "weave_12":
    case "aframe":
    case "dogwalk":
    case "seesaw":
    case "jump":
    case "wall":
    case "longjump":
    case "tire":
    case "combo":
      return "depth";
    default:
      return "point";
  }
}

function rotateVec(v: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function negate(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Båglängd för en tunnel med chord = w och böjningsvinkel θ (rad). */
function tunnelArcLength(chordM: number, thetaRad: number): number {
  if (thetaRad <= 0.0001) return chordM;
  return (chordM * (thetaRad / 2)) / Math.sin(thetaRad / 2);
}

/* ───────────── Anchors per hinder ───────────── */

export function getObstacleAnchors(ob: DogPathObstacle): ObstacleAnchors {
  const def = getObstacleDefV2(ob.type);
  const rotRad = (ob.rotation * Math.PI) / 180;
  const center: Vec2 = { x: ob.x, y: ob.y };

  if (!def) {
    return {
      obstacle: ob, center, entry: center, exit: center,
      internalLengthM: 0,
      entryDir: { x: 1, y: 0 },
      exitDir: { x: 1, y: 0 },
    };
  }

  const axis = travelAxis(ob.type);
  if (axis === "point") {
    const dir = { x: Math.cos(rotRad), y: Math.sin(rotRad) };
    return {
      obstacle: ob, center, entry: center, exit: center,
      internalLengthM: 0,
      entryDir: dir,
      exitDir: dir,
    };
  }

  if (axis === "width") {
    const halfW = def.sizeM.w / 2;
    const dir = rotateVec({ x: 1, y: 0 }, rotRad);
    const entry: Vec2 = { x: center.x - dir.x * halfW, y: center.y - dir.y * halfW };
    const exit: Vec2 = { x: center.x + dir.x * halfW, y: center.y + dir.y * halfW };
    const curveDeg = ob.curveDeg ?? 0;
    const thetaRad = (Math.max(0, Math.min(180, curveDeg)) * Math.PI) / 180;
    const internalLengthM = tunnelArcLength(def.sizeM.w, thetaRad);
    return { obstacle: ob, center, entry, exit, internalLengthM, entryDir: dir, exitDir: dir };
  }

  const halfD = def.sizeM.d / 2;
  const dir = rotateVec({ x: 0, y: 1 }, rotRad);
  const entry: Vec2 = { x: center.x - dir.x * halfD, y: center.y - dir.y * halfD };
  const exit: Vec2 = { x: center.x + dir.x * halfD, y: center.y + dir.y * halfD };
  return { obstacle: ob, center, entry, exit, internalLengthM: def.sizeM.d, entryDir: dir, exitDir: dir };
}

/** Samma fysiska hinder taget från motsatt håll. */
function flipAnchor(a: ObstacleAnchors): ObstacleAnchors {
  if (travelAxis(a.obstacle.type) === "point") return a;
  return {
    ...a,
    entry: a.exit,
    exit: a.entry,
    entryDir: negate(a.exitDir),
    exitDir: negate(a.entryDir),
  };
}

/**
 * Välj färdriktning genom varje hinder utifrån nummerföljden.
 *
 * Första hindret väljs så att utgången pekar mot nästa hinder. Därefter väljs
 * den sida på varje hinder vars entry ligger närmast föregående hinders exit.
 * Detta gör att hundlinjen följer den sannolika färdriktningen i banan, även
 * när samma hinderrotation kan representera passage från två håll.
 */
export function orientAnchorsToCourse(base: ObstacleAnchors[]): ObstacleAnchors[] {
  if (base.length <= 1) return base;
  const oriented: ObstacleAnchors[] = [];

  for (let i = 0; i < base.length; i++) {
    const normal = base[i];
    const flipped = flipAnchor(normal);
    if (normal === flipped) {
      oriented.push(normal);
      continue;
    }

    if (i === 0) {
      const nextCenter = base[i + 1].center;
      oriented.push(distance(normal.exit, nextCenter) <= distance(flipped.exit, nextCenter) ? normal : flipped);
      continue;
    }

    const prevExit = oriented[i - 1].exit;
    oriented.push(distance(prevExit, normal.entry) <= distance(prevExit, flipped.entry) ? normal : flipped);
  }

  return oriented;
}

/* ───────────── Catmull-Rom sampling ───────────── */

/** Centripetal Catmull-Rom genom 4 punkter. t ∈ [0,1]. */
function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number, alpha = 0.5): Vec2 {
  const dist = (a: Vec2, b: Vec2) => Math.pow(Math.hypot(a.x - b.x, a.y - b.y), alpha);
  const t0 = 0;
  const t1 = t0 + Math.max(0.0001, dist(p0, p1));
  const t2 = t1 + Math.max(0.0001, dist(p1, p2));
  const t3 = t2 + Math.max(0.0001, dist(p2, p3));
  const tt = t1 + (t2 - t1) * t;
  const a1 = lerpVec(p0, p1, (tt - t0) / (t1 - t0));
  const a2 = lerpVec(p1, p2, (tt - t1) / (t2 - t1));
  const a3 = lerpVec(p2, p3, (tt - t2) / (t3 - t2));
  const b1 = lerpVec(a1, a2, (tt - t0) / (t2 - t0));
  const b2 = lerpVec(a2, a3, (tt - t1) / (t3 - t1));
  return lerpVec(b1, b2, (tt - t1) / (t2 - t1));
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/* ───────────── Bygg banan ───────────── */

export function buildDogPath(
  obstacles: DogPathObstacle[],
  override?: CourseDogPathOverride,
): DogPath {
  const numbered = obstacles
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const anchors = orientAnchorsToCourse(numbered.map(getObstacleAnchors));

  if (override?.controlPoints && override.controlPoints.length >= 2) {
    const points = override.controlPoints.slice();
    const cum: number[] = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += distance(points[i], points[i - 1]);
      cum.push(total);
    }
    return { anchors, points, cum, total, obstacleM: 0, airM: total };
  }

  if (anchors.length === 0) {
    return { anchors, points: [], cum: [], total: 0, obstacleM: 0, airM: 0 };
  }
  if (anchors.length === 1) {
    return {
      anchors,
      points: [anchors[0].entry, anchors[0].exit],
      cum: [0, anchors[0].internalLengthM],
      total: anchors[0].internalLengthM,
      obstacleM: anchors[0].internalLengthM,
      airM: 0,
    };
  }

  const knots: Vec2[] = [];
  for (const a of anchors) {
    knots.push(a.entry);
    knots.push(a.exit);
  }

  const points: Vec2[] = [];
  for (let i = 0; i < knots.length - 1; i++) {
    const isInside = i % 2 === 0;
    const startKnot = knots[i];
    const endKnot = knots[i + 1];

    if (i === 0) points.push(startKnot);

    if (isInside) {
      points.push(endKnot);
    } else {
      const p0 = i - 1 >= 0 ? knots[i - 1] : startKnot;
      const p1 = startKnot;
      const p2 = endKnot;
      const p3 = i + 2 < knots.length ? knots[i + 2] : endKnot;
      for (let s = 1; s <= SAMPLES_PER_AIR_SEGMENT; s++) {
        const t = s / SAMPLES_PER_AIR_SEGMENT;
        points.push(catmullRom(p0, p1, p2, p3, t));
      }
    }
  }

  return finalize(points, anchors);
}

/**
 * Returnerar den verkliga, samplade hundvägen mellan varje två på varandra
 * följande hinder. För auto-genererad väg används exakt samma kurva som syns
 * i editorn. Med manuell override kan vi inte entydigt dela kontrollpunkterna
 * per hinderpar och faller därför tillbaka till exit→entry som konservativ
 * teknisk approximation.
 */
export function computeDogPathPairDistances(
  obstacles: DogPathObstacle[],
  override?: CourseDogPathOverride,
): DogPathPairDistance[] {
  const path = buildDogPath(obstacles, override);
  if (path.anchors.length < 2) return [];

  if (override?.controlPoints && override.controlPoints.length >= 2) {
    return path.anchors.slice(0, -1).map((a, i) => {
      const b = path.anchors[i + 1];
      return {
        fromId: a.obstacle.id,
        toId: b.obstacle.id,
        fromNumber: a.obstacle.number as number,
        toNumber: b.obstacle.number as number,
        distanceM: distance(a.exit, b.entry),
      };
    });
  }

  const result: DogPathPairDistance[] = [];
  let idx = 1; // index 1 är exit för första hindret
  for (let i = 0; i < path.anchors.length - 1; i++) {
    let segmentM = 0;
    for (let s = 0; s < SAMPLES_PER_AIR_SEGMENT; s++) {
      const from = path.points[idx + s];
      const to = path.points[idx + s + 1];
      if (!from || !to) break;
      segmentM += distance(from, to);
    }
    const a = path.anchors[i];
    const b = path.anchors[i + 1];
    result.push({
      fromId: a.obstacle.id,
      toId: b.obstacle.id,
      fromNumber: a.obstacle.number as number,
      toNumber: b.obstacle.number as number,
      distanceM: segmentM,
    });
    // exit_i -> 18 luftsteg -> entry_{i+1}, därefter ett steg till exit_{i+1}
    idx += SAMPLES_PER_AIR_SEGMENT + 1;
  }
  return result;
}

function finalize(points: Vec2[], anchors: ObstacleAnchors[]): DogPath {
  const cum: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i], points[i - 1]);
    cum.push(total);
  }

  let obstacleM = 0;
  let airM = 0;
  if (anchors.length >= 1) {
    let idx = 0;
    for (let i = 0; i < anchors.length; i++) {
      const exitIdx = idx + 1;
      obstacleM += anchors[i].internalLengthM;
      idx = exitIdx;
      if (i < anchors.length - 1) {
        let segLen = 0;
        for (let s = 0; s < SAMPLES_PER_AIR_SEGMENT; s++) {
          const from = points[idx + s];
          const to = points[idx + s + 1];
          if (!from || !to) break;
          segLen += distance(from, to);
        }
        airM += segLen;
        idx += SAMPLES_PER_AIR_SEGMENT;
      }
    }
  }

  const correctedTotal = obstacleM + airM;
  if (Math.abs(correctedTotal - total) > 0.001 && total > 0) {
    const scale = correctedTotal / total;
    for (let i = 0; i < cum.length; i++) cum[i] *= scale;
    total = correctedTotal;
  }

  return { anchors, points, cum, total, obstacleM, airM };
}

/* ───────────── Sampling-helpers ───────────── */

export interface DogPathPose extends Vec2 {
  heading: number;
}

export function sampleDogPathAt(path: DogPath, t: number): DogPathPose | null {
  if (path.points.length === 0) return null;
  if (path.points.length === 1 || path.total === 0) {
    return { x: path.points[0].x, y: path.points[0].y, heading: 0 };
  }
  const clamped = Math.max(0, Math.min(1, t));
  const target = clamped * path.total;
  let i = 1;
  while (i < path.cum.length && path.cum[i] < target) i++;
  if (i >= path.cum.length) i = path.cum.length - 1;
  const segLen = path.cum[i] - path.cum[i - 1];
  const localT = segLen > 0 ? (target - path.cum[i - 1]) / segLen : 0;
  const a = path.points[i - 1];
  const b = path.points[i];
  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT,
    heading: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

export function dogPathToSvgD(path: DogPath): string {
  if (path.points.length < 2) return "";
  return path.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function dogPathToSvgDUntil(path: DogPath, t: number): string {
  if (path.points.length < 2 || path.total === 0) return "";
  const target = Math.max(0, Math.min(1, t)) * path.total;
  const parts: string[] = [`M ${path.points[0].x} ${path.points[0].y}`];
  for (let i = 1; i < path.points.length; i++) {
    if (path.cum[i] <= target) {
      parts.push(`L ${path.points[i].x} ${path.points[i].y}`);
    } else {
      const segLen = path.cum[i] - path.cum[i - 1];
      const localT = segLen > 0 ? (target - path.cum[i - 1]) / segLen : 0;
      const a = path.points[i - 1];
      const b = path.points[i];
      parts.push(`L ${a.x + (b.x - a.x) * localT} ${a.y + (b.y - a.y) * localT}`);
      break;
    }
  }
  return parts.join(" ");
}

export function computeDogPathLength(obstacles: DogPathObstacle[], override?: CourseDogPathOverride): number {
  return buildDogPath(obstacles, override).total;
}
