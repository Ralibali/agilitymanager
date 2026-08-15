/**
 * Banplaneraren v2 — Path-sampling för 2D-uppspelning.
 *
 * Från Prompt B (Hundens väg) delegerar vi till `dogPath.ts` när
 * obstacles har `type` + `rotation`. Det ger en mjuk kurva via
 * Catmull-Rom samt korrekta längder genom tunnel/slalom/kontaktfält.
 * Saknas type/rotation faller vi tillbaka till raklinje mellan
 * mittpunkter (bakåtkompatibelt).
 */
import {
  buildDogPath,
  dogPathToSvgD,
  dogPathToSvgDUntil,
  sampleDogPathAt,
  type DogPath,
  type DogPathObstacle,
} from "./dogPath";

/** Minimal subset av en bana vi behöver — undviker cirkulär import. */
export interface CoursePathInput {
  obstacles: Array<{
    x: number;
    y: number;
    number?: number | null;
    /** Krävs för att räkna hundens väg via dogPath. */
    type?: DogPathObstacle["type"];
    rotation?: number;
    curveDeg?: number;
    curveSide?: "left" | "right";
  }>;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface SampledPose {
  x: number;
  y: number;
  heading: number; // radianer, 0 = +x
}

export interface SampledPath {
  points: PathPoint[];
  cum: number[];
  total: number;
}

/** Bygger rutt från en bana. */
export function buildCoursePath(course: CoursePathInput): SampledPath {
  // Om obstacles har type+rotation: använd dogPath (Prompt B).
  const hasGeometry = course.obstacles.every(
    (o) => o.type != null && typeof o.rotation === "number",
  );
  if (hasGeometry && course.obstacles.length > 0) {
    const dp: DogPath = buildDogPath(
      course.obstacles
        .filter((o) => o.number != null)
        .map((o) => ({
          type: o.type as DogPathObstacle["type"],
          x: o.x,
          y: o.y,
          rotation: o.rotation as number,
          number: o.number ?? null,
          curveDeg: o.curveDeg,
          curveSide: o.curveSide,
        })),
    );
    return { points: dp.points, cum: dp.cum, total: dp.total };
  }
  // Fallback: raklinje mellan numrerade mittpunkter.
  const numbered = course.obstacles
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    .map((o) => ({ x: o.x, y: o.y }));
  return buildFromPoints(numbered);
}

function buildFromPoints(points: PathPoint[]): SampledPath {
  if (points.length < 2) {
    return { points, cum: points.length === 1 ? [0] : [], total: 0 };
  }
  const cum: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
    cum.push(total);
  }
  return { points, cum, total };
}

export function sampleAt(path: SampledPath, t: number): SampledPose | null {
  // Återanvänd dogPath-implementationen för konsekvent beteende.
  return sampleDogPathAt(
    { anchors: [], points: path.points, cum: path.cum, total: path.total, obstacleM: 0, airM: 0 },
    t,
  );
}

export function toSvgPathD(path: SampledPath): string {
  return dogPathToSvgD({ anchors: [], points: path.points, cum: path.cum, total: path.total, obstacleM: 0, airM: 0 });
}

export function toSvgPathDUntil(path: SampledPath, t: number): string {
  return dogPathToSvgDUntil(
    { anchors: [], points: path.points, cum: path.cum, total: path.total, obstacleM: 0, airM: 0 },
    t,
  );
}
