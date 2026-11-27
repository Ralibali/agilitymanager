/**
 * Banplaneraren — bangenerator.
 *
 * Bygger en regelriktig bana för en klassmall på en bråkdel av en sekund:
 *
 *  1. **Recept** — vilka hinder banan ska ha (klassens tillåtna typer, ett
 *     slalom, kontaktfält, tunnlar …) och i vilken ordning (hopp först och
 *     sist, aldrig två kontaktfält i rad, specialhinder utspridda).
 *  2. **Konstruktion** — hindren placeras ett i taget längs en "styrd
 *     slumpvandring": varje nytt hinder läggs på rätt avstånd längs exakt
 *     samma hundlinje som editorn ritar (Catmull-Rom från `dogPath.ts`), med
 *     rak ansats där regelverket kräver det, fri landning efter hopp och
 *     tunnlar, marginal mot bankanten och utan att hundlinjen passerar över
 *     andra hinder. Fastnar vandringen backar den ett steg.
 *  3. **Kontroll** — varje kandidatbana körs genom planerarens egen
 *     regelkontroll (`validateCourse`). Bara banor utan fel och varningar
 *     godkänns; bland dem väljs den som bäst matchar vald stil enligt
 *     coachprofilen (`analyzeCourse`).
 *
 * Deterministisk: samma seed + inställningar ger samma bana (tidsbudgeten är
 * bara ett skyddsnät för mycket långsamma enheter).
 *
 * OBS: generatorn är ett planeringsverktyg. Den följer samma maskinellt
 * kontrollerbara regler som regelkontrollen — domarens bedömning på plats
 * ersätts inte.
 */
import type { PlacedObstacle } from "@/lib/course";
import {
  CLASS_TEMPLATES, OBSTACLES_V2,
  type ClassTemplate, type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";
import { getDefaultRuleSetIdForSport, getRuleSet, type RuleSet } from "./rules";
import {
  SAMPLES_PER_AIR_SEGMENT, catmullRom, getObstacleAnchors, passageInsetM,
  type DogPathObstacle, type ObstacleAnchors,
} from "./dogPath";
import { obstacleSizeM } from "./obstacleSize";
import { normalizeCurveDeg, rotateDir, toWorld, tunnelGeometryLocal, tunnelWorldAabb } from "./tunnelGeometry";
import { rotatedAabb, type AABB } from "./geometry";
import { validateCourse, type ValidationIssue } from "./validation";
import { analyzeCourse } from "./courseAnalysis";

export type GeneratorStyle = "flow" | "balanced" | "technical";

export const GENERATOR_STYLES: Array<{ key: GeneratorStyle; label: string; hint: string }> = [
  { key: "flow", label: "Flytande", hint: "Mjuka linjer och tydlig rytm" },
  { key: "balanced", label: "Balanserad", hint: "Blandade vinklar och några riktningsbyten" },
  { key: "technical", label: "Teknisk", hint: "Skarpa svängar, korsande linjer och fler byten" },
];

export interface GenerateOptions {
  sport: Sport;
  ruleSetId?: string;
  classTemplate: ClassTemplateKey;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  /** Antal tävlingshinder. Saknas → mitt i klassens intervall. */
  obstacleCount?: number;
  style?: GeneratorStyle;
  seed?: number;
  /** Max antal försök (default 70). */
  maxAttempts?: number;
  /** Skyddsnät i ms (default 2500) — avbryter om enheten är mycket långsam. */
  budgetMs?: number;
}

export interface GeneratedCourse {
  /** Hinder i banordning; start, mål och ev. dirigeringsområde sist. */
  obstacles: PlacedObstacle[];
  /** Kvarvarande fel/varningar (tom lista = regelkontrollen godkänner banan). */
  issues: ValidationIssue[];
  seed: number;
  attempts: number;
  style: GeneratorStyle;
  obstacleCount: number;
  difficultyScore: number;
  flowScore: number;
  difficultyLabel: string;
}

/* ───────────── Slump och vektorer ───────────── */

/** Liten, snabb och deterministisk PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
interface V { x: number; y: number }

const DEG = Math.PI / 180;
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
const len = (a: V) => Math.hypot(a.x, a.y);
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a: V): V => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
const fromAngle = (rad: number): V => ({ x: Math.cos(rad), y: Math.sin(rad) });
const angleOf = (a: V) => Math.atan2(a.y, a.x);
const rotateV = (a: V, rad: number): V => ({ x: a.x * Math.cos(rad) - a.y * Math.sin(rad), y: a.x * Math.sin(rad) + a.y * Math.cos(rad) });
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round2 = (v: number) => Math.round(v * 100) / 100;
const normDeg = (deg: number) => ((Math.round(deg * 10) / 10) % 360 + 360) % 360;

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function weighted<T>(rng: Rng, items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1][0];
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────────── Geometri ───────────── */

function segPointDist(p: V, a: V, b: V): number {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 < 1e-12) return dist(p, a);
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1);
  return dist(p, add(a, mul(ab, t)));
}

function segSegDist(a1: V, a2: V, b1: V, b2: V): number {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;
  return Math.min(segPointDist(a1, b1, b2), segPointDist(a2, b1, b2), segPointDist(b1, a1, a2), segPointDist(b2, a1, a2));
}

function segmentsIntersect(a1: V, a2: V, b1: V, b2: V): boolean {
  const d = (p: V, q: V, r: V) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = d(b1, b2, a1), d2 = d(b1, b2, a2), d3 = d(a1, a2, b1), d4 = d(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Avstånd från punkt `p` i riktning `dir` till banområdets kant. */
function rayToBoundary(p: V, dir: V, w: number, h: number): number {
  const hits: number[] = [];
  if (Math.abs(dir.x) > 1e-9) for (const x of [0, w]) { const t = (x - p.x) / dir.x; if (t >= 0) hits.push(t); }
  if (Math.abs(dir.y) > 1e-9) for (const y of [0, h]) { const t = (y - p.y) / dir.y; if (t >= 0) hits.push(t); }
  return hits.length ? Math.min(...hits) : 0;
}

/** Hindrets "skelett": polylinje + radie — för avstånd mellan hinder och hundlinje. */
interface Skeleton { pts: V[]; r: number }

function skeletonGap(a: Skeleton, b: Skeleton): number {
  let best = Infinity;
  const segsA = a.pts.length === 1 ? [[a.pts[0], a.pts[0]]] : a.pts.slice(1).map((p, i) => [a.pts[i], p]);
  const segsB = b.pts.length === 1 ? [[b.pts[0], b.pts[0]]] : b.pts.slice(1).map((p, i) => [b.pts[i], p]);
  for (const [a1, a2] of segsA) for (const [b1, b2] of segsB) best = Math.min(best, segSegDist(a1, a2, b1, b2));
  return best - a.r - b.r;
}

function pointToSkeleton(p: V, s: Skeleton): number {
  if (s.pts.length === 1) return dist(p, s.pts[0]) - s.r;
  let best = Infinity;
  for (let i = 1; i < s.pts.length; i++) best = Math.min(best, segPointDist(p, s.pts[i - 1], s.pts[i]));
  return best - s.r;
}

/* ───────────── Hinder ───────────── */

const CONTACTS = new Set<ObstacleTypeV2>(["aframe", "dogwalk", "seesaw"]);
const STRAIGHT = new Set<ObstacleTypeV2>(["tire", "longjump", "combo", "aframe", "dogwalk", "seesaw"]);
const POINT_TYPES = new Set<ObstacleTypeV2>(["hoop", "barrel", "fence", "number", "handler_zone"]);
const NEVER_GENERATED = new Set<ObstacleTypeV2>(["weave_8", "weave_10", "table", "start", "finish", "number", "handler_zone", "fence"]);

interface GenObstacle {
  ob: PlacedObstacle;
  /** Riktningen hunden färdas i genom hindret (för hoopar utan egen axel). */
  travel: V;
  anchors: ObstacleAnchors;
  aabb: AABB;
  skel: Skeleton;
  /** Hundlinjen från föregående hinders exit till det här hindrets entry. */
  air: V[];
  /** Fri landningszon efter hindret (punkter). */
  landing: V[];
}

function toDogPathOb(ob: PlacedObstacle): DogPathObstacle {
  return {
    id: ob.id, type: ob.type, x: ob.x, y: ob.y, rotation: ob.rotation, number: ob.number ?? null,
    curveDeg: ob.curveDeg, curveSide: ob.curveSide, lengthM: ob.lengthM,
  };
}

function aabbOf(ob: PlacedObstacle): AABB {
  const { w, d } = obstacleSizeM(ob, 0.4);
  if (ob.type === "tunnel" && normalizeCurveDeg(ob.curveDeg) > 0) {
    return tunnelWorldAabb({ x: ob.x, y: ob.y }, w, d, ob.rotation, ob.curveDeg ?? 0, ob.curveSide);
  }
  return rotatedAabb({ x: ob.x, y: ob.y }, w, d, ob.rotation);
}

function skeletonOf(ob: PlacedObstacle): Skeleton {
  const { w, d } = obstacleSizeM(ob, 0.4);
  const c = { x: ob.x, y: ob.y };
  switch (ob.type) {
    case "tunnel": {
      const geo = tunnelGeometryLocal(w, normalizeCurveDeg(ob.curveDeg), ob.curveSide, 12);
      return { pts: geo.centerline.map((p) => toWorld(p, c.x, c.y, ob.rotation)), r: d / 2 };
    }
    case "weave_8": case "weave_10": case "weave_12":
    case "aframe": case "dogwalk": case "seesaw":
      return { pts: [toWorld({ x: 0, y: -d / 2 }, c.x, c.y, ob.rotation), toWorld({ x: 0, y: d / 2 }, c.x, c.y, ob.rotation)], r: w / 2 };
    case "barrel":
      return { pts: [c], r: Math.max(w, d) / 2 };
    case "handler_zone":
      return { pts: [c], r: Math.hypot(w, d) / 2 };
    case "longjump": case "tire":
      return { pts: [toWorld({ x: -w / 4, y: 0 }, c.x, c.y, ob.rotation), toWorld({ x: w / 4, y: 0 }, c.x, c.y, ob.rotation)], r: Math.max(d, w / 2) / 2 };
    default:
      return { pts: [toWorld({ x: -w / 2, y: 0 }, c.x, c.y, ob.rotation), toWorld({ x: w / 2, y: 0 }, c.x, c.y, ob.rotation)], r: d / 2 };
  }
}

let idCounter = 0;
function genId(): string {
  idCounter = (idCounter + 1) % 1e9;
  return `g${Math.random().toString(36).slice(2, 7)}${idCounter.toString(36)}`;
}

interface TunnelParams { lengthM: number; curveDeg: number; curveSide: "left" | "right" }

/**
 * Skapa ett hinder så att hundens ENTRY hamnar i `entry` och hunden färdas
 * längs `axis` in i hindret.
 */
function buildObstacle(type: ObstacleTypeV2, entry: V, axis: V, tunnel?: TunnelParams): PlacedObstacle {
  const heading = angleOf(axis);
  if (type === "tunnel" && tunnel) {
    const w = obstacleSizeM({ type, lengthM: tunnel.lengthM, curveDeg: tunnel.curveDeg }).w;
    const geo = tunnelGeometryLocal(w, tunnel.curveDeg, tunnel.curveSide, 8);
    const rotDeg = (heading - angleOf(geo.entryDir)) / DEG;
    const offset = rotateDir(geo.centerline[0], rotDeg);
    return {
      id: genId(), type, x: entry.x - offset.x, y: entry.y - offset.y, rotation: rotDeg,
      lengthM: tunnel.lengthM, curveDeg: tunnel.curveDeg, curveSide: tunnel.curveSide,
    };
  }
  const rotation = heading / DEG - 90;
  if (POINT_TYPES.has(type)) return { id: genId(), type, x: entry.x, y: entry.y, rotation };
  const halfD = obstacleSizeM({ type }).d / 2;
  const c = add(entry, mul(axis, halfD));
  return { id: genId(), type, x: c.x, y: c.y, rotation };
}

/** Samma luftsegment som `buildDogPath` ritar mellan två hinder. */
function airSegment(a: ObstacleAnchors, b: ObstacleAnchors): V[] {
  const p1 = a.exit;
  const p2 = b.entry;
  const p0 = a.innerPoints.length >= 2 ? a.innerPoints[a.innerPoints.length - 2] : p1;
  const p3 = b.innerPoints.length >= 2 ? b.innerPoints[1] : p2;
  const pts: V[] = [p1];
  for (let s = 1; s <= SAMPLES_PER_AIR_SEGMENT; s++) {
    pts.push(s === SAMPLES_PER_AIR_SEGMENT ? p2 : catmullRom(p0, p1, p2, p3, s / SAMPLES_PER_AIR_SEGMENT));
  }
  return pts;
}

function polyLen(pts: V[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i], pts[i - 1]);
  return l;
}

function landingLengthM(type: ObstacleTypeV2): number {
  if (CONTACTS.has(type)) return 3.5;
  if (type === "tire" || type === "longjump" || type === "wall" || type === "combo") return 3.5;
  if (type === "jump" || type === "tunnel") return 3.0;
  if (type.startsWith("weave")) return 2.0;
  return 0;
}

function landingPoints(g: Pick<GenObstacle, "anchors" | "ob">): V[] {
  const l = landingLengthM(g.ob.type);
  if (l <= 0) return [];
  const pts: V[] = [];
  for (let s = 0.6; s <= l + 1e-9; s += 0.6) pts.push(add(g.anchors.exit, mul(g.anchors.exitDir, s)));
  return pts;
}

/* ───────────── Regelparametrar ───────────── */

interface Constraints {
  sport: Sport;
  tpl: ClassTemplate;
  rs: RuleSet;
  w: number;
  h: number;
  /** Mål-intervall för avstånd mellan följdhinder (m). */
  dLo: number;
  dHi: number;
  /** Agility: avstånd längs hundens väg. Hoopers: mitt–mitt. */
  metric: "path" | "center";
  borderM: number;
  runUpM: number;
  /** Minsta fria avstånd mellan hundlinjen och hinder som inte ingår i passagen. */
  pathClearM: number;
  /** Hoopers: dirigeringsområdets mitt och tillåtet avståndsintervall. */
  zone?: { center: V; minR: number; maxR: number };
  offSequenceMinM: number;
}

function resolveTemplate(rs: RuleSet, key: ClassTemplateKey): ClassTemplate | undefined {
  return rs.classTemplates.find((t) => t.key === key) ?? CLASS_TEMPLATES.find((t) => t.key === key);
}

function constraintsFor(opts: GenerateOptions, rs: RuleSet, tpl: ClassTemplate, rng: Rng): Constraints {
  const w = opts.arenaWidthM;
  const h = opts.arenaHeightM;
  if (opts.sport === "hoopers") {
    const s = rs.safetyRules;
    const min = s.hoopersConsecutiveMinMByClass?.[tpl.key] ?? s.minSafeM ?? 5;
    const max = s.hoopersConsecutiveMaxMByClass?.[tpl.key] ?? min + 2;
    const isSmall = opts.sizeClass === "XS" || opts.sizeClass === "S";
    const maxZone = (isSmall ? s.hoopersMaxDistanceFromHandlerZoneMByClassSmall?.[tpl.key] : undefined)
      ?? s.hoopersMaxDistanceFromHandlerZoneMByClass?.[tpl.key] ?? 20;
    const zoneMin = (s.hoopersHandlerZoneMinM ?? 3) + 0.4;
    const center = {
      x: round2(w / 2 + (rng() - 0.5) * Math.min(4, w * 0.12)),
      y: round2(h / 2 + (rng() - 0.5) * Math.min(4, h * 0.12)),
    };
    return {
      sport: "hoopers", tpl, rs, w, h,
      dLo: min + 0.25, dHi: Math.max(min + 0.6, max - 0.35),
      metric: "center", borderM: 0.6, runUpM: 0,
      // SHoK §4.4: hinder utanför hundens tänkta väg ska ligga minst 2,5 m från
      // den (hoopens radie räknas till). FCI §3.1 kräver 2 m mellan hinder —
      // där räcker en något mindre marginal mot linjen.
      pathClearM: rs.organization === "FCI" ? 1.6 : Math.max(2.0, (s.hoopersMinM ?? 2) - 0.2),
      zone: { center, minR: Math.max(zoneMin, 3.4), maxR: maxZone - 0.6 },
      offSequenceMinM: (s.hoopersMinM ?? 2) + 0.35,
    };
  }
  const minM = rs.safetyRules.minSafeM;
  const maxM = rs.courseRules?.maxConsecutiveM ?? minM + 2;
  return {
    sport: "agility", tpl, rs, w, h,
    dLo: minM + 0.25, dHi: maxM - 0.4,
    metric: "path",
    borderM: (rs.courseRules?.minBorderClearanceM ?? 1) + 0.1,
    runUpM: (rs.courseRules?.minRunUpM ?? 6) + 0.35,
    pathClearM: 1.0,
    offSequenceMinM: 3.0,
  };
}

/* ───────────── Recept ───────────── */

function allowedTypes(sport: Sport, tpl: ClassTemplate): Set<ObstacleTypeV2> {
  const out = new Set<ObstacleTypeV2>();
  for (const def of OBSTACLES_V2) {
    if (!def.sport.includes(sport)) continue;
    if (NEVER_GENERATED.has(def.type)) continue;
    if (tpl.allowedTypes?.length && !tpl.allowedTypes.includes(def.type)) continue;
    if (tpl.forbiddenTypes?.includes(def.type)) continue;
    if (sport === "hoopers" && !["hoop", "barrel", "tunnel"].includes(def.type)) continue;
    out.add(def.type);
  }
  return out;
}

/** Vilka hinder banan består av, i banordning. */
export function buildRecipe(sport: Sport, tpl: ClassTemplate, count: number, rng: Rng): ObstacleTypeV2[] | null {
  const allowed = allowedTypes(sport, tpl);
  const n = Math.round(count);
  const specials: ObstacleTypeV2[] = [];
  let filler: ObstacleTypeV2;

  if (sport === "hoopers") {
    if (!allowed.has("hoop")) return null;
    filler = "hoop";
    const barrels = allowed.has("barrel") ? clamp(Math.round(n * 0.15), 1, 3) : 0;
    const tunnels = allowed.has("tunnel") ? (n >= 21 ? 3 : n >= 15 ? 2 : 1) : 0;
    for (let i = 0; i < barrels; i++) specials.push("barrel");
    for (let i = 0; i < tunnels; i++) specials.push("tunnel");
  } else {
    if (!allowed.has("jump")) return null;
    filler = "jump";
    const noll = tpl.courseRules === "sagik_nollklass";
    if (noll) {
      if (tpl.key === "noll_slalom") specials.push("weave_12");
      else if (tpl.key === "noll_balans") specials.push("dogwalk");
      else specials.push(allowed.has("longjump") && rng() < 0.5 ? "longjump" : "wall");
      if (allowed.has("tunnel")) specials.push("tunnel", "tunnel");
    } else {
      for (const c of ["aframe", "dogwalk", "seesaw"] as const) if (allowed.has(c)) specials.push(c);
      if (allowed.has("weave_12")) specials.push("weave_12");
      const tunnels = allowed.has("tunnel") ? (n >= 19 ? 3 : 2) : 0;
      for (let i = 0; i < tunnels; i++) specials.push("tunnel");
      if (allowed.has("tire")) specials.push("tire");
      const lj = allowed.has("longjump") && rng() < 0.6;
      if (lj) specials.push("longjump");
      if (allowed.has("wall") && (!lj || (n >= 20 && rng() < 0.5))) specials.push("wall");
      if (allowed.has("combo")) specials.push("combo");
    }
  }
  if (n < 2 || specials.length > n - 2) return null;

  // Fördela specialhindren på plats 2..n−1 (index 1..n−2) med regler för
  // ordningen. Några försök med full spridning, sedan mjukare krav.
  const inner = n - 2;
  for (let attempt = 0; attempt < 80; attempt++) {
    const relaxed = attempt >= 40;
    const slots: Array<ObstacleTypeV2 | null> = Array(inner).fill(null);
    const order = shuffle(rng, specials);
    let ok = true;
    for (const t of order) {
      const candidates: number[] = [];
      for (let i = 0; i < inner; i++) {
        if (slots[i]) continue;
        const pos = i + 1; // position i banan (0-baserat)
        const prev = i > 0 ? slots[i - 1] : null;
        const next = i < inner - 1 ? slots[i + 1] : null;
        if (CONTACTS.has(t) && ((prev && CONTACTS.has(prev)) || (next && CONTACTS.has(next)))) continue;
        if (t.startsWith("weave") && (pos <= 1 || pos >= n - 2)) continue;
        if (!relaxed && (prev || next)) continue;
        if (sport === "hoopers" && (prev === t || next === t)) continue;
        candidates.push(i);
      }
      if (candidates.length === 0) { ok = false; break; }
      slots[pick(rng, candidates)] = t;
    }
    if (ok) return [filler, ...slots.map((s) => s ?? filler), filler];
  }
  return null;
}

/* ───────────── Svängar per stil ───────────── */

const TURN_BUCKETS: Record<GeneratorStyle, ReadonlyArray<readonly [[number, number], number]>> = {
  flow: [[[0, 25], 0.42], [[25, 60], 0.42], [[60, 100], 0.16]],
  balanced: [[[0, 25], 0.27], [[25, 70], 0.38], [[70, 120], 0.27], [[120, 160], 0.08]],
  technical: [[[0, 30], 0.16], [[30, 90], 0.32], [[90, 140], 0.34], [[140, 170], 0.18]],
};

function maxTurnAfter(type: ObstacleTypeV2): number {
  if (CONTACTS.has(type)) return 50;
  if (type.startsWith("weave")) return 70;
  if (type === "tunnel") return 65;
  if (type === "tire" || type === "longjump") return 70;
  return 175;
}

function maxTurnBefore(type: ObstacleTypeV2): number {
  if (STRAIGHT.has(type)) return 75;
  if (type.startsWith("weave")) return 90;
  if (type === "wall") return 110;
  return 175;
}

function approachDeviationDeg(type: ObstacleTypeV2, style: GeneratorStyle): number {
  if (POINT_TYPES.has(type)) return 0;
  if (STRAIGHT.has(type)) return 6;
  if (type === "wall") return 12;
  if (type.startsWith("weave")) return 15;
  if (type === "tunnel") return 20;
  return style === "flow" ? 18 : 30;
}

function sampleTunnel(rng: Rng, style: GeneratorStyle, sport: Sport, preferSide: 1 | -1): TunnelParams {
  const lengthM = sport === "hoopers"
    ? weighted(rng, [[3, 0.35], [4, 0.4], [5, 0.25]] as const)
    : weighted(rng, [[3, 0.15], [4, 0.35], [5, 0.3], [6, 0.2]] as const);
  const curveDeg = style === "flow"
    ? weighted(rng, [[0, 0.3], [45, 0.3], [90, 0.3], [135, 0.1]] as const)
    : style === "balanced"
      ? weighted(rng, [[0, 0.2], [45, 0.25], [90, 0.3], [135, 0.15], [180, 0.1]] as const)
      : weighted(rng, [[0, 0.15], [45, 0.15], [90, 0.3], [135, 0.2], [180, 0.2]] as const);
  const side = rng() < 0.7 ? preferSide : (-preferSide as 1 | -1);
  return { lengthM, curveDeg, curveSide: side === 1 ? "right" : "left" };
}

/* ───────────── Konstruktion ───────────── */

interface BuildContext {
  c: Constraints;
  style: GeneratorStyle;
  rng: Rng;
  placed: GenObstacle[];
  /** Vänster-/högersvängar hittills (för balans). */
  turnBalance: number;
}

function makeGen(ob: PlacedObstacle, prev: GenObstacle | null, travel: V): GenObstacle {
  const anchors = getObstacleAnchors(toDogPathOb(ob));
  const g: GenObstacle = {
    ob, travel: POINT_TYPES.has(ob.type) ? travel : anchors.exitDir, anchors, aabb: aabbOf(ob), skel: skeletonOf(ob),
    air: prev ? airSegment(prev.anchors, anchors) : [],
    landing: [],
  };
  g.landing = landingPoints(g);
  return g;
}

/** Avstånd mellan följdhinder i regelkontrollens mått. */
function pairDistance(c: Constraints, prev: GenObstacle, g: GenObstacle): number {
  if (c.metric === "center") return dist({ x: prev.ob.x, y: prev.ob.y }, { x: g.ob.x, y: g.ob.y });
  return polyLen(g.air) + passageInsetM(toDogPathOb(prev.ob)) + passageInsetM(toDogPathOb(g.ob));
}

function insideArena(b: AABB, c: Constraints, margin: number): boolean {
  return b.minX >= margin && b.minY >= margin && b.maxX <= c.w - margin && b.maxY <= c.h - margin;
}

function aabbGap(a: AABB, b: AABB): number {
  const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
  const dy = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY));
  if (dx === 0 && dy === 0) return -1;
  return Math.hypot(dx, dy);
}

/** Löper den nya linjen tätt bredvid en tidigare linje (inte bara korsar den)? */
function parallelOverlap(air: V[], earlier: GenObstacle[]): number {
  let count = 0;
  for (let i = 3; i < air.length - 3; i++) {
    const p = air[i];
    const t = unit(sub(air[i + 1], air[i - 1]));
    for (const g of earlier) {
      for (let j = 1; j < g.air.length - 1; j++) {
        const q = g.air[j];
        if (Math.abs(p.x - q.x) > 1.4 || Math.abs(p.y - q.y) > 1.4) continue;
        if (dist(p, q) > 1.3) continue;
        const u = unit(sub(g.air[j + 1], g.air[j - 1]));
        if (Math.abs(t.x * u.x + t.y * u.y) > 0.8) { count++; break; }
      }
    }
  }
  return count;
}

function crossingsWith(air: V[], earlier: GenObstacle[]): number {
  let n = 0;
  for (const g of earlier) {
    for (let i = 1; i < air.length; i++) {
      for (let j = 1; j < g.air.length; j++) {
        if (segmentsIntersect(air[i - 1], air[i], g.air[j - 1], g.air[j])) n++;
      }
    }
  }
  return n;
}

/**
 * Är kandidaten giltig mot allt som redan ligger på banan? Returnerar en
 * poäng (högre = bättre) eller null.
 */
function scoreCandidate(ctx: BuildContext, g: GenObstacle, index: number, total: number, turnDeg: number): number | null {
  const { c, placed } = ctx;
  const prev = placed[placed.length - 1];
  const others = placed.slice(0, -1);

  // 1. Inom banan med marginal mot kanten.
  if (!insideArena(g.aabb, c, c.borderM)) return null;
  // Hundlinjen stannar innanför banan.
  for (const p of g.air) if (p.x < 0.5 || p.y < 0.5 || p.x > c.w - 0.5 || p.y > c.h - 0.5) return null;

  // 2. Riktning: entry ska vara närmast föregående hinder (annars vänder
  //    hundlinjens orientering hindret).
  if (!POINT_TYPES.has(g.ob.type) && dist(prev.anchors.exit, g.anchors.entry) + 0.25 > dist(prev.anchors.exit, g.anchors.exit)) return null;
  if (placed.length === 1 && !POINT_TYPES.has(prev.ob.type)) {
    const center = { x: g.ob.x, y: g.ob.y };
    if (dist(prev.anchors.exit, center) + 0.05 > dist(prev.anchors.entry, center)) return null;
  }

  // 3. Avstånd till andra hinder (fysiskt och i regelkontrollens mått).
  if (aabbGap(g.aabb, prev.aabb) < 0.25) return null;
  if (skeletonGap(g.skel, prev.skel) < 0.6) return null;
  for (const o of others) {
    if (aabbGap(g.aabb, o.aabb) < 0.35) return null;
    if (skeletonGap(g.skel, o.skel) < (c.sport === "hoopers" ? 0.9 : 1.3)) return null;
    if (dist({ x: g.ob.x, y: g.ob.y }, { x: o.ob.x, y: o.ob.y }) < c.offSequenceMinM) return null;
  }

  // 4. Hundlinjen passerar inte över andra hinder — och gamla linjer inte över det nya.
  for (const o of others) {
    for (let i = 1; i < g.air.length - 1; i++) if (pointToSkeleton(g.air[i], o.skel) < c.pathClearM) return null;
  }
  for (let k = 0; k < placed.length; k++) {
    const o = placed[k];
    // Linjen in till föregående hinder får sluta nära det nya hindrets
    // utgång bara om det är själva hindret — annars krävs fri väg.
    for (let i = 1; i < o.air.length - 1; i++) if (pointToSkeleton(o.air[i], g.skel) < c.pathClearM) return null;
  }
  if (c.zone) {
    for (const p of g.air) if (dist(p, c.zone.center) < 2.9) return null;
    const r = dist({ x: g.ob.x, y: g.ob.y }, c.zone.center);
    if (r < c.zone.minR || r > c.zone.maxR) return null;
    if (pointToSkeleton(c.zone.center, g.skel) < 2.9) return null;
  }

  // 5. Fri landning efter hopp, tunnlar och kontaktfält.
  for (const p of g.landing) {
    if (p.x < 0.6 || p.y < 0.6 || p.x > c.w - 0.6 || p.y > c.h - 0.6) return null;
    for (const o of placed) if (pointToSkeleton(p, o.skel) < 0.6) return null;
  }
  for (const o of placed) for (const p of o.landing) if (pointToSkeleton(p, g.skel) < 0.6) return null;

  // 6. Sista hindret: utgång mot bankanten (SAgiK §3.1).
  const last = index === total - 1;
  if (last && c.runUpM > 0 && rayToBoundary(g.anchors.exit, g.anchors.exitDir, c.w, c.h) < c.runUpM) return null;

  // 7. Inga långa parallella linjer intill varandra.
  if (parallelOverlap(g.air, placed.slice(0, -1)) >= 3) return null;

  // ── Poäng ──
  const ahead = Math.min(rayToBoundary(g.anchors.exit, g.anchors.exitDir, c.w, c.h), 14);
  const centerG = { x: g.ob.x, y: g.ob.y };
  let density = 0;
  for (const o of placed) {
    const d = dist(centerG, { x: o.ob.x, y: o.ob.y });
    density += Math.exp(-(d * d) / (2 * 5.5 * 5.5));
  }
  const crossings = crossingsWith(g.air, placed.slice(0, -1));
  // Korsande linjer hör till tekniska banor, men hoopers raka linjer blir
  // snabbt ett spindelnät — där straffas korsningar hårdare.
  const crossWeight = (ctx.style === "technical" ? 0.1 : ctx.style === "balanced" ? -0.35 : -1.2) - (c.sport === "hoopers" ? 0.45 : 0);
  const balancePenalty = Math.abs(ctx.turnBalance + Math.sign(turnDeg)) > 2 ? 0.6 : 0;
  // Sista hindren ska inte styra in i ett hörn.
  const endPull = index >= total - 3 ? ahead / 14 : 0;
  return ahead / 14 * 1.2 - density * 0.9 + crossings * crossWeight - balancePenalty + endPull + ctx.rng() * 0.35;
}

function firstObstacle(ctx: BuildContext, type: ObstacleTypeV2): GenObstacle | null {
  const { c, rng } = ctx;
  for (let tries = 0; tries < 60; tries++) {
    let entry: V;
    let heading: number;
    if (c.zone) {
      // Hoopers: börja på en lagom radie från dirigeringsområdet.
      const ang = rng() * Math.PI * 2;
      const r = lerp(c.zone.minR + 1, Math.min(c.zone.maxR - 1, c.zone.minR + 6), rng());
      entry = add(c.zone.center, mul(fromAngle(ang), r));
      // Färdriktning ungefär tangentiellt runt området.
      heading = ang + (rng() < 0.5 ? 1 : -1) * (Math.PI / 2) + (rng() - 0.5) * 0.6;
    } else {
      const edge = weighted(rng, [["top", c.w], ["bottom", c.w], ["left", c.h], ["right", c.h]] as const);
      const inset = lerp(c.runUpM + 0.4, c.runUpM + 1.6, rng());
      const along = (l: number) => lerp(3.5, l - 3.5, rng());
      const tilt = (rng() - 0.5) * 70 * DEG;
      if (edge === "top") { entry = { x: along(c.w), y: inset }; heading = Math.PI / 2 + tilt; }
      else if (edge === "bottom") { entry = { x: along(c.w), y: c.h - inset }; heading = -Math.PI / 2 + tilt; }
      else if (edge === "left") { entry = { x: inset, y: along(c.h) }; heading = tilt; }
      else { entry = { x: c.w - inset, y: along(c.h) }; heading = Math.PI + tilt; }
    }
    const ob = buildObstacle(type, entry, fromAngle(heading));
    const g = makeGen(ob, null, fromAngle(heading));
    if (!insideArena(g.aabb, c, c.borderM)) continue;
    if (c.runUpM > 0 && rayToBoundary(g.anchors.entry, mul(g.anchors.entryDir, -1), c.w, c.h) < c.runUpM) continue;
    if (c.zone) {
      const r = dist({ x: ob.x, y: ob.y }, c.zone.center);
      if (r < c.zone.minR || r > c.zone.maxR) continue;
      if (pointToSkeleton(c.zone.center, g.skel) < 2.9) continue;
    }
    // Ingen front mot kanten direkt efter första hindret.
    if (rayToBoundary(g.anchors.exit, g.anchors.exitDir, c.w, c.h) < 7) continue;
    return g;
  }
  return null;
}

function nextCandidates(ctx: BuildContext, type: ObstacleTypeV2, index: number, total: number): Array<{ g: GenObstacle; score: number; turn: number }> {
  const { c, rng, style, placed } = ctx;
  const prev = placed[placed.length - 1];
  const out: Array<{ g: GenObstacle; score: number; turn: number }> = [];
  const turnCap = Math.min(maxTurnAfter(prev.ob.type), maxTurnBefore(type));
  const devCap = approachDeviationDeg(type, style);
  // Hoopar har ingen axel — fortsätt i den riktning hunden kom in.
  const baseDir = prev.travel;

  const buckets = TURN_BUCKETS[style];
  /** Stilens sannolikhet per grad för en sväng av storleken `mag`. */
  const styleDensity = (mag: number) => {
    for (const [[lo, hi], wgt] of buckets) if (mag >= lo && mag <= hi) return wgt / Math.max(1, hi - lo);
    return 0.0005;
  };
  const cap = c.zone ? Math.min(turnCap, 150) : turnCap;

  for (let tries = 0; tries < 48 && out.length < 14; tries++) {
    const target = c.metric === "center"
      // Hoopers: kortare steg oftare — långa steg tar slut på ytan snabbt.
      ? lerp(c.dLo, c.dHi, Math.pow(rng(), 1.5))
      : lerp(c.dLo, c.dHi, rng());
    // Välj bara bland riktningar där hindret hamnar innanför banan (och,
    // för hoopers, i rätt avstånd från dirigeringsområdet) — vikta efter
    // stilens svängprofil och svängbalansen.
    const reach = Math.max(1, target - (c.metric === "path" ? 0.4 : 0));
    const feasible: Array<readonly [number, number]> = [];
    for (let deg = -cap; deg <= cap + 1e-9; deg += 7.5) {
      const p = add(prev.anchors.exit, mul(rotateV(baseDir, deg * DEG), reach));
      const m = c.borderM + 0.6;
      if (p.x < m || p.y < m || p.x > c.w - m || p.y > c.h - m) continue;
      if (c.zone) {
        const r = dist(p, c.zone.center);
        if (r < c.zone.minR || r > c.zone.maxR) continue;
      }
      let wgt = styleDensity(Math.abs(deg));
      if (Math.abs(deg) > 20) {
        const s = Math.sign(deg);
        if (ctx.turnBalance > 1 && s > 0) wgt *= 0.35;
        if (ctx.turnBalance < -1 && s < 0) wgt *= 0.35;
      }
      feasible.push([deg, wgt] as const);
    }
    if (feasible.length === 0) break;
    const turn = clamp(weighted(rng, feasible) + (rng() - 0.5) * 7.5, -cap, cap);
    const sign = turn >= 0 ? 1 : -1;
    const chord = rotateV(baseDir, turn * DEG);
    const dev = (rng() * 2 - 1) * devCap;
    const axis = rotateV(chord, dev * DEG);
    const tunnel = type === "tunnel" ? sampleTunnel(rng, style, c.sport, sign > 0 ? 1 : -1) : undefined;

    // Lös chordlängden så att avståndet i regelkontrollens mått blir `target`.
    let L = Math.max(1.5, target - (c.metric === "path" ? passageInsetM(toDogPathOb(prev.ob)) + 0.2 : 0));
    let g: GenObstacle | null = null;
    for (let it = 0; it < 4; it++) {
      const ob = buildObstacle(type, add(prev.anchors.exit, mul(chord, L)), axis, tunnel);
      g = makeGen(ob, prev, chord);
      const d = pairDistance(c, prev, g);
      if (Math.abs(d - target) < 0.04) break;
      L = Math.max(0.8, L + (target - d) * (c.metric === "center" ? 1 : 0.9));
    }
    if (!g) continue;
    const d = pairDistance(c, prev, g);
    if (d < c.dLo - 0.15 || d > c.dHi + 0.15) continue;
    const score = scoreCandidate(ctx, g, index, total, turn);
    if (score == null) continue;
    out.push({ g, score, turn });
  }
  return out;
}

function chooseCandidate<T extends { score: number }>(rng: Rng, items: T[]): T {
  const sorted = [...items].sort((a, b) => b.score - a.score).slice(0, 5);
  const max = sorted[0].score;
  return weighted(rng, sorted.map((it) => [it, Math.exp((it.score - max) / 0.35)] as const));
}

function construct(ctx: BuildContext, recipe: ObstacleTypeV2[]): GenObstacle[] | null {
  const first = firstObstacle(ctx, recipe[0]);
  if (!first) return null;
  ctx.placed = [first];
  /** Hur mycket varje steg ändrade svängbalansen (för backning). */
  const balanceDeltas: number[] = [];
  const failures = new Array(recipe.length).fill(0);
  let backtracks = 0;
  while (ctx.placed.length < recipe.length) {
    const index = ctx.placed.length;
    const cands = nextCandidates(ctx, recipe[index], index, recipe.length);
    if (cands.length === 0) {
      failures[index]++;
      if (index <= 1 || backtracks > 40 || failures[index] > 6) return null;
      // Backa ett steg och prova en annan placering.
      ctx.placed.pop();
      ctx.turnBalance -= balanceDeltas.pop() ?? 0;
      backtracks++;
      continue;
    }
    const choice = chooseCandidate(ctx.rng, cands);
    ctx.placed.push(choice.g);
    const delta = Math.abs(choice.turn) > 20 ? Math.sign(choice.turn) : 0;
    balanceDeltas.push(delta);
    ctx.turnBalance += delta;
  }
  return ctx.placed;
}

/* ───────────── Start, mål och dirigeringsområde ───────────── */

function lineMarker(type: "start" | "finish", at: V, travel: V): PlacedObstacle {
  return { id: genId(), type, x: round2(at.x), y: round2(at.y), rotation: normDeg(angleOf(travel) / DEG - 90) };
}

function placeLine(
  c: Constraints, placed: GenObstacle[], type: "start" | "finish", from: V, dir: V, distances: number[],
  avoid?: PlacedObstacle,
): PlacedObstacle | null {
  for (const s of distances) {
    const at = add(from, mul(dir, s));
    const ob = lineMarker(type, at, type === "start" ? mul(dir, -1) : dir);
    const b = aabbOf(ob);
    if (!insideArena(b, c, 0.3)) continue;
    const skel = skeletonOf(ob);
    if (placed.some((g) => skeletonGap(skel, g.skel) < 0.6)) continue;
    if (avoid && skeletonGap(skel, skeletonOf(avoid)) < 1.2) continue;
    if (c.zone && pointToSkeleton(c.zone.center, skel) < 3) continue;
    return ob;
  }
  return null;
}

/** Hoopar och staket vrids så att hunden passerar mitt emellan in- och utgång. */
function settlePointRotations(placed: GenObstacle[]) {
  for (let i = 0; i < placed.length; i++) {
    const g = placed[i];
    if (!POINT_TYPES.has(g.ob.type)) continue;
    if (g.ob.type === "barrel") { g.ob.rotation = 0; continue; }
    const c = { x: g.ob.x, y: g.ob.y };
    const prev = placed[i - 1];
    const next = placed[i + 1];
    const dirIn = prev ? unit(sub(c, prev.anchors.exit)) : null;
    const dirOut = next ? unit(sub(next.anchors.entry, c)) : null;
    let travel = dirIn && dirOut ? add(dirIn, dirOut) : dirIn ?? dirOut ?? { x: 0, y: 1 };
    if (len(travel) < 0.2) travel = dirIn ?? dirOut ?? { x: 0, y: 1 };
    g.ob.rotation = normDeg(angleOf(travel) / DEG - 90);
  }
}

function finalizeCourse(c: Constraints, placed: GenObstacle[]): PlacedObstacle[] | null {
  if (c.sport === "hoopers") settlePointRotations(placed);
  const competing = placed.map((g, i) => ({
    ...g.ob,
    x: round2(g.ob.x),
    y: round2(g.ob.y),
    rotation: normDeg(g.ob.rotation),
    ...(g.ob.type === "tunnel" ? { curveDeg: g.ob.curveDeg, curveSide: g.ob.curveSide, lengthM: g.ob.lengthM } : {}),
    number: i + 1,
  }));
  const first = placed[0];
  const last = placed[placed.length - 1];
  const startDir = mul(first.anchors.entryDir, -1);
  const start = placeLine(c, placed, "start", first.anchors.entry, startDir, c.sport === "hoopers" ? [2, 1.5, 3, 1] : [2.5, 2, 3.2, 1.6]);
  if (!start) return null;
  const finish = placeLine(c, placed, "finish", last.anchors.exit, last.anchors.exitDir, c.sport === "hoopers" ? [2.5, 2, 3, 1.5] : [3, 2.5, 3.5, 2], start);
  if (!finish) return null;
  const out: PlacedObstacle[] = [start, ...competing, finish];
  if (c.zone) out.push({ id: genId(), type: "handler_zone", x: c.zone.center.x, y: c.zone.center.y, rotation: 0 });
  return out;
}

/* ───────────── Huvudfunktion ───────────── */

/** Standardantal hinder: mitt i klassens intervall, avrundat nedåt. */
export function defaultObstacleCount(tpl: Pick<ClassTemplate, "obstacleRange">): number {
  const [lo, hi] = tpl.obstacleRange;
  return Math.floor((lo + hi) / 2);
}

/** Föreslagen stil utifrån klassnivå. */
export function defaultStyleFor(key: ClassTemplateKey): GeneratorStyle {
  if (key.startsWith("noll") || key.endsWith("_1") || key === "hoopers_2" || key === "hoopers_fci_h1") return "flow";
  if (key.endsWith("_3") || key === "hoopers_4" || key === "hoopers_fci_h3") return "technical";
  return "balanced";
}

function styleFit(style: GeneratorStyle, a: { difficultyScore: number; flowScore: number }): number {
  if (style === "flow") return a.flowScore - a.difficultyScore * 0.35;
  if (style === "technical") return a.difficultyScore + a.flowScore * 0.15;
  return -Math.abs(a.difficultyScore - 45) - Math.abs(a.flowScore - 70) * 0.3;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function generateCourse(opts: GenerateOptions): GeneratedCourse | null {
  const rs = getRuleSet(opts.ruleSetId ?? getDefaultRuleSetIdForSport(opts.sport))
    ?? getRuleSet(getDefaultRuleSetIdForSport(opts.sport));
  if (!rs || rs.sport !== opts.sport) return null;
  const tpl = resolveTemplate(rs, opts.classTemplate);
  if (!tpl || tpl.sport !== opts.sport) return null;
  const seed = Math.floor(opts.seed ?? Date.now()) >>> 0;
  const rng = mulberry32(seed);
  const style = opts.style ?? defaultStyleFor(tpl.key);
  const [minN, maxN] = tpl.obstacleRange;
  const count = clamp(Math.round(opts.obstacleCount ?? defaultObstacleCount(tpl)), minN, maxN);
  const maxAttempts = opts.maxAttempts ?? 70;
  const budget = opts.budgetMs ?? 2500;
  const deadline = now() + budget;
  const hardDeadline = deadline + budget;

  type Result = { obstacles: PlacedObstacle[]; issues: ValidationIssue[]; fit: number; analysis: ReturnType<typeof analyzeCourse> };
  const accepted: Result[] = [];
  let best: Result | null = null;
  let bestProblemScore = Infinity;
  let attempts = 0;

  while (attempts < maxAttempts && accepted.length < 4) {
    attempts++;
    const c = constraintsFor(opts, rs, tpl, rng);
    const recipe = buildRecipe(opts.sport, tpl, count, rng);
    if (!recipe) break;
    const ctx: BuildContext = { c, style, rng, placed: [], turnBalance: 0 };
    const placed = construct(ctx, recipe);
    const obstacles = placed ? finalizeCourse(c, placed) : null;
    if (obstacles) {
      const issues = validateCourse({
        sport: opts.sport, sizeClass: opts.sizeClass, arenaWidthM: opts.arenaWidthM, arenaHeightM: opts.arenaHeightM,
        classTemplate: tpl.key, obstacles: obstacles.map((o) => ({ ...o })), ruleSetId: rs.id,
      }).filter((i) => i.level !== "info");
      const analysis = analyzeCourse(obstacles.filter((o) => o.number != null).map((o) => ({ ...o })));
      const result: Result = { obstacles, issues, analysis, fit: styleFit(style, analysis) };
      if (issues.length === 0) {
        accepted.push(result);
      } else {
        const problemScore = issues.filter((i) => i.level === "error").length * 100 + issues.length;
        if (problemScore < bestProblemScore) { bestProblemScore = problemScore; best = result; }
      }
    }
    const t = now();
    if (t > deadline && (accepted.length > 0 || best)) break;
    // Hårt tak: hellre inget förslag än en frusen flik.
    if (t > hardDeadline) break;
  }

  const chosen = accepted.length ? accepted.reduce((a, b) => (b.fit > a.fit ? b : a)) : best;
  if (!chosen) return null;
  return {
    obstacles: chosen.obstacles,
    issues: chosen.issues,
    seed,
    attempts,
    style,
    obstacleCount: count,
    difficultyScore: chosen.analysis.difficultyScore,
    flowScore: chosen.analysis.flowScore,
    difficultyLabel: chosen.analysis.difficultyLabel,
  };
}
