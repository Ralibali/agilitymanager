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

// ── Banlinje: Catmull-Rom → kubiska Bézierkurvor ────────────────────────────

export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function pathLength(points: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

// ── Exempelbanor ────────────────────────────────────────────────────────────

const o = (
  id: string,
  type: ObstacleType,
  x: number,
  y: number,
  rotation = 0
): PlacedObstacle => ({ id, type, x, y, rotation });

export const SAMPLE_COURSES: Course[] = [
  {
    slug: "sv_agility_3_master_01",
    name: "Mästerskapsloopen",
    sport: "agility",
    level: "Klass 3 · 18 hinder",
    field: [40, 25],
    obstacles: [
      o("a1", "jump", 5, 20, 90),
      o("a2", "jump", 10, 14, 35),
      o("a3", "tunnel", 16, 20, 0),
      o("a4", "jump", 22, 15, -20),
      o("a5", "weave_12", 26, 8, 90),
      o("a6", "jump", 32, 14, -60),
      o("a7", "aframe", 34, 6, 90),
      o("a8", "jump", 26, 18, 10),
      o("a9", "tunnel", 18, 7, 90),
      o("a10", "jump", 12, 5, 90),
    ],
  },
  {
    slug: "sv_agility_1_balans_01",
    name: "Nyckeln",
    sport: "agility",
    level: "Klass 1–2 · 12 hinder",
    field: [36, 22],
    obstacles: [
      o("b1", "jump", 5, 17, 90),
      o("b2", "jump", 10, 10, 0),
      o("b3", "tire", 16, 15, 90),
      o("b4", "jump", 21, 8, 90),
      o("b5", "weave_12", 26, 14, 0),
      o("b6", "tunnel", 31, 7, 45),
      o("b7", "jump", 26, 4, 90),
      o("b8", "jump", 14, 5, 0),
    ],
  },
  {
    slug: "sv_hopp_2_teknik_01",
    name: "Serpentinen",
    sport: "agility",
    level: "Öppen · 14 hinder",
    field: [40, 24],
    obstacles: [
      o("c1", "jump", 6, 19, 90),
      o("c2", "tunnel", 12, 12, 20),
      o("c3", "jump", 18, 18, -90),
      o("c4", "jump", 24, 11, 90),
      o("c5", "dogwalk", 30, 17, 0),
      o("c6", "jump", 33, 9, -35),
      o("c7", "weave_12", 25, 4, 0),
      o("c8", "jump", 17, 8, 15),
      o("c9", "tunnel", 9, 5, -70),
      o("c10", "jump", 5, 12, 90),
    ],
  },
  {
    slug: "hoopers_1_basic",
    name: "Hoopersflödet",
    sport: "hoopers",
    level: "Hoopers · 10 moment",
    field: [36, 22],
    obstacles: [
      o("d1", "hoop", 5, 18, 90),
      o("d2", "hoop", 11, 12, 45),
      o("d3", "barrel", 16, 17, 0),
      o("d4", "hoop", 21, 10, 90),
      o("d5", "tunnel", 27, 15, -30),
      o("d6", "hoop", 31, 8, 0),
      o("d7", "hoop", 24, 5, -90),
      o("d8", "tunnel", 13, 6, 60),
      o("d9", "hoop", 7, 11, 15),
    ],
  },
];

// ── Tävlingar (exempeldata för redesignen) ──────────────────────────────────

export interface Competition {
  id: string;
  name: string;
  club: string;
  place: string;
  date: string;
  month: string;
  sport: Sport;
  classes: string;
  status: "open" | "soon" | "closed";
}

export const COMPETITIONS: Competition[] = [
  { id: "1", name: "Vårkretsen 2026", club: "Katrineholms BK", place: "Katrineholm", date: "12 apr", month: "April", sport: "agility", classes: "Klass 1–3 · Small/Medium/Large", status: "open" },
  { id: "2", name: "Hooperspremiären", club: "Nordiska Hooperssällskapet", place: "Uppsala", date: "19 apr", month: "April", sport: "hoopers", classes: "Nybörjare + Öppen", status: "open" },
  { id: "3", name: "Mälardalsmästerskapet", club: "Västerås Agilityklubb", place: "Västerås", date: "26 apr", month: "April", sport: "agility", classes: "Klass 1–3 · Lagtävling", status: "soon" },
  { id: "4", name: "Bärnstenscupen, deltävling 2", club: "Sydkustens Hundsport", place: "Karlskrona", date: "9 maj", month: "Maj", sport: "agility", classes: "Klass 2–3", status: "soon" },
  { id: "5", name: "Hoopers i parken", club: "Göteborgs Hoopersgäng", place: "Göteborg", date: "16 maj", month: "Maj", sport: "hoopers", classes: "Alla klasser", status: "soon" },
  { id: "6", name: "Nordisk sommarfinal", club: "Stockholms Agilitysällskap", place: "Stockholm", date: "6 jun", month: "Juni", sport: "agility", classes: "Klass 1–3 · Final", status: "soon" },
  { id: "7", name: "Midnattssolscupen", club: "Luleå Hundsportförening", place: "Luleå", date: "20 jun", month: "Juni", sport: "agility", classes: "Klass 1–3", status: "closed" },
  { id: "8", name: "Hoopersfestivalen", club: "Skåne Hoopers", place: "Malmö", date: "27 jun", month: "Juni", sport: "hoopers", classes: "Nybörjare + Öppen", status: "soon" },
];

export const STATUS_LABEL: Record<Competition["status"], string> = {
  open: "Anmälan öppen",
  soon: "Öppnar snart",
  closed: "Stängd",
};
