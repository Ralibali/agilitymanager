// Gamla banadresser (/banor/<nyckel>) från före redesignen. Egen fil så att
// banbiblioteket bara laddas när en sådan adress faktiskt besöks.
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";

/** Öppnar banan i planeraren om den finns kvar, annars banbiblioteket. */
export function legacyCoursePath(key: string | undefined): string {
  if (key && COURSE_BANK.some((c) => c.key === key)) {
    return `/banplanerare?template=${encodeURIComponent(key)}`;
  }
  return "/banor";
}
