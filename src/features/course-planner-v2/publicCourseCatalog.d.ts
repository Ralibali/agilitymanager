export interface PublicCourseMeta {
  id: string;
  title: string;
  description: string;
  discipline: "Agilityklass" | "Hoppklass" | "Nollklass" | "Hoopers";
  level: string;
  arenaWidthM: number;
  arenaHeightM: number;
  passages: number;
  focus: string[];
  isNollklass: boolean;
  isHoopers: boolean;
  isMirror: boolean;
  sourceId: string | null;
}

export const PUBLIC_COURSE_CATALOG: PublicCourseMeta[];
export const LEGACY_COURSE_ALIASES: Record<string, string>;
export function resolvePublicCourseId(courseId: string | null | undefined): string | null;
export function getPublicCourseMeta(courseId: string | null | undefined): PublicCourseMeta | undefined;
