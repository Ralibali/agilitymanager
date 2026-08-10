export type FciClass = 1 | 2 | 3;
export type FciCourseKind = "agility" | "jumping";
export type FciObstacleType =
  | "jump"
  | "spread"
  | "wall"
  | "tyre"
  | "longjump"
  | "dogwalk"
  | "seesaw"
  | "aframe"
  | "tunnel"
  | "weave";

export interface FciPlannerObstacle {
  id: string;
  type: FciObstacleType;
  x: number;
  y: number;
  rotation: number;
  number: number;
}

export interface FciRing {
  widthM: number;
  heightM: number;
}

export interface FciValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  obstacleIds?: string[];
}

export interface FciValidationResult {
  validCompetitionCourse: boolean;
  courseLengthM: number;
  jumpCount: number;
  tunnelPerformances: number;
  issues: FciValidationIssue[];
}

export const FCI_RULES = {
  ring: { minWidthM: 20, minHeightM: 40 },
  course: { minLengthM: 100, maxLengthM: 220, minObstacles: 15, maxObstacles: 22, minJumps: 7 },
  spacing: { minDogPathM: 5, maxStraightLineM: 7, maxDogPathM: 9, minObstacleClearanceM: 1 },
  maxTunnelPerformances: 5,
  weaveCount: 12,
  weavePoleSpacingM: 0.6,
  tunnel: { diameterM: 0.6, minLengthM: 3, maxLengthM: 6 },
  hurdle: { minWidthM: 1.2, maxWidthM: 1.3 },
  dogwalk: { minLengthM: 3.6, maxLengthM: 3.8, widthM: 0.3, minHeightM: 1.2, maxHeightM: 1.3, contactM: 0.9 },
  seesaw: { minLengthM: 3.6, maxLengthM: 3.8, widthM: 0.3, heightM: 0.6, contactM: 0.9 },
  aframe: { minRampLengthM: 2.65, maxRampLengthM: 2.75, minWidthM: 0.9, apexHeightM: 1.7, contactM: 1.06 },
} as const;

const SINGLE_USE = new Set<FciObstacleType>(["weave", "tyre", "wall"]);
const STRAIGHT_APPROACH = new Set<FciObstacleType>(["spread", "tyre", "longjump"]);
const CONTACT_TYPES = new Set<FciObstacleType>(["dogwalk", "seesaw", "aframe"]);
const JUMP_TYPES = new Set<FciObstacleType>(["jump", "spread", "wall", "tyre", "longjump"]);

function metresBetween(a: FciPlannerObstacle, b: FciPlannerObstacle, ring: FciRing): number {
  const dx = ((b.x - a.x) / 100) * ring.widthM;
  const dy = ((b.y - a.y) / 100) * ring.heightM;
  return Math.hypot(dx, dy);
}

function normalizedAngleDiff(a: number, b: number): number {
  const diff = Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);
  return diff;
}

function approachAngle(from: FciPlannerObstacle, to: FciPlannerObstacle, ring: FciRing): number {
  const dx = ((to.x - from.x) / 100) * ring.widthM;
  const dy = ((to.y - from.y) / 100) * ring.heightM;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function validateFciCourse(
  rawObstacles: FciPlannerObstacle[],
  ring: FciRing,
  kind: FciCourseKind,
  competitionClass: FciClass,
): FciValidationResult {
  const obstacles = [...rawObstacles].sort((a, b) => a.number - b.number);
  const issues: FciValidationIssue[] = [];

  const shortSide = Math.min(ring.widthM, ring.heightM);
  const longSide = Math.max(ring.widthM, ring.heightM);
  if (shortSide < FCI_RULES.ring.minWidthM || longSide < FCI_RULES.ring.minHeightM) {
    issues.push({ severity: "error", code: "ring-size", message: "Tävlingsringen måste vara minst 20 × 40 m." });
  }

  if (obstacles.length < FCI_RULES.course.minObstacles || obstacles.length > FCI_RULES.course.maxObstacles) {
    issues.push({ severity: "error", code: "obstacle-count", message: "En FCI-bana ska innehålla 15–22 hinderpassager." });
  }

  const jumpCount = obstacles.filter((o) => JUMP_TYPES.has(o.type)).length;
  if (jumpCount < FCI_RULES.course.minJumps) {
    issues.push({ severity: "error", code: "jump-count", message: "Minst 7 hinderpassager ska vara hopp." });
  }

  const weaveCount = obstacles.filter((o) => o.type === "weave").length;
  if (weaveCount !== 1) {
    issues.push({ severity: "error", code: "weave", message: "Slalom med 12 pinnar ska användas exakt en gång på varje bana." });
  }

  for (const type of SINGLE_USE) {
    const count = obstacles.filter((o) => o.type === type).length;
    if (count > 1) {
      issues.push({ severity: "error", code: `single-${type}`, message: `${type === "tyre" ? "Däck" : type === "wall" ? "Mur" : "Slalom"} får endast tas en gång.`, obstacleIds: obstacles.filter((o) => o.type === type).map((o) => o.id) });
    }
  }

  const tunnelPerformances = obstacles.filter((o) => o.type === "tunnel").length;
  if (tunnelPerformances > FCI_RULES.maxTunnelPerformances) {
    issues.push({ severity: "error", code: "tunnels", message: "En bana får innehålla högst 5 tunnelpassager." });
  }

  if (competitionClass === 1 && obstacles.some((o) => o.type === "spread")) {
    issues.push({ severity: "error", code: "spread-class-1", message: "Oxer/spreadhinder får inte användas i Agility 1 eller Jumping 1." });
  }

  if (kind === "jumping" && obstacles.some((o) => CONTACT_TYPES.has(o.type))) {
    issues.push({ severity: "error", code: "contacts-in-jumping", message: "Jumpingbana ska inte innehålla kontakthinder." });
  }

  if (kind === "agility") {
    const contacts = new Set(obstacles.filter((o) => CONTACT_TYPES.has(o.type)).map((o) => o.type));
    if (contacts.size !== 3) {
      issues.push({ severity: "error", code: "contact-types", message: "En FCI agilitybana ska använda alla tre kontakthindertyperna: balansbom, gungbräda och A-hinder." });
    }
    if ((competitionClass === 2 || competitionClass === 3) && obstacles.filter((o) => CONTACT_TYPES.has(o.type)).length > 4) {
      issues.push({ severity: "error", code: "contact-max", message: "I Agility 2 och 3 får högst 4 kontakthinderpassager användas." });
    }
  }

  let courseLengthM = 0;
  for (let i = 0; i < obstacles.length - 1; i += 1) {
    const current = obstacles[i];
    const next = obstacles[i + 1];
    const straight = metresBetween(current, next, ring);
    courseLengthM += straight;

    if (straight < FCI_RULES.spacing.minDogPathM) {
      issues.push({ severity: "error", code: "too-close", message: `Hinder ${current.number} → ${next.number} ligger närmare än 5 m på hundens väg.`, obstacleIds: [current.id, next.id] });
    }
    if (straight > FCI_RULES.spacing.maxStraightLineM) {
      issues.push({ severity: "warning", code: "straight-distance", message: `Raklinjeavståndet ${current.number} → ${next.number} är över 7 m. Kontrollera den verkliga hundlinjen (max 9 m).`, obstacleIds: [current.id, next.id] });
    }

    if (STRAIGHT_APPROACH.has(next.type)) {
      const incoming = approachAngle(current, next, ring);
      const obstacleNormal = next.rotation + 90;
      const diff = Math.min(normalizedAngleDiff(incoming, obstacleNormal), normalizedAngleDiff(incoming, obstacleNormal + 180));
      if (diff > 20) {
        issues.push({ severity: "error", code: "straight-approach", message: `Hinder ${next.number} kräver rak ansats från föregående hinder.`, obstacleIds: [current.id, next.id] });
      }
    }
  }

  if (obstacles.length >= 2 && (courseLengthM < FCI_RULES.course.minLengthM || courseLengthM > FCI_RULES.course.maxLengthM)) {
    issues.push({ severity: "error", code: "course-length", message: `Uppmätt raklinjelängd är cirka ${Math.round(courseLengthM)} m. Tävlingsbanan ska vara 100–220 m; slutlig hundlinje ska mätas exakt.` });
  }

  // Grov fysisk krockkontroll. Exakt footprint beror på aktuell hinderutrustning.
  for (let i = 0; i < obstacles.length; i += 1) {
    for (let j = i + 1; j < obstacles.length; j += 1) {
      const a = obstacles[i];
      const b = obstacles[j];
      if (metresBetween(a, b, ring) < FCI_RULES.spacing.minObstacleClearanceM) {
        issues.push({ severity: "error", code: "clearance", message: `Hinder ${a.number} och ${b.number} har mindre än 1 m fri passage mellan sig.`, obstacleIds: [a.id, b.id] });
      }
    }
  }

  return {
    validCompetitionCourse: issues.every((issue) => issue.severity !== "error"),
    courseLengthM,
    jumpCount,
    tunnelPerformances,
    issues,
  };
}
