/**
 * Banplaneraren v2 — Sprint 6 (DEL 5)
 * Mappar V2-hinder (meter, origo i övre vänstra hörnet) till
 * 3D-modulens input-format. CoursePlanner3D.map2DTo3D förväntar sig
 * procent (0–100) på vardera axel, så vi normaliserar här.
 */
import type { ObstacleTypeV2 } from "./config";
import type { Planner3DObstacle } from "@/features/course-planner/3d/CoursePlanner3D";

interface ObstacleV2Like {
  id: string;
  type: ObstacleTypeV2;
  x: number;          // meter, 0 = vänster
  y: number;          // meter, 0 = topp
  rotation: number;
  number?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
}

export function mapToObstacle3D(
  obs: ObstacleV2Like,
  arenaWidthM: number,
  arenaHeightM: number,
  label?: string,
): Planner3DObstacle {
  // CoursePlanner3D förväntar sig procentkoordinater (0–100) på x/y.
  const xPct = (obs.x / arenaWidthM) * 100;
  const yPct = (obs.y / arenaHeightM) * 100;
  return {
    id: obs.id,
    type: obs.type,
    x: xPct,
    y: yPct,
    rotation: obs.rotation,
    number: obs.number,
    label,
    curveDeg: obs.curveDeg,
    curveSide: obs.curveSide,
  };
}

export function mapAllToObstacle3D(
  obstacles: ObstacleV2Like[],
  arenaWidthM: number,
  arenaHeightM: number,
  labelFor?: (type: ObstacleTypeV2) => string | undefined,
): Planner3DObstacle[] {
  return obstacles.map((o) => mapToObstacle3D(o, arenaWidthM, arenaHeightM, labelFor?.(o.type)));
}
