/**
 * Banplaneraren v2 — hundlinjebaserad ansats- och bananalys.
 *
 * Officiella svenska regler kräver naturligt rak ansats mot däck, oxer,
 * långhopp, A-hinder, gungbräda och balansbom. FCI:s domaranvisningar
 * betonar dessutom att säkerheten ska bedömas utifrån den linje och fart
 * hunden sannolikt faktiskt får, inte bara en ideal linje på kartan.
 *
 * Regelverken anger inte ett generellt gradtal för vad "rak" betyder.
 * Trösklarna nedan är därför uttryckligen AgilityManagers konservativa
 * planeringsheuristik och får aldrig presenteras som ett officiellt gradkrav.
 */

import { buildDogPath, type DogPathObstacle, type CourseDogPathOverride } from "./dogPath";
import type { ValidationIssue, ObstacleLite } from "./validation";
import type { ObstacleTypeV2 } from "./config";

const STRAIGHT_REQUIRED: ObstacleTypeV2[] = [
  "tire",
  "longjump",
  "combo",
  "aframe",
  "dogwalk",
  "seesaw",
];

/**
 * Konservativa UI-trösklar, inte officiella regelvärden.
 * De hjälper ritverktyget att hitta uppenbart sneda ansatser som sedan
 * måste bedömas tillsammans med fart, föregående hinder och verklig hundlinje.
 */
export const APPROACH_THRESHOLDS = {
  straightWarn: 20,
  straightSevere: 35,
  tunnelWarn: 45,
  wallWarn: 35,
  jumpCurvatureInfo: 70,
} as const;

/**
 * AgilityManagers egna planeringströsklar för flödesanalys.
 * De är inte tävlingsregler utan ett coachlager för banbyggaren.
 */
export const FLOW_THRESHOLDS = {
  mediumTurn: 60,
  sharpTurn: 95,
  extremeTurn: 125,
  shortAirM: 4.25,
  veryShortAirM: 3.25,
  spacingJumpRatio: 0.55,
  hotspotWarning: 52,
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

/** Signerad svängvinkel -180..180. Positiv = vänster, negativ = höger. */
function signedAngleDeg(a: Vec2, b: Vec2): number {
  const na = normalize(a);
  const nb = normalize(b);
  const cross = na.x * nb.y - na.y * nb.x;
  const dot = Math.max(-1, Math.min(1, na.x * nb.x + na.y * nb.y));
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

/** Riktningsvinkel — 0–90 mot hindrets axel, oavsett genomgångshåll. */
function unsignedAxisAngleDeg(approach: Vec2, axis: Vec2): number {
  const a = angleBetweenDeg(approach, axis);
  return Math.min(a, 180 - a);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
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
      const dev = unsignedAxisAngleDeg(approach, cur.entryDir);
      if (dev >= APPROACH_THRESHOLDS.straightSevere) {
        issues.push({
          level: "error",
          code: "bad_approach_angle",
          message: `${labelFor(type)} ${number ?? ""}: den beräknade hundlinjen ger en tydligt sned ansats (${dev.toFixed(0)}°). Regelverket kräver naturligt rak ansats; gradtalet är AgilityManagers säkerhetsheuristik.`,
          obstacleId: cur.obstacle.id,
        });
      } else if (dev >= APPROACH_THRESHOLDS.straightWarn) {
        issues.push({
          level: "warning",
          code: "bad_approach_angle",
          message: `${labelFor(type)} ${number ?? ""}: kontrollera ansatsen (${dev.toFixed(0)}° i beräknad hundlinje). Regelverket kräver naturligt rak ansats; gradtalet är endast planeringsstöd.`,
          obstacleId: cur.obstacle.id,
        });
      }
    } else if (type === "tunnel") {
      const dev = unsignedAxisAngleDeg(approach, cur.entryDir);
      if (dev >= APPROACH_THRESHOLDS.tunnelWarn) {
        issues.push({
          level: "warning",
          code: "bad_approach_angle",
          message: `Tunnel ${number ?? ""}: hundlinjen kommer snett mot mynningen (${dev.toFixed(0)}°). Kontrollera fart, infångning och verklig linje.`,
          obstacleId: cur.obstacle.id,
        });
      }
    } else if (type === "wall") {
      const dev = unsignedAxisAngleDeg(approach, cur.entryDir);
      if (dev >= APPROACH_THRESHOLDS.wallWarn) {
        issues.push({
          level: "warning",
          code: "wall_approach_risk",
          message: `Mur ${number ?? ""}: sned ansats (${dev.toFixed(0)}°) kan ge en osäker linje. Kontrollera särskilt föregående hinders fart och placering.`,
          obstacleId: cur.obstacle.id,
        });
      }
    } else if (type === "jump") {
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
              message: `Hopp ${number ?? ""} ligger i en kraftig riktningsändring (${turn.toFixed(0)}° i modellen). Bedöm hundens fart och landningslinje.`,
              obstacleId: cur.obstacle.id,
            });
          }
        }
      }
    }
  }

  // Lägg på banbyggarens coachlager. Dessa punkter är avsiktligt separerade
  // från regelkontrollen: de beskriver flöde och teknisk belastning, inte
  // officiella felgränser.
  issues.push(...computeFlowCoachIssues(obstacles, override));

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
    case "combo": return "Oxer";
    default: return t;
  }
}

/* ───────────── Bananalys / svårighet ───────────── */

export interface CourseHotspot {
  fromNumber: number | null;
  atNumber: number | null;
  toNumber: number | null;
  obstacleId?: string;
  score: number;
  turnDeg: number;
  incomingM: number;
  outgoingM: number;
  reasons: string[];
}

export interface CourseAnalysis {
  /** Antal riktningsbyten över FLOW_THRESHOLDS.sharpTurn. */
  sharpTurns: number;
  /** Antal korsande luftsegment — proxy för tekniska sidbyten/linjekorsningar. */
  sideChanges: number;
  /** Längsta raksträcka (m) — sammanhängande lågkurvat segment. */
  longestStraightM: number;
  /** Medelvärde på svängskärpa (grader/m) i den samplade hundlinjen. */
  avgCurvatureDegPerM: number;
  /** Sammanvägd poäng 0–100 (högre = tekniskt svårare). */
  difficultyScore: number;
  /** Mänsklig etikett. */
  difficultyLabel: "Lätt" | "Medel" | "Svår" | "Mycket svår";
  /** 0–100 där högre betyder jämnare, mer läsbart flöde. */
  flowScore: number;
  /** Hur många tydliga vänstersvängar som finns i sekvensen. */
  leftTurns: number;
  /** Hur många tydliga högersvängar som finns i sekvensen. */
  rightTurns: number;
  /** 0 = perfekt balans, 1 = nästan allt åt samma håll. */
  turnBias: number;
  /** Genomsnittligt luftavstånd mellan passager. */
  averageSpacingM: number;
  minSpacingM: number;
  maxSpacingM: number;
  /** Variationskoefficient för avstånd. 0 = helt jämnt. */
  spacingVariability: number;
  /** Antal stora hopp i segmentlängd mellan två efterföljande luftsegment. */
  paceChanges: number;
  /** Tekniska hotspots sorterade mest krävande först. */
  hotspots: CourseHotspot[];
  /** Delpoäng som förklarar totalpoängen. */
  components: {
    sharpTurns: number;
    sideChanges: number;
    avgCurvature: number;
    spacingVariability: number;
    paceChanges: number;
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

  let totalTurnDeg = 0;
  let longestStraightM = 0;
  let currentStraightM = 0;

  // Samplad kurvatur används för att fånga tunnel-/kontaktgeometri och inte
  // enbart de raka centrumlinjerna mellan hinder.
  for (let i = 1; i < pts.length - 1; i++) {
    const a: Vec2 = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
    const b: Vec2 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
    const segLen = Math.hypot(b.x, b.y);
    const turn = angleBetweenDeg(a, b);
    totalTurnDeg += turn;
    if (turn < 9) {
      currentStraightM += segLen;
      if (currentStraightM > longestStraightM) longestStraightM = currentStraightM;
    } else {
      currentStraightM = 0;
    }
  }

  const air: [Vec2, Vec2][] = [];
  const spacings: number[] = [];
  for (let i = 0; i < path.anchors.length - 1; i++) {
    const a = path.anchors[i].exit;
    const b = path.anchors[i + 1].entry;
    air.push([a, b]);
    spacings.push(Math.hypot(b.x - a.x, b.y - a.y));
  }

  let sideChanges = 0;
  for (let i = 0; i < air.length; i++) {
    for (let j = i + 2; j < air.length; j++) {
      if (segmentsIntersect(air[i][0], air[i][1], air[j][0], air[j][1])) sideChanges++;
    }
  }

  let leftTurns = 0;
  let rightTurns = 0;
  let sharpTurns = 0;
  const hotspots: CourseHotspot[] = [];

  for (let i = 1; i < path.anchors.length - 1; i++) {
    const prev = path.anchors[i - 1];
    const cur = path.anchors[i];
    const next = path.anchors[i + 1];
    const incoming: Vec2 = { x: cur.entry.x - prev.exit.x, y: cur.entry.y - prev.exit.y };
    const outgoing: Vec2 = { x: next.entry.x - cur.exit.x, y: next.entry.y - cur.exit.y };
    const incomingM = Math.hypot(incoming.x, incoming.y);
    const outgoingM = Math.hypot(outgoing.x, outgoing.y);
    if (incomingM < 0.1 || outgoingM < 0.1) continue;

    const signed = signedAngleDeg(incoming, outgoing);
    const turnDeg = Math.abs(signed);
    if (turnDeg >= 18) {
      if (signed > 0) leftTurns++; else rightTurns++;
    }
    if (turnDeg >= FLOW_THRESHOLDS.sharpTurn) sharpTurns++;

    let score = 0;
    const reasons: string[] = [];
    if (turnDeg >= FLOW_THRESHOLDS.extremeTurn) {
      score += 38;
      reasons.push(`mycket kraftig sväng ${turnDeg.toFixed(0)}°`);
    } else if (turnDeg >= FLOW_THRESHOLDS.sharpTurn) {
      score += 27;
      reasons.push(`kraftig sväng ${turnDeg.toFixed(0)}°`);
    } else if (turnDeg >= FLOW_THRESHOLDS.mediumTurn) {
      score += 14;
      reasons.push(`tydlig riktningsändring ${turnDeg.toFixed(0)}°`);
    }

    if (incomingM < FLOW_THRESHOLDS.veryShortAirM) {
      score += 22;
      reasons.push(`kort ingång ${incomingM.toFixed(1)} m`);
    } else if (incomingM < FLOW_THRESHOLDS.shortAirM) {
      score += 12;
      reasons.push(`kompakt ingång ${incomingM.toFixed(1)} m`);
    }
    if (outgoingM < FLOW_THRESHOLDS.veryShortAirM) {
      score += 18;
      reasons.push(`kort utgång ${outgoingM.toFixed(1)} m`);
    } else if (outgoingM < FLOW_THRESHOLDS.shortAirM) {
      score += 9;
      reasons.push(`kompakt utgång ${outgoingM.toFixed(1)} m`);
    }

    // Hög fart in i en extrem sväng är en annan typ av utmaning än ett
    // trångt parti. Lång ingång får därför ett litet påslag när svängen är stor.
    if (incomingM > 8 && turnDeg >= FLOW_THRESHOLDS.sharpTurn) {
      score += 10;
      reasons.push(`lång fartsträcka in ${incomingM.toFixed(1)} m`);
    }

    if (score >= 20) {
      hotspots.push({
        fromNumber: prev.obstacle.number ?? null,
        atNumber: cur.obstacle.number ?? null,
        toNumber: next.obstacle.number ?? null,
        obstacleId: cur.obstacle.id,
        score: Math.min(100, score),
        turnDeg,
        incomingM,
        outgoingM,
        reasons,
      });
    }
  }

  hotspots.sort((a, b) => b.score - a.score);

  let paceChanges = 0;
  for (let i = 1; i < spacings.length; i++) {
    const a = spacings[i - 1];
    const b = spacings[i];
    const denom = Math.max(a, b, 0.1);
    const ratio = Math.abs(a - b) / denom;
    if (ratio >= FLOW_THRESHOLDS.spacingJumpRatio) paceChanges++;
  }

  const avgSpacing = mean(spacings);
  const spacingSd = stdDev(spacings);
  const spacingVariability = avgSpacing > 0 ? spacingSd / avgSpacing : 0;
  const avgCurvatureDegPerM = path.total > 0 ? totalTurnDeg / path.total : 0;
  const totalDirectionalTurns = leftTurns + rightTurns;
  const turnBias = totalDirectionalTurns > 0
    ? Math.abs(leftTurns - rightTurns) / totalDirectionalTurns
    : 0;

  // Svårighetspoängen ska reagera på teknisk belastning utan att göra en
  // lång, flytande bana "svår" bara för att den innehåller många meter.
  const obstacleCount = path.anchors.length;
  const sharpRate = obstacleCount > 2 ? sharpTurns / (obstacleCount - 2) : 0;
  const crossingRate = obstacleCount > 1 ? sideChanges / (obstacleCount - 1) : 0;
  const paceRate = spacings.length > 1 ? paceChanges / (spacings.length - 1) : 0;

  const cTurns = Math.min(38, sharpRate * 78);
  const cSides = Math.min(18, crossingRate * 48);
  const cCurv = Math.min(18, avgCurvatureDegPerM * 1.15);
  const cSpacing = Math.min(14, spacingVariability * 28);
  const cPace = Math.min(12, paceRate * 24);
  const straightBonus = longestStraightM > 10 ? -Math.min(8, (longestStraightM - 10) * 0.4) : 0;
  const difficultyScore = Math.max(0, Math.min(100, Math.round(cTurns + cSides + cCurv + cSpacing + cPace + straightBonus)));

  const difficultyLabel: CourseAnalysis["difficultyLabel"] =
    difficultyScore < 25 ? "Lätt"
      : difficultyScore < 50 ? "Medel"
        : difficultyScore < 75 ? "Svår"
          : "Mycket svår";

  // Flöde är inte motsatsen till svårighet: en teknisk bana kan fortfarande
  // ha bra flöde. Vi drar främst av för extrema hotspots, ryckig segmentlängd
  // och kraftig ensidighet.
  const hotspotPenalty = Math.min(36, hotspots.slice(0, 4).reduce((s, h) => s + Math.max(0, h.score - 35) * 0.18, 0));
  const spacingPenalty = Math.min(22, spacingVariability * 28);
  const biasPenalty = totalDirectionalTurns >= 5 ? Math.min(14, turnBias * 16) : 0;
  const crossingPenalty = Math.min(12, sideChanges * 2.5);
  const flowScore = Math.round(Math.max(0, Math.min(100, 100 - hotspotPenalty - spacingPenalty - biasPenalty - crossingPenalty)));

  return {
    sharpTurns,
    sideChanges,
    longestStraightM,
    avgCurvatureDegPerM,
    difficultyScore,
    difficultyLabel,
    flowScore,
    leftTurns,
    rightTurns,
    turnBias,
    averageSpacingM: avgSpacing,
    minSpacingM: spacings.length ? Math.min(...spacings) : 0,
    maxSpacingM: spacings.length ? Math.max(...spacings) : 0,
    spacingVariability,
    paceChanges,
    hotspots,
    components: {
      sharpTurns: Math.round(cTurns),
      sideChanges: Math.round(cSides),
      avgCurvature: Math.round(cCurv),
      spacingVariability: Math.round(cSpacing),
      paceChanges: Math.round(cPace),
      straightBonus: Math.round(straightBonus),
    },
  };
}

/**
 * Coachpunkter som kan visas i samma panel som regelkontrollen men som
 * uttryckligen presenteras som planeringsstöd, inte som officiella regler.
 */
export function computeFlowCoachIssues(
  obstacles: ObstacleLite[],
  override?: CourseDogPathOverride,
): ValidationIssue[] {
  const numbered = obstacles.filter((o) => o.number != null);
  if (numbered.length < 4) return [];

  const analysis = analyzeCourse(obstacles, override);
  const issues: ValidationIssue[] = [];

  for (const hotspot of analysis.hotspots.filter((h) => h.score >= FLOW_THRESHOLDS.hotspotWarning).slice(0, 3)) {
    const seq = [hotspot.fromNumber, hotspot.atNumber, hotspot.toNumber]
      .filter((n): n is number => n != null)
      .join("→");
    issues.push({
      level: "warning",
      code: "flow_hotspot",
      message: `Coach: sekvens ${seq || "?"} är tekniskt tät (${hotspot.reasons.slice(0, 2).join(", ")}). Detta är AgilityManagers planeringsheuristik — kontrollera linjen praktiskt på planen.`,
      obstacleId: hotspot.obstacleId,
    });
  }

  const directionalTurns = analysis.leftTurns + analysis.rightTurns;
  if (directionalTurns >= 5 && analysis.turnBias >= 0.68) {
    const dominant = analysis.leftTurns > analysis.rightTurns ? "vänster" : "höger";
    issues.push({
      level: "info",
      code: "turn_bias",
      message: `Coach: banan är tydligt ${dominant}dominerad (${Math.max(analysis.leftTurns, analysis.rightTurns)} av ${directionalTurns} tydliga svängar). Överväg variation om målet är allsidig träning.`,
    });
  }

  if (analysis.spacingVariability >= 0.52 && numbered.length >= 6) {
    issues.push({
      level: "info",
      code: "pace_variation",
      message: `Coach: stora växlingar i avstånd ger många tempobyten (ca ${analysis.minSpacingM.toFixed(1)}–${analysis.maxSpacingM.toFixed(1)} m mellan passager). Det kan vara avsiktligt, men kontrollera rytmen.`,
    });
  }

  issues.push({
    level: "info",
    code: "course_profile",
    message: `Banprofil: ${analysis.difficultyLabel.toLowerCase()} · svårighet ${analysis.difficultyScore}/100 · flöde ${analysis.flowScore}/100 · ${analysis.sharpTurns} skarpa svängar. Poängen är planeringsstöd, inte officiell klassning.`,
  });

  return issues;
}

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}
