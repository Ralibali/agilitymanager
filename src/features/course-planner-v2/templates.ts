/**
 * Sprint 5 — Förbyggda exempel-banor.
 * Dessa kan laddas direkt som startpunkt och ändras fritt.
 * Koordinater i meter (0,0 = övre vänstra hörnet).
 */
import type { ClassTemplateKey, ObstacleTypeV2, Sport, SizeClassKey } from "./config";

export interface PrebuiltObstacle {
  type: ObstacleTypeV2;
  x: number;
  y: number;
  rotation: number;
  number?: number;
}

export interface PrebuiltCourse {
  key: string;
  label: string;
  sport: Sport;
  classTemplate: ClassTemplateKey;
  arenaWidthM: number;
  arenaHeightM: number;
  defaultSize: SizeClassKey;
  description: string;
  obstacles: PrebuiltObstacle[];
}

function uid() { return Math.random().toString(36).slice(2, 10); }
export function instantiatePrebuilt(p: PrebuiltCourse) {
  return p.obstacles.map((o) => ({ ...o, id: uid() }));
}

export const PREBUILT_COURSES: PrebuiltCourse[] = [
  {
    key: "agility_hopp_1_lugn",
    label: "Hoppklass 1 — Lugn flow",
    sport: "agility",
    classTemplate: "agility_hopp_1",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "Mjuk svängbana för Hoppklass 1 — 16 hinder, mycket flow",
    obstacles: [
      { type: "start",   x: 4,  y: 36, rotation: 0 },
      { type: "jump",    x: 8,  y: 32, rotation: 0,  number: 1 },
      { type: "jump",    x: 14, y: 30, rotation: 30, number: 2 },
      { type: "jump",    x: 20, y: 32, rotation: 60, number: 3 },
      { type: "tunnel",  x: 25, y: 28, rotation: 90, number: 4 },
      { type: "jump",    x: 22, y: 22, rotation: 120, number: 5 },
      { type: "weave_12",x: 16, y: 22, rotation: 90,  number: 6 },
      { type: "jump",    x: 10, y: 22, rotation: 0,   number: 7 },
      { type: "jump",    x: 6,  y: 18, rotation: 45,  number: 8 },
      { type: "tunnel",  x: 10, y: 14, rotation: 0,   number: 9 },
      { type: "jump",    x: 16, y: 14, rotation: 0,   number: 10 },
      { type: "jump",    x: 22, y: 14, rotation: 0,   number: 11 },
      { type: "jump",    x: 26, y: 10, rotation: 90,  number: 12 },
      { type: "jump",    x: 22, y: 6,  rotation: 0,   number: 13 },
      { type: "jump",    x: 16, y: 6,  rotation: 0,   number: 14 },
      { type: "jump",    x: 10, y: 6,  rotation: 0,   number: 15 },
      { type: "tunnel",  x: 5,  y: 10, rotation: 0,   number: 16 },
      { type: "finish",  x: 4,  y: 4,  rotation: 0 },
    ],
  },
  {
    key: "agility_1_klassisk",
    label: "Agilityklass 1 — Klassisk",
    sport: "agility",
    classTemplate: "agility_1",
    arenaWidthM: 30,
    arenaHeightM: 40,
    defaultSize: "L",
    description: "Klassisk uppställning med slalom, balansbom och a-hinder",
    obstacles: [
      { type: "start",   x: 4,  y: 36, rotation: 0 },
      { type: "jump",    x: 8,  y: 33, rotation: 0,  number: 1 },
      { type: "jump",    x: 14, y: 32, rotation: 0,  number: 2 },
      { type: "tunnel",  x: 22, y: 32, rotation: 0,  number: 3 },
      { type: "dogwalk", x: 16, y: 26, rotation: 90, number: 4 },
      { type: "jump",    x: 8,  y: 22, rotation: 0,  number: 5 },
      { type: "weave_12",x: 14, y: 20, rotation: 90, number: 6 },
      { type: "jump",    x: 22, y: 20, rotation: 0,  number: 7 },
      { type: "aframe",  x: 16, y: 14, rotation: 90, number: 8 },
      { type: "jump",    x: 8,  y: 10, rotation: 0,  number: 9 },
      { type: "tunnel",  x: 14, y: 8,  rotation: 0,  number: 10 },
      { type: "seesaw",  x: 22, y: 10, rotation: 90, number: 11 },
      { type: "jump",    x: 22, y: 4,  rotation: 0,  number: 12 },
      { type: "jump",    x: 14, y: 4,  rotation: 0,  number: 13 },
      { type: "jump",    x: 8,  y: 4,  rotation: 0,  number: 14 },
      { type: "finish",  x: 4,  y: 4,  rotation: 0 },
    ],
  },
  {
    key: "hoopers_1_basic",
    label: "Hoopers Klass 1 — Grund",
    sport: "hoopers",
    classTemplate: "hoopers_1",
    arenaWidthM: 30,
    arenaHeightM: 30,
    defaultSize: "L",
    description: "Mjuk hoopers-bana med tunna och tunnel",
    obstacles: [
      { type: "start",        x: 4,  y: 26, rotation: 0 },
      { type: "handler_zone", x: 15, y: 15, rotation: 0 },
      { type: "hoop",         x: 8,  y: 22, rotation: 0,  number: 1 },
      { type: "hoop",         x: 14, y: 24, rotation: 0,  number: 2 },
      { type: "hoop",         x: 20, y: 22, rotation: 0,  number: 3 },
      { type: "tunnel",       x: 24, y: 18, rotation: 90, number: 4 },
      { type: "hoop",         x: 22, y: 12, rotation: 0,  number: 5 },
      { type: "barrel",       x: 16, y: 8,  rotation: 0,  number: 6 },
      { type: "hoop",         x: 10, y: 10, rotation: 0,  number: 7 },
      { type: "hoop",         x: 6,  y: 14, rotation: 0,  number: 8 },
      { type: "tunnel",       x: 8,  y: 6,  rotation: 0,  number: 9 },
      { type: "hoop",         x: 18, y: 4,  rotation: 0,  number: 10 },
      { type: "finish",       x: 26, y: 4,  rotation: 0 },
    ],
  },
];

export function getPrebuiltsBySport(sport: Sport): PrebuiltCourse[] {
  return PREBUILT_COURSES.filter((p) => p.sport === sport);
}
