/**
 * Banplaneraren — förarplan och övningar.
 *
 * Två lager ovanpå hinderuppställningen:
 *
 *  - **Förarplan** (`CourseMarkup`): förarens linje (frihandsdrag) och
 *    markeringar — förarposition, framförbyte, bakombyte, blindbyte,
 *    belöning och fria anteckningar. "Ritar du bara hundens väg har du
 *    ritat halva banan."
 *  - **Övningar** (`CourseExercise`): flera sekvenser på samma uppställning.
 *    Ett hinder får tas flera gånger (dock inte två gånger i rad), så att en
 *    träningsgrupp kan köra tre nivåer av samma tema utan att bygga om.
 *
 * Allt här är rena funktioner utan React/DOM så att de kan enhetstestas.
 *
 * Säkerhetsmodell (samma som JSON-importen): data utifrån — fil, delningslänk,
 * molnet — byggs upp fält för fält med hårda tak på antal, längd och
 * koordinater. Okända fält strippas alltid.
 */

export interface Vec2 { x: number; y: number }

export type CueKind = "handler" | "front_cross" | "rear_cross" | "blind_cross" | "reward" | "note";

export interface CueDef {
  kind: CueKind;
  label: string;
  /** Kort text i brickan (ritas i editorn, PNG och PDF). */
  short: string;
  description: string;
}

export const CUE_DEFS: CueDef[] = [
  { kind: "handler", label: "Förarposition", short: "F", description: "Var föraren står eller ska vara när hunden tar hindret" },
  { kind: "front_cross", label: "Framförbyte", short: "FB", description: "Föraren byter sida framför hunden" },
  { kind: "rear_cross", label: "Bakombyte", short: "BB", description: "Föraren byter sida bakom hunden" },
  { kind: "blind_cross", label: "Blindbyte", short: "BL", description: "Föraren byter sida med ryggen mot hunden" },
  { kind: "reward", label: "Belöning", short: "★", description: "Plats för belöning eller paus i övningen" },
  { kind: "note", label: "Anteckning", short: "T", description: "Fri text på banan — instruktion, fokus eller fråga" },
];

const CUE_KINDS = new Set<CueKind>(CUE_DEFS.map((d) => d.kind));

export function getCueDef(kind: CueKind): CueDef {
  return CUE_DEFS.find((d) => d.kind === kind) ?? CUE_DEFS[0];
}

export interface HandlerStroke {
  id: string;
  /** Förenklad frihandslinje i meter (minst två punkter). */
  points: Vec2[];
}

export interface CourseCue {
  id: string;
  kind: CueKind;
  x: number;
  y: number;
  /** Bara för anteckningar. */
  text?: string;
}

export interface CourseMarkup {
  strokes: HandlerStroke[];
  cues: CourseCue[];
}

export interface CourseExercise {
  id: string;
  name: string;
  /** Hinder-id:n i den ordning de tas. Samma hinder kan förekomma flera gånger. */
  steps: string[];
  /** Övningens egen förarplan. */
  markup?: CourseMarkup;
}

export const MARKUP_LIMITS = {
  strokes: 40,
  pointsPerStroke: 300,
  totalPoints: 3000,
  cues: 80,
  noteChars: 140,
} as const;

export const EXERCISE_LIMITS = {
  exercises: 12,
  steps: 60,
  nameChars: 60,
} as const;

export const EMPTY_MARKUP: CourseMarkup = { strokes: [], cues: [] };

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (v: number) => Math.round(v * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/** Text från användaren/filen: styrtecken bort (radbrytning tillåts i anteckningar), längdtak. */
export function cleanNoteText(v: unknown, max: number = MARKUP_LIMITS.noteChars): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_CHARS_RE, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

function cleanName(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim().slice(0, max);
}

export function isMarkupEmpty(m?: CourseMarkup | null): boolean {
  return !m || (m.strokes.length === 0 && m.cues.length === 0);
}

/* ───────────── Sanering (fil, länk, moln) ───────────── */

interface ArenaLike { width: number; height: number }

function readPoint(raw: unknown, arena: ArenaLike): Vec2 | null {
  let x: unknown;
  let y: unknown;
  if (Array.isArray(raw)) {
    [x, y] = raw;
  } else if (raw && typeof raw === "object") {
    ({ x, y } = raw as { x?: unknown; y?: unknown });
  } else {
    return null;
  }
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: round2(clamp(x, 0, arena.width)), y: round2(clamp(y, 0, arena.height)) };
}

/**
 * Bygg upp en förarplan fält för fält. Returnerar `undefined` när inget
 * användbart finns, så att tomma lager inte skrivs ut i export/delning.
 */
export function sanitizeMarkup(raw: unknown, arena: ArenaLike): CourseMarkup | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const strokes: HandlerStroke[] = [];
  let totalPoints = 0;
  if (Array.isArray(r.strokes)) {
    for (const s of r.strokes.slice(0, MARKUP_LIMITS.strokes)) {
      if (!s || typeof s !== "object") continue;
      const rawPoints = (s as Record<string, unknown>).points;
      if (!Array.isArray(rawPoints)) continue;
      const budget = Math.min(MARKUP_LIMITS.pointsPerStroke, MARKUP_LIMITS.totalPoints - totalPoints);
      if (budget < 2) break;
      const points: Vec2[] = [];
      for (const p of rawPoints.slice(0, budget)) {
        const pt = readPoint(p, arena);
        if (!pt) continue;
        const last = points[points.length - 1];
        if (last && last.x === pt.x && last.y === pt.y) continue;
        points.push(pt);
      }
      if (points.length < 2) continue;
      totalPoints += points.length;
      strokes.push({ id: uid(), points });
    }
  }
  const cues: CourseCue[] = [];
  if (Array.isArray(r.cues)) {
    for (const c of r.cues.slice(0, MARKUP_LIMITS.cues)) {
      if (!c || typeof c !== "object") continue;
      const cr = c as Record<string, unknown>;
      if (!CUE_KINDS.has(cr.kind as CueKind)) continue;
      const pt = readPoint(cr, arena);
      if (!pt) continue;
      const cue: CourseCue = { id: uid(), kind: cr.kind as CueKind, x: pt.x, y: pt.y };
      if (cue.kind === "note") {
        const text = cleanNoteText(cr.text);
        if (!text) continue;
        cue.text = text;
      }
      cues.push(cue);
    }
  }
  if (strokes.length === 0 && cues.length === 0) return undefined;
  return { strokes, cues };
}

/**
 * Bygg upp övningarna fält för fält. `resolveRef` översätter en hinderreferens
 * från källan — id (sträng) eller index i källans hinderlista (tal) — till
 * hindrets id i den inlästa banan. Referenser som inte går att lösa tas bort.
 */
export function sanitizeExercises(
  raw: unknown,
  resolveRef: (ref: unknown) => string | null,
  arena: ArenaLike,
): CourseExercise[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CourseExercise[] = [];
  for (const e of raw.slice(0, EXERCISE_LIMITS.exercises)) {
    if (!e || typeof e !== "object" || Array.isArray(e)) continue;
    const er = e as Record<string, unknown>;
    const name = cleanName(er.name, EXERCISE_LIMITS.nameChars) || nextExerciseName(out);
    const steps: string[] = [];
    if (Array.isArray(er.steps)) {
      for (const ref of er.steps.slice(0, EXERCISE_LIMITS.steps * 2)) {
        const id = resolveRef(ref);
        if (!id) continue;
        if (steps[steps.length - 1] === id) continue;
        steps.push(id);
        if (steps.length >= EXERCISE_LIMITS.steps) break;
      }
    }
    const markup = sanitizeMarkup(er.markup, arena);
    out.push({ id: uid(), name, steps, ...(markup ? { markup } : {}) });
  }
  return out.length ? out : undefined;
}

/* ───────────── Serialisering ───────────── */

export interface ExtrasSource {
  obstacles: Array<{ id: string }>;
  markup?: CourseMarkup;
  exercises?: CourseExercise[];
}

type SerializedPoint = [number, number];
interface SerializedMarkup {
  strokes?: Array<{ points: SerializedPoint[] }>;
  cues?: Array<{ kind: CueKind; x: number; y: number; text?: string }>;
}
interface SerializedExercise {
  name: string;
  steps: Array<string | number>;
  markup?: SerializedMarkup;
}
export interface SerializedExtras {
  markup?: SerializedMarkup;
  exercises?: SerializedExercise[];
}

function serializeMarkup(m: CourseMarkup | undefined, round: (v: number) => number): SerializedMarkup | undefined {
  if (isMarkupEmpty(m)) return undefined;
  const out: SerializedMarkup = {};
  if (m!.strokes.length) {
    out.strokes = m!.strokes.map((s) => ({ points: s.points.map((p) => [round(p.x), round(p.y)] as SerializedPoint) }));
  }
  if (m!.cues.length) {
    out.cues = m!.cues.map((c) => ({
      kind: c.kind, x: round(c.x), y: round(c.y),
      ...(c.kind === "note" && c.text ? { text: c.text } : {}),
    }));
  }
  return out;
}

/**
 * Lagren i filformat.
 *  - `"ids"`: övningarnas steg som hinder-id (JSON-export, molnet).
 *  - `"indices"`: steg som index i hinderlistan och koordinater på dm —
 *    för delningslänkar, där hinder-id:n inte följer med.
 */
export function serializeExtras(src: ExtrasSource, mode: "ids" | "indices"): SerializedExtras {
  const round = mode === "indices" ? round1 : round2;
  const index = new Map(src.obstacles.map((o, i) => [o.id, i]));
  const out: SerializedExtras = {};
  const markup = serializeMarkup(src.markup, round);
  if (markup) out.markup = markup;
  if (src.exercises?.length) {
    out.exercises = src.exercises.map((e) => {
      const steps = liveSteps(e.steps, index);
      const m = serializeMarkup(e.markup, round);
      return {
        name: e.name,
        steps: mode === "indices" ? steps.map((id) => index.get(id) as number) : steps,
        ...(m ? { markup: m } : {}),
      };
    });
  }
  return out;
}

/* ───────────── Övningar ───────────── */

/** Steg vars hinder finns kvar, utan två likadana i rad (efter borttagna hinder). */
export function liveSteps(steps: string[], existing: Set<string> | Map<string, unknown>): string[] {
  const out: string[] = [];
  for (const id of steps) {
    if (!existing.has(id)) continue;
    if (out[out.length - 1] === id) continue;
    out.push(id);
  }
  return out;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** "Övning A", "Övning B", … — första lediga bokstaven. */
export function nextExerciseName(existing: Array<{ name: string }>): string {
  const taken = new Set(existing.map((e) => e.name.trim().toLowerCase()));
  for (const l of LETTERS) {
    const name = `Övning ${l}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  return `Övning ${existing.length + 1}`;
}

/**
 * Lägg till ett steg i en övning. Ett klick på samma hinder som senast backar
 * ett steg (som numreringsläget); annars läggs hindret till — även om det
 * redan finns tidigare i övningen.
 */
export function toggleExerciseStep(steps: string[], id: string): string[] {
  if (steps[steps.length - 1] === id) return steps.slice(0, -1);
  if (steps.length >= EXERCISE_LIMITS.steps) return steps;
  return [...steps, id];
}

export interface ExerciseObstacleLike {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
  lengthM?: number;
}

/**
 * Övningen som en numrerad hinderlista (en post per steg) — samma form som
 * huvudbanan, så att hundlinje, avstånd, uppspelning och PDF kan återanvändas.
 * Id:n blir `<hinder-id>~<steg>` så att upprepade hinder hålls isär.
 */
export function exerciseSequence<T extends ExerciseObstacleLike>(
  steps: string[],
  obstacles: T[],
): Array<T & { number: number; sourceId: string }> {
  const byId = new Map(obstacles.map((o) => [o.id, o]));
  const live = liveSteps(steps, byId);
  return live.map((id, i) => {
    const ob = byId.get(id) as T;
    return { ...ob, id: `${id}~${i + 1}`, sourceId: id, number: i + 1 };
  });
}

/** Stegnummer per hinder, t.ex. { j1: [1, 6] } — för brickor med flera nummer. */
export function exerciseNumbersById(steps: string[], existing: Set<string>): Map<string, number[]> {
  const map = new Map<string, number[]>();
  liveSteps(steps, existing).forEach((id, i) => {
    const list = map.get(id) ?? [];
    list.push(i + 1);
    map.set(id, list);
  });
  return map;
}

/* ───────────── Geometri för förarlinjen ───────────── */

function perpendicularDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ramer–Douglas–Peucker: färre punkter med samma form (tolerans i meter). */
export function simplifyStroke(points: Vec2[], epsilon = 0.12): Vec2[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpendicularDistance(points[i], points[s], points[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > epsilon) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Avrunda och förenkla ett nyritat drag. Null om draget är för kort. */
export function finalizeStroke(raw: Vec2[], arena: ArenaLike): Vec2[] | null {
  const pts = raw
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ x: clamp(p.x, 0, arena.width), y: clamp(p.y, 0, arena.height) }));
  if (pts.length < 2) return null;
  if (polylineLength(pts) < 0.6) return null;
  const simplified = simplifyStroke(pts).slice(0, MARKUP_LIMITS.pointsPerStroke);
  const out: Vec2[] = [];
  for (const p of simplified) {
    const q = { x: round2(p.x), y: round2(p.y) };
    const last = out[out.length - 1];
    if (!last || last.x !== q.x || last.y !== q.y) out.push(q);
  }
  return out.length >= 2 ? out : null;
}

export function polylineLength(points: Vec2[]): number {
  let l = 0;
  for (let i = 1; i < points.length; i++) l += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return l;
}

/** Mjuk linje genom punkterna (Catmull-Rom, uniform) — samma kurva som ritas. */
export function smoothStrokePoints(points: Vec2[], samplesPerSegment = 6): Vec2[] {
  if (points.length < 3) return points.slice();
  const out: Vec2[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 1; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

/** SVG-path (kubiska Bézier) genom punkterna — motsvarar `smoothStrokePoints`. */
export function strokeToSvgD(points: Vec2[]): string {
  if (points.length === 0) return "";
  const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
  if (points.length === 1) return `M ${f(points[0].x)} ${f(points[0].y)}`;
  if (points.length === 2) return `M ${f(points[0].x)} ${f(points[0].y)} L ${f(points[1].x)} ${f(points[1].y)}`;
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** Skärningspunkt mellan två segment (exklusive ändpunkterna på b-sidan vid t=1). */
function segmentIntersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): Vec2 | null {
  const rx = a2.x - a1.x, ry = a2.y - a1.y;
  const sx = b2.x - b1.x, sy = b2.y - b1.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-12) return null;
  const qpx = b1.x - a1.x, qpy = b1.y - a1.y;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  if (t < 0 || t >= 1 || u < 0 || u >= 1) return null;
  return { x: a1.x + t * rx, y: a1.y + t * ry };
}

/**
 * Var korsar polyline `a` polyline `b`? Punkter närmare varandra än
 * `mergeM` slås ihop (en mjuk kurva kan annars ge dubbla träffar).
 */
export function findPolylineCrossings(a: Vec2[], b: Vec2[], mergeM = 0.6): Vec2[] {
  if (a.length < 2 || b.length < 2) return [];
  // Grov förfiltrering med segmentens boxar.
  const hits: Vec2[] = [];
  for (let i = 1; i < a.length; i++) {
    const a1 = a[i - 1], a2 = a[i];
    const minAx = Math.min(a1.x, a2.x), maxAx = Math.max(a1.x, a2.x);
    const minAy = Math.min(a1.y, a2.y), maxAy = Math.max(a1.y, a2.y);
    for (let j = 1; j < b.length; j++) {
      const b1 = b[j - 1], b2 = b[j];
      if (Math.max(b1.x, b2.x) < minAx || Math.min(b1.x, b2.x) > maxAx) continue;
      if (Math.max(b1.y, b2.y) < minAy || Math.min(b1.y, b2.y) > maxAy) continue;
      const p = segmentIntersection(a1, a2, b1, b2);
      if (p && !hits.some((h) => Math.hypot(h.x - p.x, h.y - p.y) < mergeM)) hits.push(p);
    }
  }
  return hits;
}

export interface MarkupStats {
  /** Förarens väg (m), summerad över alla drag. */
  handlerLengthM: number;
  /** Punkter där förarlinjen korsar hundens linje. */
  crossings: Vec2[];
  /** Antal markeringar per sort. */
  cueCounts: Record<CueKind, number>;
  /** Antal sidbyten (framför-, bakom- och blindbyten). */
  crossCues: number;
}

export function markupStats(markup: CourseMarkup | undefined, dogPathPoints: Vec2[]): MarkupStats {
  const cueCounts = Object.fromEntries(CUE_DEFS.map((d) => [d.kind, 0])) as Record<CueKind, number>;
  if (!markup) return { handlerLengthM: 0, crossings: [], cueCounts, crossCues: 0 };
  let handlerLengthM = 0;
  const crossings: Vec2[] = [];
  for (const s of markup.strokes) {
    const smooth = smoothStrokePoints(s.points);
    handlerLengthM += polylineLength(smooth);
    for (const p of findPolylineCrossings(smooth, dogPathPoints)) {
      if (!crossings.some((h) => Math.hypot(h.x - p.x, h.y - p.y) < 0.6)) crossings.push(p);
    }
  }
  for (const c of markup.cues) cueCounts[c.kind] += 1;
  const crossCues = cueCounts.front_cross + cueCounts.rear_cross + cueCounts.blind_cross;
  return { handlerLengthM, crossings, cueCounts, crossCues };
}

/** Minsta avstånd från punkten till polylinjen (m). */
export function distanceToPolyline(p: Vec2, points: Vec2[]): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, perpendicularDistance(p, points[i - 1], points[i]));
  return best;
}

/**
 * Det förardrag eller den markering som ligger närmast punkten (inom
 * `radius` m) — suddet tar bort ett i taget, så att ett tryck på linjen inte
 * också tar en markering som råkar ligga intill.
 */
export function nearestMarkupItem(
  markup: CourseMarkup | undefined,
  p: Vec2,
  radius: number,
): { kind: "stroke" | "cue"; id: string } | null {
  if (!markup) return null;
  let best: { kind: "stroke" | "cue"; id: string; d: number } | null = null;
  for (const s of markup.strokes) {
    const d = distanceToPolyline(p, smoothStrokePoints(s.points, 4));
    if (d <= radius && (!best || d < best.d)) best = { kind: "stroke", id: s.id, d };
  }
  // Markeringar är brickor med egen yta — lite större fångstradie.
  for (const c of markup.cues) {
    const d = Math.max(0, Math.hypot(c.x - p.x, c.y - p.y) - radius * 0.3);
    if (d <= radius && (!best || d < best.d)) best = { kind: "cue", id: c.id, d };
  }
  return best ? { kind: best.kind, id: best.id } : null;
}

/** Håll alla punkter inom ytan (efter ändrade banmått). */
export function clampMarkup(markup: CourseMarkup | undefined, arena: ArenaLike): CourseMarkup | undefined {
  if (!markup) return markup;
  const c = (p: Vec2) => ({ x: round2(clamp(p.x, 0, arena.width)), y: round2(clamp(p.y, 0, arena.height)) });
  return {
    strokes: markup.strokes.map((s) => ({ ...s, points: s.points.map(c) })),
    cues: markup.cues.map((cue) => ({ ...cue, ...c(cue) })),
  };
}

/** Radbryt en anteckning för SVG/PDF (ord hålls hela när det går). */
export function wrapNoteText(text: string, maxChars = 22, maxLines = 4): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const chunks = word.length > maxChars ? word.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [word] : [word];
      for (const chunk of chunks) {
        if (!line) line = chunk;
        else if ((line + " " + chunk).length <= maxChars) line += " " + chunk;
        else { lines.push(line); line = chunk; }
      }
    }
    lines.push(line);
  }
  const trimmed = lines.filter((l, i) => l || i < lines.length - 1);
  if (trimmed.length <= maxLines) return trimmed;
  const kept = trimmed.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(0, maxChars - 1))}…`;
  return kept;
}
