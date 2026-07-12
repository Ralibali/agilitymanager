/**
 * Rena helpers för gratis banbyggaren.
 * Alla koordinater i procent (0–100) av canvasens bredd/höjd.
 */

export const FREE_MIN_PCT = 3;
export const FREE_MAX_PCT = 97;

export interface PercentPoint {
  x: number;
  y: number;
}

export interface FreeObstacleLike {
  id: string;
  type: string;
  x: number;
  y: number;
}

export const MARKER_TYPES = new Set(["start", "finish"]);
export const FREE_MAX_COMPETITION_OBSTACLES = 8;

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return FREE_MIN_PCT;
  return Math.min(FREE_MAX_PCT, Math.max(FREE_MIN_PCT, value));
}

export function clampPercentPoint(point: PercentPoint): PercentPoint {
  return { x: clampPercent(point.x), y: clampPercent(point.y) };
}

/**
 * Konverterar client-koordinater till procentuell canvas-position.
 * Rect ska vara canvasens getBoundingClientRect.
 */
export function clientPointToPercent(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): PercentPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: FREE_MIN_PCT, y: FREE_MIN_PCT };
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return clampPercentPoint({ x, y });
}

export function obstacleCountExcludingMarkers(obstacles: FreeObstacleLike[]): number {
  let count = 0;
  for (const obstacle of obstacles) {
    if (!MARKER_TYPES.has(obstacle.type)) count += 1;
  }
  return count;
}

/**
 * Ger en rimlig start-position för nya hinder så att de inte staplas.
 * index är obstacles.length efter tillägg (1-baserat räknare).
 */
export function nextFreeObstaclePosition(index: number): PercentPoint {
  const stepX = 11;
  const stepY = 9;
  const x = 18 + ((index * stepX) % 64);
  const y = 26 + ((index * stepY) % 50);
  return clampPercentPoint({ x, y });
}
