import type { ClassTemplateKey, ObstacleTypeV2 } from "./config";
import { PREBUILT_COURSES, type PrebuiltCourse, type PrebuiltObstacle } from "./templates";

export type CourseBankKind = "original" | "mirror";

export interface CourseBankEntry extends PrebuiltCourse {
  bankKind: CourseBankKind;
  sourceKey?: string;
}

const SWEDISH_COMPETITION_TEMPLATES = new Set<ClassTemplateKey>([
  "agility_hopp_1",
  "agility_hopp_2",
  "agility_hopp_3",
  "agility_1",
  "agility_2",
  "agility_3",
]);

function isSwedishCompetitionCourse(course: PrebuiltCourse): boolean {
  return SWEDISH_COMPETITION_TEMPLATES.has(course.classTemplate);
}

/**
 * Speglar en hinderrotation över arenans lodräta mittaxel.
 *
 * De flesta agilityhinder färdas genom sin depth-axel i dogPath.ts, där en
 * x-spegling motsvarar -rotation. Tunnelns färdriktning ligger längs width-
 * axeln och speglas därför med 180° - rotation. Start/mål är punktmarkörer
 * och följer samma visuella konvention som tunnelns x-axel.
 */
function mirrorRotation(type: ObstacleTypeV2, rotation: number): number {
  if (type === "tunnel" || type === "start" || type === "finish" || type === "number") {
    return 180 - rotation;
  }
  return -rotation;
}

function mirrorObstacle(obstacle: PrebuiltObstacle, arenaWidthM: number): PrebuiltObstacle {
  return {
    ...obstacle,
    x: Number((arenaWidthM - obstacle.x).toFixed(2)),
    rotation: mirrorRotation(obstacle.type, obstacle.rotation),
    curveSide: obstacle.curveSide === "left" ? "right" : obstacle.curveSide === "right" ? "left" : undefined,
  };
}

export function createMirrorCourse(course: PrebuiltCourse): CourseBankEntry {
  return {
    ...course,
    key: `${course.key}_mirror`,
    label: `${course.label} · spegel`,
    description: `${course.description} Spegelvänd över banans mittlinje för att träna samma idé från motsatt handlingssida.`,
    focus: [...(course.focus ?? []), "spegelträning", "båda handlingssidor"],
    qualityLabel: "Kontrollerad mot svenska klassregler · spegel",
    bankKind: "mirror",
    sourceKey: course.key,
    obstacles: course.obstacles.map((obstacle) => mirrorObstacle(obstacle, course.arenaWidthM)),
  };
}

const originals: CourseBankEntry[] = PREBUILT_COURSES.map((course) => ({
  ...course,
  bankKind: "original",
}));

const mirrors: CourseBankEntry[] = PREBUILT_COURSES
  .filter(isSwedishCompetitionCourse)
  .map(createMirrorCourse);

/**
 * Banbanken som visas i den riktiga V2-planeraren.
 * 6 svenska original + 6 regeltestade spegelvarianter + Hoopers-banan.
 */
export const COURSE_BANK: CourseBankEntry[] = [...originals, ...mirrors];

export const SWEDISH_COMPETITION_COURSES = COURSE_BANK.filter((course) =>
  isSwedishCompetitionCourse(course),
);
