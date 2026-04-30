/**
 * Banplaneraren v2 — Path-sampling för 2D-uppspelning.
 *
 * Bygger en polyline (i meter) från numrerade hinder och låter dig hämta
 * position + heading (radianer) vid en normaliserad parameter t ∈ [0, 1].
 *
 * Framtida utbyggnad: när CourseV2.handlerPath finns (Del C) skickar man
 * in den punktlistan istället för numbered-list.
 */

import type { CourseV2 } from "./config";

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
  cum: number[]; // ackumulerad längd vid varje punkt; cum[0]=0
  total: number; // total längd i meter
}

/**
 * Bygger rutt från en bana. Använder handler-path om finns, annars
 * raklinje mellan numrerade hinder (1 → 2 → 3 …).
 */
export function buildCoursePath(course: CourseV2): SampledPath {
  // Plats för framtida handler-path:
  // const handlerPath = (course as any).handlerPath as PathPoint[] | undefined;
  // if (handlerPath && handlerPath.length > 1) return buildFromPoints(handlerPath);

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

/**
 * Hämta pose (x, y, heading) vid normaliserad parameter t ∈ [0, 1].
 * Returnerar null om path är tom.
 */
export function sampleAt(path: SampledPath, t: number): SampledPose | null {
  if (path.points.length === 0) return null;
  if (path.points.length === 1 || path.total === 0) {
    return { x: path.points[0].x, y: path.points[0].y, heading: 0 };
  }
  const clamped = Math.max(0, Math.min(1, t));
  const target = clamped * path.total;

  // Binärsök hade gått fint men n är litet.
  let i = 1;
  while (i < path.cum.length && path.cum[i] < target) i++;
  if (i >= path.cum.length) i = path.cum.length - 1;

  const segLen = path.cum[i] - path.cum[i - 1];
  const localT = segLen > 0 ? (target - path.cum[i - 1]) / segLen : 0;
  const a = path.points[i - 1];
  const b = path.points[i];
  const x = a.x + (b.x - a.x) * localT;
  const y = a.y + (b.y - a.y) * localT;
  const heading = Math.atan2(b.y - a.y, b.x - a.x);
  return { x, y, heading };
}

/** Bygg SVG path-d för hela rutten. */
export function toSvgPathD(path: SampledPath): string {
  if (path.points.length < 2) return "";
  return path.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
}

/**
 * Bygg SVG path-d för "redan tillryggalagd" del fram till parameter t.
 * Används för att rita den färgade traversen bakom markören.
 */
export function toSvgPathDUntil(path: SampledPath, t: number): string {
  if (path.points.length < 2 || path.total === 0) return "";
  const clamped = Math.max(0, Math.min(1, t));
  const target = clamped * path.total;
  const parts: string[] = [`M ${path.points[0].x} ${path.points[0].y}`];
  for (let i = 1; i < path.points.length; i++) {
    if (path.cum[i] <= target) {
      parts.push(`L ${path.points[i].x} ${path.points[i].y}`);
    } else {
      const segLen = path.cum[i] - path.cum[i - 1];
      const localT = segLen > 0 ? (target - path.cum[i - 1]) / segLen : 0;
      const a = path.points[i - 1];
      const b = path.points[i];
      parts.push(`L ${a.x + (b.x - a.x) * localT} ${a.y + (b.y - a.y) * localT}`);
      break;
    }
  }
  return parts.join(" ");
}
