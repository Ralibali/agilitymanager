export type AgilityClass = 1 | 2 | 3;
export type CourseKind = "agility" | "jumping";
export type Ruleset = "sweden" | "fci";

export type AgilityObstacleType =
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

export interface PlannerObstacle {
  id: string;
  type: AgilityObstacleType;
  x: number;
  y: number;
  rotation: number;
  number: number;
}

export interface RingSize {
  widthM: number;
  heightM: number;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  obstacleIds?: string[];
}

export interface ValidationResult {
  validCompetitionCourse: boolean;
  approximateLengthM: number;
  jumpPassages: number;
  tunnelPassages: number;
  issues: ValidationIssue[];
}

export const SWEDISH_RULES = {
  ring: { preferredWidthM: 30, preferredHeightM: 40, minAreaM2: 600, minSideM: 18 },
  course: { minObstacles: 15, maxObstacles: 22, minJumpPassages: 7 },
  spacing: { minDogPathM: 6, maxDogPathM: 8, boundaryBeforeAfterM: 6, minBoundaryClearanceM: 1 },
} as const;

export const FCI_RULES = {
  ring: { minShortSideM: 20, minLongSideM: 40 },
  course: { minLengthM: 100, maxLengthM: 220, minObstacles: 15, maxObstacles: 22, minJumpPassages: 7 },
  spacing: { minDogPathM: 5, maxDogPathM: 9, maxStraightLineM: 7, minObstacleClearanceM: 1 },
  maxTunnelPassages: 5,
} as const;

export const PHYSICAL_OBSTACLE_STANDARDS = {
  weave: { poles: 12, poleSpacingM: 0.6 },
  tunnel: { diameterM: 0.6, minLengthM: 3, maxLengthM: 6 },
  hurdle: { minWidthM: 1.2, maxWidthM: 1.3 },
  dogwalk: { minLengthM: 3.6, maxLengthM: 3.8, widthM: 0.3, minHeightM: 1.2, maxHeightM: 1.3, contactM: 0.9 },
  seesaw: { minLengthM: 3.6, maxLengthM: 3.8, widthM: 0.3, heightM: 0.6, contactM: 0.9 },
  aframe: { minRampLengthM: 2.65, maxRampLengthM: 2.75, minWidthM: 0.9, apexHeightM: 1.7, contactM: 1.06 },
} as const;

const JUMP_PASSAGE_TYPES = new Set<AgilityObstacleType>(["jump", "spread", "wall", "tyre", "longjump"]);
const CONTACT_TYPES = new Set<AgilityObstacleType>(["dogwalk", "seesaw", "aframe"]);
const SWEDISH_STRAIGHT_APPROACH = new Set<AgilityObstacleType>(["spread", "wall", "tyre", "longjump", "dogwalk", "seesaw", "aframe"]);
const FCI_STRAIGHT_APPROACH = new Set<AgilityObstacleType>(["spread", "tyre", "longjump"]);

export function metresBetween(a: PlannerObstacle, b: PlannerObstacle, ring: RingSize): number {
  const dx = ((b.x - a.x) / 100) * ring.widthM;
  const dy = ((b.y - a.y) / 100) * ring.heightM;
  return Math.hypot(dx, dy);
}

function angleDegrees(a: PlannerObstacle, b: PlannerObstacle, ring: RingSize): number {
  const dx = ((b.x - a.x) / 100) * ring.widthM;
  const dy = ((b.y - a.y) / 100) * ring.heightM;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function angleDifference(a: number, b: number): number {
  return Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);
}

function hasStraightApproach(previous: PlannerObstacle, obstacle: PlannerObstacle, ring: RingSize): boolean {
  const incoming = angleDegrees(previous, obstacle, ring);
  // rotation beskriver hinderlinjens riktning. Hundens raka genomfartsaxel är vinkelrät mot denna.
  const axisA = obstacle.rotation + 90;
  const axisB = obstacle.rotation - 90;
  return Math.min(angleDifference(incoming, axisA), angleDifference(incoming, axisB)) <= 22.5;
}

function boundaryDistanceM(obstacle: PlannerObstacle, ring: RingSize): number {
  const left = (obstacle.x / 100) * ring.widthM;
  const right = ((100 - obstacle.x) / 100) * ring.widthM;
  const top = (obstacle.y / 100) * ring.heightM;
  const bottom = ((100 - obstacle.y) / 100) * ring.heightM;
  return Math.min(left, right, top, bottom);
}

export function validateAgilityCourse(
  raw: PlannerObstacle[],
  ring: RingSize,
  kind: CourseKind,
  competitionClass: AgilityClass,
  ruleset: Ruleset = "sweden",
): ValidationResult {
  const obstacles = [...raw].sort((a, b) => a.number - b.number);
  const issues: ValidationIssue[] = [];
  const jumpPassages = obstacles.filter((o) => JUMP_PASSAGE_TYPES.has(o.type)).length;
  const tunnelPassages = obstacles.filter((o) => o.type === "tunnel").length;

  if (obstacles.length < 15 || obstacles.length > 22) {
    issues.push({ severity: "error", code: "obstacle-count", message: "Banan ska bestå av 15–22 hinderpassager." });
  }

  if (jumpPassages < 7) {
    issues.push({ severity: "error", code: "jump-passages", message: "Banan ska innehålla minst 7 hoppassager." });
  }

  if (obstacles.length > 0 && obstacles[0].type !== "jump") {
    issues.push({ severity: ruleset === "sweden" ? "error" : "warning", code: "first-hurdle", message: ruleset === "sweden" ? "I Sverige ska banan inledas med ett vanligt hopphinder." : "FCI tillåter flera hopptyper som första hinder." });
  }
  if (obstacles.length > 0 && obstacles[obstacles.length - 1].type !== "jump" && !(ruleset === "sweden" && obstacles[obstacles.length - 1].type === "spread")) {
    issues.push({ severity: ruleset === "sweden" ? "error" : "warning", code: "last-hurdle", message: ruleset === "sweden" ? "I Sverige ska banan avslutas med hopphinder; sista hindret får vara oxer." : "Kontrollera att sista hindret är tillåten hopptyp." });
  }

  if (competitionClass === 1 && obstacles.some((o) => o.type === "spread")) {
    issues.push({ severity: "error", code: "spread-class-1", message: "Oxer får inte användas i klass 1." });
  }

  const weaveCount = obstacles.filter((o) => o.type === "weave").length;
  if (ruleset === "sweden") {
    if (weaveCount > 1) issues.push({ severity: "error", code: "weave-max", message: "I Sverige får banan innehålla maximalt ett slalom, som tas en gång." });
  } else if (weaveCount !== 1) {
    issues.push({ severity: "error", code: "weave-required", message: "På FCI-bana ska slalom med 12 pinnar användas exakt en gång." });
  }

  const tyreCount = obstacles.filter((o) => o.type === "tyre").length;
  if (tyreCount > 1) issues.push({ severity: "error", code: "tyre-max", message: "Däck får endast utföras en gång." });

  if (ruleset === "fci" && obstacles.filter((o) => o.type === "wall").length > 1) {
    issues.push({ severity: "error", code: "wall-max", message: "Enligt FCI får mur endast tas en gång." });
  }

  if (ruleset === "sweden") {
    const jumpIds = new Map<string, number>();
    for (const obstacle of obstacles.filter((o) => o.type === "jump")) jumpIds.set(obstacle.id, (jumpIds.get(obstacle.id) ?? 0) + 1);
  } else if (tunnelPassages > FCI_RULES.maxTunnelPassages) {
    issues.push({ severity: "error", code: "tunnel-max", message: "FCI-bana får innehålla högst 5 tunnelpassager." });
  }

  const contacts = obstacles.filter((o) => CONTACT_TYPES.has(o.type));
  const contactKinds = new Set(contacts.map((o) => o.type));
  if (kind === "jumping" && contacts.length > 0) {
    issues.push({ severity: "error", code: "contacts-jumping", message: "Hoppklass får inte innehålla A-hinder, balansbom eller gungbräda." });
  }
  if (kind === "agility") {
    if (ruleset === "sweden") {
      const min = 2;
      const max = competitionClass === 1 ? 3 : 4;
      if (contacts.length < min || contacts.length > max) issues.push({ severity: "error", code: "contact-count", message: `Agilityklass ${competitionClass} ska innehålla ${min}–${max} kontaktfältspassager.` });
      if (contactKinds.size < 2) issues.push({ severity: "error", code: "contact-kinds", message: "Minst två olika kontakthindertyper ska ingå i svensk agilityklass." });
    } else {
      if (contactKinds.size !== 3) issues.push({ severity: "error", code: "contact-kinds-fci", message: "FCI agilitybana ska använda alla tre kontakthindertyperna." });
      if ((competitionClass === 2 || competitionClass === 3) && contacts.length > 4) issues.push({ severity: "error", code: "contact-max-fci", message: "FCI Agility 2/3 får ha högst 4 kontaktpassager." });
    }
  }

  if (ruleset === "sweden") {
    const area = ring.widthM * ring.heightM;
    if (area < SWEDISH_RULES.ring.minAreaM2 || Math.min(ring.widthM, ring.heightM) < SWEDISH_RULES.ring.minSideM) {
      issues.push({ severity: "error", code: "ring-sweden", message: "Svenskt banområde måste vara minst 600 m² och ingen sida får vara kortare än 18 m." });
    } else if (ring.widthM < 30 || ring.heightM < 30 || Math.max(ring.widthM, ring.heightM) < 40) {
      issues.push({ severity: "warning", code: "ring-preferred", message: "Svenskt banområde bör om möjligt vara 30 × 40 m." });
    }
  } else {
    const shortSide = Math.min(ring.widthM, ring.heightM);
    const longSide = Math.max(ring.widthM, ring.heightM);
    if (shortSide < 20 || longSide < 40) issues.push({ severity: "error", code: "ring-fci", message: "FCI-ringen måste vara minst 20 × 40 m." });
  }

  let approximateLengthM = 0;
  const straightSet = ruleset === "sweden" ? SWEDISH_STRAIGHT_APPROACH : FCI_STRAIGHT_APPROACH;
  for (let i = 0; i < obstacles.length - 1; i += 1) {
    const current = obstacles[i];
    const next = obstacles[i + 1];
    const distance = metresBetween(current, next, ring);
    approximateLengthM += distance;

    if (ruleset === "sweden") {
      if (distance < 6 || distance > 8) issues.push({ severity: "error", code: "spacing-sweden", message: `Hinder ${current.number} → ${next.number} är cirka ${distance.toFixed(1)} m i rak linje. Svensk hundväg ska vara 6–8 m.`, obstacleIds: [current.id, next.id] });
    } else {
      if (distance > 7) issues.push({ severity: "error", code: "straight-fci", message: `Raklinjeavståndet ${current.number} → ${next.number} är ${distance.toFixed(1)} m; FCI max är 7 m.`, obstacleIds: [current.id, next.id] });
      if (distance < 5) issues.push({ severity: "warning", code: "dogpath-min-fci", message: `Hinder ${current.number} → ${next.number} ligger under 5 m i rak linje; kontrollera att hundens verkliga väg är minst 5 m.`, obstacleIds: [current.id, next.id] });
    }

    if (straightSet.has(next.type) && !hasStraightApproach(current, next, ring)) {
      issues.push({ severity: "error", code: "straight-approach", message: `Hinder ${next.number} ska ha rak ansats från föregående hinder enligt ${ruleset === "sweden" ? "svenska regler" : "FCI"}.`, obstacleIds: [current.id, next.id] });
    }
  }

  if (ruleset === "fci" && obstacles.length >= 2 && (approximateLengthM < 100 || approximateLengthM > 220)) {
    issues.push({ severity: "warning", code: "length-fci", message: `Raklinjesumman är cirka ${Math.round(approximateLengthM)} m. FCI-banans verkliga hundväg ska vara 100–220 m.` });
  }

  if (ruleset === "sweden") {
    for (const obstacle of obstacles) {
      if (boundaryDistanceM(obstacle, ring) < SWEDISH_RULES.spacing.minBoundaryClearanceM) {
        issues.push({ severity: "error", code: "boundary", message: `Hinder ${obstacle.number} ligger närmare banområdets gräns än 1 m.`, obstacleIds: [obstacle.id] });
      }
    }
  }

  return {
    validCompetitionCourse: issues.every((issue) => issue.severity !== "error"),
    approximateLengthM,
    jumpPassages,
    tunnelPassages,
    issues,
  };
}
