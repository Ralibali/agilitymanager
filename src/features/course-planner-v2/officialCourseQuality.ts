import { getObstacleDefV2, type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey } from "./config";
import { buildDogPath, computeDogPathPairDistances, type DogPathObstacle } from "./dogPath";
import { rotatedAabb, edgesOutsideArena } from "./geometry";
import { computeApproachIssues } from "./courseAnalysis";

export type OfficialQualityLevel = "error" | "warning" | "info";

export interface OfficialQualityIssue {
  level: OfficialQualityLevel;
  code: string;
  message: string;
  obstacleNumber?: number;
}

export interface OfficialCourseObstacle {
  id?: string;
  type: ObstacleTypeV2;
  x: number;
  y: number;
  rotation: number;
  number?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
}

export interface OfficialCourseInput {
  classTemplate: ClassTemplateKey;
  arenaWidthM: number;
  arenaHeightM: number;
  defaultSize?: SizeClassKey;
  obstacles: OfficialCourseObstacle[];
}

const SWEDISH_COMPETITION_TEMPLATES = new Set<ClassTemplateKey>([
  "agility_hopp_1", "agility_hopp_2", "agility_hopp_3",
  "agility_1", "agility_2", "agility_3", "agility_hopplag",
]);

const JUMP_PASSAGE_TYPES = new Set<ObstacleTypeV2>(["jump", "wall", "longjump", "tire", "combo"]);
const WEAVE_TYPES = new Set<ObstacleTypeV2>(["weave_8", "weave_10", "weave_12"]);
const CONTACT_TYPES = new Set<ObstacleTypeV2>(["aframe", "dogwalk", "seesaw"]);
const NON_COMPETING = new Set<ObstacleTypeV2>(["start", "finish", "number", "handler_zone"]);

export function isOfficialSwedishCompetitionTemplate(key: ClassTemplateKey): boolean {
  return SWEDISH_COMPETITION_TEMPLATES.has(key);
}

function numbered(course: OfficialCourseInput): OfficialCourseObstacle[] {
  return course.obstacles
    .filter((o) => !NON_COMPETING.has(o.type) && o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
}

function rayDistanceToBoundary(
  point: { x: number; y: number },
  dir: { x: number; y: number },
  width: number,
  height: number,
): number {
  const candidates: number[] = [];
  if (Math.abs(dir.x) > 1e-9) {
    const left = (0 - point.x) / dir.x;
    const right = (width - point.x) / dir.x;
    if (left >= 0) candidates.push(left);
    if (right >= 0) candidates.push(right);
  }
  if (Math.abs(dir.y) > 1e-9) {
    const top = (0 - point.y) / dir.y;
    const bottom = (height - point.y) / dir.y;
    if (top >= 0) candidates.push(top);
    if (bottom >= 0) candidates.push(bottom);
  }
  return candidates.length ? Math.min(...candidates) : 0;
}

/**
 * Strikt kvalitetsgrind för AgilityManagers inbyggda svenska tävlingsbanor.
 *
 * Den är medvetet striktare än en vanlig editor-varning: en färdig bana som
 * marknadsförs som svensk klass 1–3 ska inte publiceras om den bryter mot de
 * maskinellt kontrollerbara kärnreglerna i SAgiK/SKK 2022–2026 §3.1.
 * Hundvägsavståndet använder exakt samma auto-genererade hundlinje som ritas
 * i V2-planeraren. Vinkeltrösklar från approach-analysen är däremot endast
 * AgilityManagers konservativa heuristik, eftersom regelverket kräver rak
 * ansats men inte anger ett generellt gradtal.
 */
export function validateOfficialSwedishCourse(course: OfficialCourseInput): OfficialQualityIssue[] {
  if (!isOfficialSwedishCompetitionTemplate(course.classTemplate)) return [];

  const issues: OfficialQualityIssue[] = [];
  const sequence = numbered(course);
  const class1 = course.classTemplate === "agility_1" || course.classTemplate === "agility_hopp_1";
  const isJumpClass = course.classTemplate.startsWith("agility_hopp") || course.classTemplate === "agility_hopplag";

  if (sequence.length < 15 || sequence.length > 22) {
    issues.push({
      level: "error",
      code: "official_obstacle_count",
      message: `Svensk tävlingsbana ska ha 15–22 hinderpassager; denna har ${sequence.length}.`,
    });
  }

  if (sequence.length > 0) {
    const first = sequence[0];
    const last = sequence[sequence.length - 1];
    if (first.type !== "jump") {
      issues.push({
        level: "error",
        code: "official_first_not_jump",
        message: `Första passagen (#${first.number}) måste vara hopphinder.`,
        obstacleNumber: first.number,
      });
    }
    if (last.type !== "jump" && last.type !== "combo") {
      issues.push({
        level: "error",
        code: "official_last_not_jump",
        message: `Sista passagen (#${last.number}) måste vara hopphinder; oxer får användas som sista hinder.`,
        obstacleNumber: last.number,
      });
    }
  }

  const jumpPassages = sequence.filter((o) => JUMP_PASSAGE_TYPES.has(o.type)).length;
  if (jumpPassages < 7) {
    issues.push({
      level: "error",
      code: "official_too_few_jump_passages",
      message: `Minst 7 hoppassager krävs; denna bana har ${jumpPassages}.`,
    });
  }

  const weaveCount = sequence.filter((o) => WEAVE_TYPES.has(o.type)).length;
  if (weaveCount > 1) {
    issues.push({
      level: "error",
      code: "official_multiple_weaves",
      message: `Slalom får bara förekomma en gång; denna bana har ${weaveCount} slalompassager.`,
    });
  }

  if (class1 && sequence.some((o) => o.type === "combo")) {
    issues.push({
      level: "error",
      code: "official_oxer_class1",
      message: "Oxer får inte användas i klass 1.",
    });
  }

  if (isJumpClass) {
    for (const o of sequence) {
      if (CONTACT_TYPES.has(o.type) || o.type === "table") {
        issues.push({
          level: "error",
          code: "official_contact_in_jump_class",
          message: `${getObstacleDefV2(o.type)?.label ?? o.type} hör inte hemma i hoppklass.`,
          obstacleNumber: o.number,
        });
      }
    }
  }

  const ids = new Map<OfficialCourseObstacle, string>();
  const dogObstacles: DogPathObstacle[] = course.obstacles.map((o, index) => {
    const id = o.id ?? `official-${index}`;
    ids.set(o, id);
    return { ...o, id };
  });

  const pairDistances = computeDogPathPairDistances(dogObstacles);
  for (const pair of pairDistances) {
    if (pair.distanceM < 6 - 0.01) {
      issues.push({
        level: "error",
        code: "official_dog_path_too_short",
        message: `Hinder ${pair.fromNumber}→${pair.toNumber}: beräknad hundväg ${pair.distanceM.toFixed(1)} m; svensk regel kräver 6–8 m.`,
        obstacleNumber: pair.toNumber,
      });
    } else if (pair.distanceM > 8 + 0.01) {
      issues.push({
        level: "error",
        code: "official_dog_path_too_long",
        message: `Hinder ${pair.fromNumber}→${pair.toNumber}: beräknad hundväg ${pair.distanceM.toFixed(1)} m; svensk regel kräver 6–8 m.`,
        obstacleNumber: pair.toNumber,
      });
    }
  }

  // Minst 1 m från fysiskt hinder till bankant/vägg.
  for (const o of sequence) {
    const def = getObstacleDefV2(o.type);
    if (!def) continue;
    const box = rotatedAabb({ x: o.x, y: o.y }, def.sizeM.w, def.sizeM.d, o.rotation);
    const edgeIssues = edgesOutsideArena(box, course.arenaWidthM, course.arenaHeightM, 1);
    if (edgeIssues.length > 0) {
      issues.push({
        level: "error",
        code: "official_border_clearance",
        message: `Hinder #${o.number} ligger närmare bankanten än 1 m.`,
        obstacleNumber: o.number,
      });
    }
  }

  // Minst 6 m hundväg från banområdets kant före första och efter sista hinder.
  const path = buildDogPath(dogObstacles);
  if (path.anchors.length > 0) {
    const first = path.anchors[0];
    const before = rayDistanceToBoundary(
      first.entry,
      { x: -first.entryDir.x, y: -first.entryDir.y },
      course.arenaWidthM,
      course.arenaHeightM,
    );
    if (before < 6 - 0.01) {
      issues.push({
        level: "error",
        code: "official_start_runup",
        message: `Beräknad rak ansats från bankant till första hindret är ${before.toFixed(1)} m; minst 6 m krävs.`,
        obstacleNumber: first.obstacle.number ?? undefined,
      });
    }

    const last = path.anchors[path.anchors.length - 1];
    const after = rayDistanceToBoundary(
      last.exit,
      last.exitDir,
      course.arenaWidthM,
      course.arenaHeightM,
    );
    if (after < 6 - 0.01) {
      issues.push({
        level: "error",
        code: "official_finish_runout",
        message: `Beräknad rak hundväg från sista hindret till bankant är ${after.toFixed(1)} m; minst 6 m krävs.`,
        obstacleNumber: last.obstacle.number ?? undefined,
      });
    }
  }

  // Rak ansats och andra hundlinjerisker. Gradgränserna är verktygsheuristik.
  const approach = computeApproachIssues(
    dogObstacles.map((o) => ({
      id: o.id ?? "",
      type: o.type,
      x: o.x,
      y: o.y,
      rotation: o.rotation,
      number: o.number ?? undefined,
      curveDeg: o.curveDeg,
      curveSide: o.curveSide,
    })),
  );
  for (const issue of approach) {
    if (issue.level === "error" || issue.code === "wall_approach_risk") {
      const obstacle = dogObstacles.find((o) => o.id === issue.obstacleId);
      issues.push({
        level: issue.level === "error" ? "error" : "warning",
        code: `official_${issue.code}`,
        message: issue.message,
        obstacleNumber: obstacle?.number ?? undefined,
      });
    }
  }

  // FCI:s säkerhetsanvisningar avråder från kontaktfält direkt efter varandra.
  for (let i = 1; i < sequence.length; i++) {
    if (CONTACT_TYPES.has(sequence[i - 1].type) && CONTACT_TYPES.has(sequence[i].type)) {
      issues.push({
        level: "warning",
        code: "fci_consecutive_contacts",
        message: `Kontaktfält #${sequence[i - 1].number} och #${sequence[i].number} ligger direkt efter varandra; undvik detta i en färdig säker tävlingsbana.`,
        obstacleNumber: sequence[i].number,
      });
    }
  }

  return issues;
}

export function officialCourseHasErrors(course: OfficialCourseInput): boolean {
  return validateOfficialSwedishCourse(course).some((issue) => issue.level === "error");
}
