/**
 * Banplaneraren v2 — Prompt C
 *
 * Två funktioner:
 *  1) `computeApproachIssues` — säkerhetsvarningar baserade på vinkeln
 *     mellan hundens väg och hindrets riktning vid ankomst (däck, långhopp,
 *     kontaktfält, tunnelmynning).
 *  2) `analyzeCourse` — bananalys/svårighet (riktningsbyten, sidbyten,
 *     längsta raksträcka, medelsvängskärpa) presenterat transparent.
 *
 * Båda läser från `buildDogPath` så de speglar EXAKT samma kurva som
 * användaren ser på canvasen.
 *
 * ⚠️ Värden för tröskelvinklar är TODO VERIFIERA mot SAgiK "Säkra hinder".
 * Placeholders dokumenterade nedan.
 */

import { buildDogPath, type DogPathObstacle, type CourseDogPathOverride } from "./dogPath";
import type { ValidationIssue, ObstacleLite } from "./validation";
import type { ObstacleTypeV2 } from "./config";

const STRAIGHT_REQUIRED: ObstacleTypeV2[] = ["tire", "longjump"];
const CONTACT_TYPES: ObstacleTypeV2[] = ["aframe", "dogwalk", "seesaw"];

/** Tröskelvinklar (grader). TODO VERIFIERA mot SAgiK Säkra hinder. */
export const APPROACH_THRESHOLDS = {
  /** Däck/långhopp — varning över X°, fel över Y°. */
  straightWarn: 20,
  straightError: 35,
  /** Kontaktfält — varning över X°. */
  contactWarn: 25,
  /** Tunnelmynning — varning över X°. */
  tunnelWarn: 45,
  /** Hopp i kurva — info över X° kurvatur runt entry. */
  jumpCurvatureInfo: 70,
} as const;

interface Vec2 { x: number; y: number }

function normalize(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

/** Vinkel (grader) mellan två vektorer, alltid 0–180. */
function angleBetweenDeg(a: Vec2, b: Vec2): number {
  const na = normalize(a);
  const nb = normalize(b);
  const dot = Math.max(-1, Math.min(1, na.x * nb.x + na.y * nb.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Riktningsvinkel — 0–180, oavsett pil-riktning. */
function unsignedAxisAngleDeg(approach: Vec2, axis: Vec2): number {
  const a = angleBetweenDeg(approach, axis);
  return Math.min(a, 180 - a);
}

/* ───────────── Approach-angle validering ───────────── */

export function computeApproachIssues(
  obstacles: ObstacleLite[],
  override?: CourseDogPathOverride,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dogObs: DogPathObstacle[] = obstacles.map((o) => ({
    id: o.id, type: o.type, x: o.x, y: o.y, rotation: o.rotation,
    number: o.number, curveDeg: o.curveDeg, curveSide: o.curveSide,
  }));
  const path = buildDogPath(dogObs, override);
  if (path.anchors.length < 2) return issues;

  for (let i = 1; i < path.anchors.length; i++) {
    const prev = path.anchors[i - 1];
    const cur = path.anchors[i];
    const approach: Vec2 = {
      x: cur.entry.x - prev.exit.x,
      y: cur.entry.y - prev.exit.y,
    };
    if (Math.hypot(approach.x, approach.y) < 0.1) continue;

    const type = cur.obstacle.type;
    const number = cur.obstacle.number;

    if (STRAIGHT_REQUIRED.includes(type)) {
      // Rak ansats krävs — vinkel mot hindrets travel-axel (entryDir)
      const dev = unsignedAxisAngleDeg(approach, cur.entryDir);
      if (dev >= APPROACH_THRESHOLDS.straightError) {
        issues.push({
          level: "error",
          code: "bad_approach_angle",
          message: `${labelFor(type)} ${number ?? ""}: ansatsvinkel ${dev.toFixed(0)}° — kräver rak ansats (< ${APPROACH_THRESHOLDS.straightError}°)`,
          obstacleId: cur.obstacle.id,
        });
      } else if (dev >= APPROACH_THRESHOLDS.straightWarn) {
        issues.push({
          level: "warning",
          code: "bad_approach_angle",
          message: `${labelFor(type)} ${number ?? ""}: ansatsvinkel ${dev.toFixed(0)}° — bör vara så rak som möjligt`,
          obstacleId: cur.obstacle.id,
        });
      }
    } else if (CONTACT_TYPES.includes(type)) {
      const dev = unsignedAxisAngleDeg(approach, cur.entryDir);
      if (dev >= APPROACH_THRESHOLDS.contactWarn) {
        issues.push({
          level: "warning",
          code: "bad_approach_angle",
          message: `${labelFor(type)} ${number ?? ""}: ansatsvinkel ${dev.toFixed(0)}° — kontaktfält bör tas rakt`,
          obstacleId: cur.obstacle.id,
        });
      }
    } else if (type === "tunnel") {
      const dev = unsignedAxisAngleDeg(approach, cur.entryDir);
      if (dev >= APPROACH_THRESHOLDS.tunnelWarn) {
        issues.push({
          level: "warning",
          code: "bad_approach_angle",
          message: `Tunnel ${number ?? ""}: ankomst i ${dev.toFixed(0)}° vinkel mot mynningen`,
          obstacleId: cur.obstacle.id,
        });
      }
    } else if (type === "jump" || type === "wall" || type === "combo") {
      // Hopp i kurva: jämför inkommande mot utgående riktning vid samma hinder.
      if (i + 1 < path.anchors.length) {
        const next = path.anchors[i + 1];
        const outVec: Vec2 = {
          x: next.entry.x - cur.exit.x,
          y: next.entry.y - cur.exit.y,
        };
        if (Math.hypot(outVec.x, outVec.y) > 0.1) {
          const turn = angleBetweenDeg(approach, outVec);
          if (turn >= APPROACH_THRESHOLDS.jumpCurvatureInfo) {
            issues.push({
              level: "info",
              code: "jump_in_curve",
              message: `Hopp ${number ?? ""} tas i ${turn.toFixed(0)}° kurva — kräver tidig kommunikation`,
              obstacleId: cur.obstacle.id,
            });
          }
        }
      }
    }
  }

  return issues;
}

function labelFor(t: ObstacleTypeV2): string {
  switch (t) {
    case "tire": return "Däck";
    case "longjump": return "Långhopp";
    case "aframe": return "A-hinder";
    case "dogwalk": return "Balansbom";
    case "seesaw": return "Gungbräda";
    case "tunnel": return "Tunnel";
    case "jump": return "Hopp";
    case "wall": return "Mur";
    case "combo": return "Kombination";
    default: return t;
  }
}

/* ───────────── Bananalys / svårighet ───────────── */

export interface CourseAnalysis {
  /** Antal riktningsbyten över 90° längs hundens väg. */
  sharpTurns: number;
  /** Antal sidbyten — vägsegment som korsar varandra (förarsida byts). */
  sideChanges: number;
  /** Längsta raksträcka (m) — sammanhängande lågkurvat segment. */
  longestStraightM: number;
  /** Medelvärde på svängskärpa (grader/m) i luftsegment. */
  avgCurvatureDegPerM: number;
  /** Sammanvägd poäng 0–100 (högre = svårare). */
  difficultyScore: number;
  /** Mänsklig etikett. */
  difficultyLabel: "Lätt" | "Medel" | "Svår" | "Mycket svår";
  /** Delpoäng som förklarar totalpoängen. */
  components: {
    sharpTurns: number;
    sideChanges: number;
    avgCurvature: number;
    straightBonus: number;
  };
}

export function analyzeCourse(
  obstacles: ObstacleLite[],
  override?: CourseDogPathOverride,
): CourseAnalysis {
  const dogObs: DogPathObstacle[] = obstacles.map((o) => ({
    id: o.id, type: o.type, x: o.x, y: o.y, rotation: o.rotation,
    number: o.number, curveDeg: o.curveDeg, curveSide: o.curveSide,
  }));
  const path = buildDogPath(dogObs, override);
  const pts = path.points;

  let sharpTurns = 0;
  let totalTurnDeg = 0;
  let longestStraightM = 0;
  let currentStraightM = 0;

  for (let i = 1; i < pts.length - 1; i++) {
    const a: Vec2 = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
    const b: Vec2 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
    const segLen = Math.hypot(b.x, b.y);
    const turn = angleBetweenDeg(a, b);
    totalTurnDeg += turn;
    if (turn >= 90) sharpTurns++;
    if (turn < 10) {
      currentStraightM += segLen;
      if (currentStraightM > longestStraightM) longestStraightM = currentStraightM;
    } else {
      currentStraightM = 0;
    }
  }

  // Sidbyten — beräknas som antal segment-segment-skärningar i luften.
  // För enkelhet: räkna skärningar mellan alla par av luftsegment
  // (anchor.exit_i → anchor.entry_{i+1}).
  let sideChanges = 0;
  const air: [Vec2, Vec2][] = [];
  for (let i = 0; i < path.anchors.length - 1; i++) {
    air.push([path.anchors[i].exit, path.anchors[i + 1].entry]);
  }
  for (let i = 0; i < air.length; i++) {
    for (let j = i + 2; j < air.length; j++) {
      if (segmentsIntersect(air[i][0], air[i][1], air[j][0], air[j][1])) sideChanges++;
    }
  }

  const avgCurvatureDegPerM = path.total > 0 ? totalTurnDeg / path.total : 0;

  // Sammanvägd poäng — transparent, varje del begränsad.
  const cTurns = Math.min(40, sharpTurns * 8);
  const cSides = Math.min(25, sideChanges * 8);
  const cCurv = Math.min(25, avgCurvatureDegPerM * 1.5);
  const straightBonus = longestStraightM > 8 ? -Math.min(10, (longestStraightM - 8) * 0.6) : 0;
  const difficultyScore = Math.max(0, Math.min(100, Math.round(cTurns + cSides + cCurv + straightBonus)));

  const difficultyLabel: CourseAnalysis["difficultyLabel"] =
    difficultyScore < 25 ? "Lätt"
      : difficultyScore < 50 ? "Medel"
        : difficultyScore < 75 ? "Svår"
          : "Mycket svår";

  return {
    sharpTurns,
    sideChanges,
    longestStraightM,
    avgCurvatureDegPerM,
    difficultyScore,
    difficultyLabel,
    components: {
      sharpTurns: Math.round(cTurns),
      sideChanges: Math.round(cSides),
      avgCurvature: Math.round(cCurv),
      straightBonus: Math.round(straightBonus),
    },
  };
}

/* ───────────── Segment-intersection (för sidbyten) ───────────── */

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}
