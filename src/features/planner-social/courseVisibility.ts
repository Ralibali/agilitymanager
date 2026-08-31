/**
 * Synlighetsregler för delade planner-banor (planner_courses).
 *
 * En bana är publikt synlig endast om is_public är explicit true.
 * Saknat/null/false-värde räknas som privat. Databasens RLS är den
 * primära spärren — detta är defense in depth på klientsidan så att
 * privata banor aldrig renderas eller räknas med även om en fråga
 * av misstag skulle returnera dem.
 */

export interface CourseVisibilityRow {
  is_public?: boolean | null;
}

/** true endast om raden är uttryckligen markerad som publik. */
export function isPubliclyVisible(row: CourseVisibilityRow | null | undefined): boolean {
  return row?.is_public === true;
}

/** Filtrerar bort alla rader som inte är explicit publika. */
export function filterPublicCourses<T extends CourseVisibilityRow>(rows: readonly T[] | null | undefined): T[] {
  return (rows ?? []).filter(isPubliclyVisible);
}
