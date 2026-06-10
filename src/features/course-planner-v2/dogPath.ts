/**
 * Banplaneraren v2 — Hundens väg (Prompt B).
 *
 * Genererar en mjuk Catmull-Rom-kurva genom hindren i nummerordning, där
 * varje hinder bidrar med sin egen genomgångslängd (tunnelböjning,
 * slalomlängd, kontaktfält). Detta är skillnaden mot center-till-center-
 * mätningen i `validation.ts → computeCourseLength`.
 *
 * Designval:
 *  - Vi använder hinderets `rotation` och dess `sizeM` (från OBSTACLES_V2)
 *    för att räkna ut entry/exit-punkter (hundens in- och utgång genom
 *    hindret) snarare än mittpunkter.
 *  - Hopp/däck/mur/långhopp: dog crossar bommen längs djup-axeln (d).
 *    Entry/exit ligger d/2 från centrum åt vardera håll.
 *  - Tunnel: huvudaxeln är `w` (default 3 m). Med `curveDeg` adderas en
 *    bågkorrektion: arc ≈ w * (θ/2) / sin(θ/2). Endpunkterna lämnas som
 *    chord-ändar (alltså w/2 ut från centrum) — det stämmer geometriskt
 *    eftersom tunnelns chord = w.
 *  - Slalom (weave_*): huvudaxel `d`, entry/exit i ändarna.
 *  - Kontaktfält (aframe/dogwalk/seesaw): huvudaxel `d`.
 *  - Bord/start/finish/number: behandlas som punkter.
 *
 * Vägen mellan hindrens exit_i → entry_{i+1} sampla via centripetal
 * Catmull-Rom så att skarpa kurvor inte överskjuter.
 *
 * Editbara kontrollpunkter (`dogPath.controlPoints`) är förberedda i
 * typen `CourseDogPathOverride` men UI för dragning kommer i senare
 * iteration — `buildDogPath` läser dem om de finns och hoppar då över
 * default-anchors mellan hindren.
 */

import { getObstacleDefV2, type ObstacleTypeV2 } from "./config";

export interface DogPathObstacle {
  id?: string;
  type: ObstacleTypeV2;
  x: number;
  y: number;
  rotation: number;
  number?: number | null;
  /** Tunnelböjning 0–90°. */
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
  /** Tangent vid entry (riktning hunden kommer in i). */
  entryDir: Vec2;
  /** Tangent vid exit (riktning hunden lämnar). */
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
  /** Hur mycket av total kommer från obstacle-interna längder. */
  obstacleM: number;
  /** Hur mycket kommer från luft-segment mellan hinder. */
  airM: number;
}

/** Editbar override sparad i banans JSON. Tom = auto-genererad väg. */
export interface CourseDogPathOverride {
  controlPoints?: Vec2[];
}

/* ───────────── Hjälpfunktioner ───────────── */

/** Vilken axel är "huvudriktningen" hunden tar genom hindret. */
function travelAxis(type: ObstacleTypeV2): "depth" | "width" | "point" {
  switch (type) {
    case "tunnel":
      return "width"; // tunneln ligger längs sin bredd (w = längd)
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

/** Båglängd för en tunnel med chord = w och böjningsvinkel θ (rad). */
function tunnelArcLength(chordM: number, thetaRad: number): number {
  if (thetaRad <= 0.0001) return chordM;
  // arc = chord * (θ/2) / sin(θ/2)
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
    return {
      obstacle: ob, center, entry: center, exit: center,
      internalLengthM: 0,
      entryDir: { x: Math.cos(rotRad), y: Math.sin(rotRad) },
      exitDir: { x: Math.cos(rotRad), y: Math.sin(rotRad) },
    };
  }

  if (axis === "width") {
    // tunnel: huvudaxel är x (width) vid rotation 0
    const halfW = def.sizeM.w / 2;
    const dir = rotateVec({ x: 1, y: 0 }, rotRad);
    const entry: Vec2 = { x: center.x - dir.x * halfW, y: center.y - dir.y * halfW };
    const exit: Vec2 = { x: center.x + dir.x * halfW, y: center.y + dir.y * halfW };
    const curveDeg = ob.curveDeg ?? 0;
    const thetaRad = (Math.max(0, Math.min(180, curveDeg)) * Math.PI) / 180;
    const internalLengthM = tunnelArcLength(def.sizeM.w, thetaRad);
    return { obstacle: ob, center, entry, exit, internalLengthM, entryDir: dir, exitDir: dir };
  }

  // axis === "depth": huvudaxel är y (depth) vid rotation 0
  const halfD = def.sizeM.d / 2;
  const dir = rotateVec({ x: 0, y: 1 }, rotRad);
  const entry: Vec2 = { x: center.x - dir.x * halfD, y: center.y - dir.y * halfD };
  const exit: Vec2 = { x: center.x + dir.x * halfD, y: center.y + dir.y * halfD };
  return { obstacle: ob, center, entry, exit, internalLengthM: def.sizeM.d, entryDir: dir, exitDir: dir };
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

/**
 * Bygger hundens väg från numrerade hinder.
 * Om `override.controlPoints` är satta används de istället för auto-anchors.
 */
export function buildDogPath(
  obstacles: DogPathObstacle[],
  override?: CourseDogPathOverride,
): DogPath {
  const numbered = obstacles
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const anchors = numbered.map(getObstacleAnchors);

  // Specialfall: editbar väg (framtida UI för kontrollpunkter)
  if (override?.controlPoints && override.controlPoints.length >= 2) {
    const points = override.controlPoints.slice();
    return finalize(points, anchors);
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

  // Bygg "knots": entry₁, exit₁, entry₂, exit₂, ...
  const knots: Vec2[] = [];
  // Märk knot-typ så vi vet vilka segment som ska ersättas av obstacle-intern längd.
  // 0..2N-1 där par (2i, 2i+1) tillhör hinder i.
  for (const a of anchors) {
    knots.push(a.entry);
    knots.push(a.exit);
  }

  // Samla samplade punkter
  const points: Vec2[] = [];
  // För varje segment mellan knot i och knot i+1: bestäm om det är
  // "inuti hinder" eller "i luft mellan hinder".
  const SAMPLES_PER_AIR_SEGMENT = 18;
  for (let i = 0; i < knots.length - 1; i++) {
    const isInside = i % 2 === 0; // 0,2,4… = inom samma hinder
    const startKnot = knots[i];
    const endKnot = knots[i + 1];

    if (i === 0) points.push(startKnot);

    if (isInside) {
      // För tunnel med curve hade vi kunnat sampla en båge, men för längd
      // räcker det att rapportera internalLengthM. Vi pushar bara endpunkten.
      points.push(endKnot);
    } else {
      // Luft-segment mellan exit_(j-1) och entry_j — Catmull-Rom genom
      // omgivande knots för mjuk kurva.
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

function finalize(points: Vec2[], anchors: ObstacleAnchors[]): DogPath {
  const cum: number[] = [0];
  let total = 0;
  // Vi måste skilja på obstacle-interna och luft. För enkelhet räknar vi
  // total som faktisk samplad polyline-längd; sedan separerar vi för
  // statistik genom att ersätta varje "inuti hinder"-segmentlängd med
  // det teoretiska obstacle.internalLengthM (mer korrekt för t.ex.
  // krökt tunnel där polylinen bara är rak chord).
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
    cum.push(total);
  }

  // Justera tunnel-bågkorrektion: vid varje "inuti hinder"-segment
  // (vid index 2*idx → 2*idx+1) ersätt segmentlängden med anchor.internalLengthM.
  // points-layouten: [entry0, exit0, ...air..., entry1, exit1, ...]
  // OK detta är knepigt — gör enklare: rebuild cum från segments-listan.

  // Rebuild från grunden för korrekt mätning:
  // Skapa list av "segmentlängder" där:
  //   - varje obstacle-intern bidrar med anchor.internalLengthM
  //   - varje air-segment bidrar med samplad polyline-längd mellan dess punkter
  // Vi hittar obstacle-interna segment genom att räkna entries.
  // Vi vet att points = [entry0, exit0, <air pts>..., entry1, exit1, <air>..., entryN, exitN]
  // Hitta indices för entry/exit-punkterna genom att stega.
  let obstacleM = 0;
  let airM = 0;
  if (anchors.length >= 1) {
    // Rekonstruera indexsekvens:
    // Början: index 0 = entry0, index 1 = exit0.
    // Sedan SAMPLES_PER_AIR_SEGMENT luft-pts → entry1, exit1 …
    const SAMPLES_PER_AIR_SEGMENT = 18;
    let idx = 0;
    for (let i = 0; i < anchors.length; i++) {
      const entryIdx = idx;
      const exitIdx = entryIdx + 1;
      obstacleM += anchors[i].internalLengthM;
      idx = exitIdx;
      if (i < anchors.length - 1) {
        // air-segment mellan exit_i och entry_{i+1}: SAMPLES_PER_AIR_SEGMENT punkter
        let segLen = 0;
        for (let s = 0; s < SAMPLES_PER_AIR_SEGMENT; s++) {
          const from = points[idx + s];
          const to = points[idx + s + 1];
          if (!from || !to) break;
          segLen += Math.hypot(to.x - from.x, to.y - from.y);
        }
        airM += segLen;
        idx = idx + SAMPLES_PER_AIR_SEGMENT;
      }
    }
  }

  const correctedTotal = obstacleM + airM;
  // Rebuild cum proportionellt med corrected total om det skiljer från
  // den naiva summan (skillnaden = tunnel-bågkorrektion).
  if (Math.abs(correctedTotal - total) > 0.001 && total > 0) {
    const scale = correctedTotal / total;
    for (let i = 0; i < cum.length; i++) cum[i] = cum[i] * scale;
    total = correctedTotal;
  }

  return { anchors, points, cum, total, obstacleM, airM };
}

/* ───────────── Sampling-helpers (för uppspelning + render) ───────────── */

export interface DogPathPose extends Vec2 {
  heading: number; // radianer
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

/** Bekvämlighetsfunktion: total längd direkt. */
export function computeDogPathLength(obstacles: DogPathObstacle[], override?: CourseDogPathOverride): number {
  return buildDogPath(obstacles, override).total;
}
