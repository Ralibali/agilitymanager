import { OBSTACLES_V2, type ObstacleTypeV2 } from "@/features/course-planner-v2/config";
import type { PlacedObstacle } from "@/lib/course";

/** Defensiva gränser för all bandata som renderas — även äldre/sparade rader. */
export const ARENA_MIN_M = 5;
export const ARENA_MAX_M = 200;
export const MAX_RENDER_OBSTACLES = 500;
export const MAX_GRID_LINES = 201;

const VALID_TYPES = new Set<ObstacleTypeV2>(OBSTACLES_V2.map((o) => o.type));

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

export function clampArenaM(value: unknown, fallback: number): number {
  return clampNumber(value, ARENA_MIN_M, ARENA_MAX_M, fallback);
}

/** Rutnätet får aldrig allokera en array baserad på ovaliderad användardata. */
export function gridTicks(sizeM: unknown, stepM = 1): number[] {
  const size = clampArenaM(sizeM, 30);
  const step = clampNumber(stepM, 0.1, ARENA_MAX_M, 1);
  const count = Math.min(Math.floor(size / step) + 1, MAX_GRID_LINES);
  return Array.from({ length: count }, (_, i) => i * step);
}

/**
 * Render-säkra hinder för publika previews. Bygger upp objekten fält för fält
 * så att överskott, ogiltiga typer och extrema koordinater inte når SVG:n.
 */
export function sanitizePreviewObstacles(
  input: unknown,
  arenaWidthM: unknown,
  arenaHeightM: unknown,
): PlacedObstacle[] {
  if (!Array.isArray(input)) return [];
  const width = clampArenaM(arenaWidthM, 30);
  const height = clampArenaM(arenaHeightM, 40);

  return input.slice(0, MAX_RENDER_OBSTACLES).flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const raw = value as Record<string, unknown>;
    const type = raw.type as ObstacleTypeV2;
    if (!VALID_TYPES.has(type)) return [];

    const obstacle: PlacedObstacle = {
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 64) : `preview-${index}`,
      type,
      x: clampNumber(raw.x, 0, width, width / 2),
      y: clampNumber(raw.y, 0, height, height / 2),
      rotation: clampNumber(raw.rotation, -360, 360, 0),
    };

    if (typeof raw.number === "number" && Number.isFinite(raw.number) && raw.number > 0) {
      obstacle.number = Math.min(999, Math.round(raw.number));
    }
    if (typeof raw.curveDeg === "number" && Number.isFinite(raw.curveDeg)) {
      obstacle.curveDeg = clampNumber(raw.curveDeg, 0, 90, 0);
    }
    if (raw.curveSide === "left" || raw.curveSide === "right") obstacle.curveSide = raw.curveSide;
    if (raw.locked === true) obstacle.locked = true;
    if (typeof raw.zIndex === "number" && Number.isFinite(raw.zIndex)) {
      obstacle.zIndex = Math.round(raw.zIndex);
    }
    return [obstacle];
  });
}
