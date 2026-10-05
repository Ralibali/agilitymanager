// ── Datamodell för banplaneraren ────────────────────────────────────────────
// Bygger på v2-motorn i @/features/course-planner-v2 (regelverk, hinder, klasser)

import type { ObstacleTypeV2, Sport } from "@/features/course-planner-v2/config";

export type { Sport };
export type ObstacleType = ObstacleTypeV2;

export interface PlacedObstacle {
  id: string;
  type: ObstacleType;
  x: number; // meter
  y: number; // meter
  rotation: number; // grader
  number?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
  /** Tunnelns fysiska längd i meter (2–6). Saknas → standardtunnel 3 m. */
  lengthM?: number;
  locked?: boolean;
  zIndex?: number;
}

export interface Course {
  slug: string;
  name: string;
  sport: Sport;
  level: string;
  field: [number, number]; // bredd, höjd i meter
  obstacles: PlacedObstacle[];
}

export const uid = () => Math.random().toString(36).slice(2, 9);

// ── Adapter: riktiga banbiblioteket (v2) → visningskort ─────────────────────

import { getClassTemplate } from "@/features/course-planner-v2/config";
import type { CourseBankEntry } from "@/features/course-planner-v2/courseBank";

export function courseFromBankEntry(entry: CourseBankEntry): Course {
  const tpl = getClassTemplate(entry.classTemplate);
  const count = entry.obstacles.filter((ob) => ob.number != null).length;
  return {
    slug: entry.key,
    name: entry.label,
    sport: entry.sport,
    level: `${tpl?.label ?? "Fri bana"} · ${count} hinder`,
    field: [entry.arenaWidthM, entry.arenaHeightM],
    obstacles: entry.obstacles.map((ob) => ({ ...ob, id: uid() })),
  };
}
