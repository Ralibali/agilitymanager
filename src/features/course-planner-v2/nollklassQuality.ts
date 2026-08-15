import { getObstacleDefV2, type ClassTemplateKey, type ObstacleTypeV2 } from "./config";
import { buildDogPath, computeDogPathPairDistances, type DogPathObstacle } from "./dogPath";
import { aabbsOverlap, rotatedAabb, edgesOutsideArena, type AABB } from "./geometry";
import { computeApproachIssues } from "./courseAnalysis";
import type { PrebuiltCourse } from "./templates";

export interface NollklassQualityIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  obstacleNumber?: number;
}

const NOLL_TEMPLATES = new Set<ClassTemplateKey>(["noll_mur", "noll_slalom", "noll_balans"]);
const NON_COMPETING = new Set<ObstacleTypeV2>(["start", "finish", "number", "handler_zone"]);
const JUMP_TYPES = new Set<ObstacleTypeV2>(["jump", "wall", "longjump"]);

export function isNollklassTemplate(key: ClassTemplateKey): boolean {
  return NOLL_TEMPLATES.has(key);
}

function rayDistanceToBoundary(
  point: { x: number; y: number },
  dir: { x: number; y: number },
  width: number,
  height: number,
): number {
  const candidates: number[] = [];
  if (Math.abs(dir.x) > 1e-9) {
    for (const x of [0, width]) {
      const t = (x - point.x) / dir.x;
      if (t >= 0) candidates.push(t);
    }
  }
  if (Math.abs(dir.y) > 1e-9) {
    for (const y of [0, height]) {
      const t = (y - point.y) / dir.y;
      if (t >= 0) candidates.push(t);
    }
  }
  return candidates.length ? Math.min(...candidates) : 0;
}

function meaningfulAabbOverlap(a: AABB, b: AABB, toleranceM = 0.02): boolean {
  if (!aabbsOverlap(a, b)) return false;
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  return overlapX > toleranceM && overlapY > toleranceM;
}

/**
 * Kvalitetsgrind för AgilityManagers egna Nollklasskartor.
 *
 * Den kodar det som går att kontrollera maskinellt från SAgiK:s publicerade
 * Nollklassram 2026 plus de officiella svenska banregler som sidan hänvisar
 * vidare till: 25×30 eller 15×30 m, 12–14 passager, hopp/tunnel + exakt rätt
 * specialhinder, start/slut med hopp, 6–8 m beräknad hundväg, bankantsmarginal
 * och rak ansats till specialhindret. Detta gör INTE kartan till en officiell
 * SAgiK-bana; våra layouter är egna original.
 */
export function validateNollklassCourse(course: PrebuiltCourse): NollklassQualityIssue[] {
  if (!isNollklassTemplate(course.classTemplate)) return [];
  const issues: NollklassQualityIssue[] = [];
  const sequence = course.obstacles
    .filter((o) => !NON_COMPETING.has(o.type) && o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const validArena =
    (course.arenaWidthM === 25 && course.arenaHeightM === 30) ||
    (course.arenaWidthM === 15 && course.arenaHeightM === 30);
  if (!validArena) {
    issues.push({ level: "error", code: "noll_arena", message: "Nollklasskartan ska vara 25×30 eller 15×30 m." });
  }

  if (sequence.length < 12 || sequence.length > 14) {
    issues.push({ level: "error", code: "noll_count", message: `Nollklass ska ha 12–14 hinderpassager; kartan har ${sequence.length}.` });
  }

  if (sequence[0]?.type !== "jump") {
    issues.push({ level: "error", code: "noll_first_jump", message: "Första passagen ska vara ett vanligt hopphinder.", obstacleNumber: sequence[0]?.number });
  }
  if (sequence.at(-1)?.type !== "jump") {
    issues.push({ level: "error", code: "noll_last_jump", message: "Sista passagen ska vara ett vanligt hopphinder.", obstacleNumber: sequence.at(-1)?.number });
  }

  const jumpCount = sequence.filter((o) => JUMP_TYPES.has(o.type)).length;
  if (jumpCount < 7) {
    issues.push({ level: "error", code: "noll_jump_count", message: `Minst sju hoppassager krävs enligt grundregeln; kartan har ${jumpCount}.` });
  }

  const allowedBase = new Set<ObstacleTypeV2>(["jump", "tunnel"]);
  let special: Set<ObstacleTypeV2>;
  if (course.classTemplate === "noll_mur") special = new Set(["wall", "longjump"]);
  else if (course.classTemplate === "noll_slalom") special = new Set(["weave_12"]);
  else special = new Set(["dogwalk"]);

  const specialPassages = sequence.filter((o) => special.has(o.type));
  if (specialPassages.length !== 1) {
    issues.push({ level: "error", code: "noll_special_count", message: `Nollklassvarianten ska innehålla exakt ett angivet specialhinder; kartan har ${specialPassages.length}.` });
  }
  for (const o of sequence) {
    if (!allowedBase.has(o.type) && !special.has(o.type)) {
      issues.push({ level: "error", code: "noll_wrong_type", message: `${getObstacleDefV2(o.type)?.label ?? o.type} hör inte till denna Nollklassvariant.`, obstacleNumber: o.number });
    }
  }

  const dogObstacles: DogPathObstacle[] = course.obstacles.map((o, index) => ({ ...o, id: `${course.key}-${index}` }));
  for (const pair of computeDogPathPairDistances(dogObstacles)) {
    if (pair.distanceM < 5.99 || pair.distanceM > 8.01) {
      issues.push({
        level: "error",
        code: "noll_dog_path_distance",
        message: `Hinder ${pair.fromNumber}→${pair.toNumber}: hundvägen är ${pair.distanceM.toFixed(1)} m; ska ligga inom 6–8 m.`,
        obstacleNumber: pair.toNumber,
      });
    }
  }

  const boxes: { number?: number; box: AABB }[] = [];
  for (const o of sequence) {
    const def = getObstacleDefV2(o.type);
    if (!def) continue;
    const box = rotatedAabb({ x: o.x, y: o.y }, def.sizeM.w, def.sizeM.d, o.rotation);
    boxes.push({ number: o.number, box });
    if (edgesOutsideArena(box, course.arenaWidthM, course.arenaHeightM, 1).length > 0) {
      issues.push({ level: "error", code: "noll_border", message: `Hinder #${o.number} ligger närmare bankanten än 1 m.`, obstacleNumber: o.number });
    }
  }

  // Förbyggda kartor ska aldrig behöva representera två olika fysiska hinder
  // ovanpå varandra. Det undviker både byggproblem och falska linjer i kartan.
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (!meaningfulAabbOverlap(boxes[i].box, boxes[j].box)) continue;
      issues.push({
        level: "error",
        code: "noll_overlap",
        message: `Hinder #${boxes[i].number} och #${boxes[j].number} överlappar geometriskt.`,
        obstacleNumber: boxes[j].number,
      });
    }
  }

  const path = buildDogPath(dogObstacles);
  if (path.anchors.length) {
    const first = path.anchors[0];
    const before = rayDistanceToBoundary(first.entry, { x: -first.entryDir.x, y: -first.entryDir.y }, course.arenaWidthM, course.arenaHeightM);
    if (before < 5.99) issues.push({ level: "error", code: "noll_runup", message: `Rak ansats före första hindret är ${before.toFixed(1)} m; minst 6 m krävs.` });

    const last = path.anchors[path.anchors.length - 1];
    const after = rayDistanceToBoundary(last.exit, last.exitDir, course.arenaWidthM, course.arenaHeightM);
    if (after < 5.99) issues.push({ level: "error", code: "noll_runout", message: `Rak utgång efter sista hindret är ${after.toFixed(1)} m; minst 6 m krävs.` });
  }

  const specialIds = new Set(specialPassages.map((o) => `${course.key}-${course.obstacles.indexOf(o)}`));
  const approachIssues = computeApproachIssues(dogObstacles.map((o) => ({
    id: o.id ?? "", type: o.type, x: o.x, y: o.y, rotation: o.rotation,
    number: o.number ?? undefined, curveDeg: o.curveDeg, curveSide: o.curveSide,
  })));
  for (const issue of approachIssues) {
    if (issue.code === "bad_approach_angle" && issue.obstacleId && specialIds.has(issue.obstacleId)) {
      issues.push({
        level: "error",
        code: "noll_special_approach",
        message: `Specialhindret har inte en tillräckligt rak beräknad ansats: ${issue.message}`,
      });
    }
  }

  return issues;
}
