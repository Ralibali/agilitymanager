import type { ClassTemplateKey, ObstacleTypeV2 } from "./config";
import { PREBUILT_COURSES, type PrebuiltCourse, type PrebuiltObstacle } from "./templates";
import { NOLLKLASS_COURSES } from "./nollklassCourses";

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

const NOLL_TEMPLATES = new Set<ClassTemplateKey>(["noll_mur", "noll_slalom", "noll_balans"]);

function isSwedishCompetitionCourse(course: PrebuiltCourse): boolean {
  return SWEDISH_COMPETITION_TEMPLATES.has(course.classTemplate);
}

function isNollklassCourse(course: PrebuiltCourse): boolean {
  return NOLL_TEMPLATES.has(course.classTemplate);
}

/**
 * Speglar en hinderrotation över arenans lodräta mittaxel.
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
  const noll = isNollklassCourse(course);
  return {
    ...course,
    key: `${course.key}_mirror`,
    label: `${course.label} · spegel`,
    description: `${course.description} Spegelvänd över banans mittlinje för att träna samma idé från motsatt handlingssida.`,
    focus: [...(course.focus ?? []), "spegelträning", "båda handlingssidor"],
    qualityLabel: noll
      ? "Kontrollerad mot SAgiK:s Nollklassram 2026 · spegel · AgilityManager-original"
      : "Kontrollerad mot svenska klassregler · spegel",
    bankKind: "mirror",
    sourceKey: course.key,
    obstacles: course.obstacles.map((obstacle) => mirrorObstacle(obstacle, course.arenaWidthM)),
  };
}

const allOriginalSources = [...PREBUILT_COURSES, ...NOLLKLASS_COURSES];

const originals: CourseBankEntry[] = allOriginalSources.map((course) => ({
  ...course,
  bankKind: "original",
}));

const mirrors: CourseBankEntry[] = allOriginalSources
  .filter((course) => isSwedishCompetitionCourse(course) || isNollklassCourse(course))
  .map(createMirrorCourse);

/**
 * Banbanken som visas i den riktiga V2-planeraren.
 * 12 svenska klass 1–3-kartor + 12 Nollklasskartor + Hoopers.
 */
export const COURSE_BANK: CourseBankEntry[] = [...originals, ...mirrors];

export const SWEDISH_COMPETITION_COURSES = COURSE_BANK.filter((course) =>
  isSwedishCompetitionCourse(course),
);

export const NOLLKLASS_BANK_COURSES = COURSE_BANK.filter((course) =>
  isNollklassCourse(course),
);
