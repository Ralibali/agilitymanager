/**
 * Banplaneraren v2 — rena redigeringsoperationer.
 *
 * Allt här är fritt från React och DOM så att det kan enhetstestas. Editorn
 * (PlannerPage) anropar funktionerna och lägger resultatet i utkastet.
 *
 * Grundprinciper:
 *  - Hinderlistans ordning ÄR banordningen. Tävlande hinder numreras 1..N i
 *    listordning (`withNumbers`); start/mål/nummer/dirigeringsområde numreras
 *    aldrig.
 *  - Omordning byter bara plats på de tävlande hindren. Icke-tävlande hinder
 *    ligger kvar på sina platser i listan, så rit-/z-ordning ändras minimalt.
 *  - Låsta hinder flyttas, roteras och justeras aldrig.
 *  - Positioner hålls inom ytan med en marginal (samma som vid dragning).
 */
import { uid, type PlacedObstacle } from "@/lib/course";
import { buildDogPath, passageInsetM, type DogPathObstacle } from "./dogPath";
import { type ObstacleTypeV2 } from "./config";
import { normalizeCurveDeg, tunnelGeometryLocal } from "./tunnelGeometry";
import { obstacleSizeM } from "./obstacleSize";

export const NON_COMPETING = new Set<ObstacleTypeV2>(["start", "finish", "number", "handler_zone"]);

export const isCompeting = (ob: Pick<PlacedObstacle, "type">) => !NON_COMPETING.has(ob.type);

/** Marginal mot ytans kant när hinder flyttas (m). */
export const EDGE_MARGIN_M = 0.5;

export interface ArenaSize {
  width: number;
  height: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

/** 0,25 m-snäpp, samma som vid placering och dragning. */
export const snapM = (v: number) => Math.round(v * 4) / 4;

export const normalizeDeg = (deg: number) => ((Math.round(deg * 100) / 100) % 360 + 360) % 360;

export interface LocalBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Hindrets fotavtryck i lokala (oroterade) meter kring mittpunkten — samma
 * mått som ritas. Böjda tunnlar följer sin verkliga båge.
 */
export function obstacleLocalBounds(ob: Pick<PlacedObstacle, "type" | "curveDeg" | "curveSide" | "lengthM">): LocalBounds {
  const { w, d } = obstacleSizeM(ob);
  const bend = ob.type === "tunnel" ? normalizeCurveDeg(ob.curveDeg ?? 0) : 0;
  if (bend >= 1) {
    const pts = tunnelGeometryLocal(w, bend, ob.curveSide).centerline;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      minX: Math.min(...xs) - d / 2,
      maxX: Math.max(...xs) + d / 2,
      minY: Math.min(...ys) - d / 2,
      maxY: Math.max(...ys) + d / 2,
    };
  }
  return { minX: -w / 2, maxX: w / 2, minY: -d / 2, maxY: d / 2 };
}

/** Tilldela löpnummer 1..N till tävlande hinder i listordning. */
export function withNumbers(obstacles: PlacedObstacle[]): PlacedObstacle[] {
  let n = 0;
  return obstacles.map((ob) => (NON_COMPETING.has(ob.type) ? { ...ob, number: undefined } : { ...ob, number: ++n }));
}

/**
 * Lägg in en ny ordning för de tävlande hindren men låt icke-tävlande ligga
 * kvar på sina index. `competingOrder` måste innehålla exakt samma tävlande
 * hinder som `obstacles` (annars returneras listan orörd).
 */
export function replaceCompetingOrder(
  obstacles: PlacedObstacle[],
  competingOrder: PlacedObstacle[],
): PlacedObstacle[] {
  const current = obstacles.filter(isCompeting);
  if (current.length !== competingOrder.length) return obstacles;
  const ids = new Set(current.map((o) => o.id));
  if (!competingOrder.every((o) => ids.has(o.id))) return obstacles;
  let k = 0;
  return obstacles.map((ob) => (isCompeting(ob) ? competingOrder[k++] : ob));
}

/**
 * Numreringsläge: hindren i `sequenceIds` får nummer i klickordning.
 *
 * - `keepFirst` tävlande hinder (i nuvarande ordning) behåller sina nummer —
 *   används för "numrera om från #n".
 * - Klickade hinder följer direkt efter de behållna.
 * - Övriga tävlande hinder kommer sist, i sin tidigare inbördes ordning.
 */
export function applyNumberingSequence(
  obstacles: PlacedObstacle[],
  sequenceIds: string[],
  keepFirst = 0,
): PlacedObstacle[] {
  const competing = obstacles.filter(isCompeting);
  const byId = new Map(competing.map((o) => [o.id, o]));
  const seen = new Set<string>();
  const sequence: PlacedObstacle[] = [];
  for (const id of sequenceIds) {
    const ob = byId.get(id);
    if (!ob || seen.has(id)) continue;
    seen.add(id);
    sequence.push(ob);
  }
  const keep = clamp(Math.floor(keepFirst), 0, competing.length);
  const kept = competing.slice(0, keep).filter((o) => !seen.has(o.id));
  const keptIds = new Set(kept.map((o) => o.id));
  const remaining = competing.filter((o) => !seen.has(o.id) && !keptIds.has(o.id));
  return replaceCompetingOrder(obstacles, [...kept, ...sequence, ...remaining]);
}

/** Flytta ett tävlande hinder så att det får nummer `target` (1-baserat). */
export function moveToNumber(obstacles: PlacedObstacle[], id: string, target: number): PlacedObstacle[] {
  const competing = obstacles.filter(isCompeting);
  const idx = competing.findIndex((o) => o.id === id);
  if (idx < 0 || !Number.isFinite(target)) return obstacles;
  const to = clamp(Math.round(target), 1, competing.length) - 1;
  if (to === idx) return obstacles;
  const next = [...competing];
  const [moved] = next.splice(idx, 1);
  next.splice(to, 0, moved);
  return replaceCompetingOrder(obstacles, next);
}

/** Vänd hela banordningen (sista hindret blir nummer 1). */
export function reverseNumbering(obstacles: PlacedObstacle[]): PlacedObstacle[] {
  return replaceCompetingOrder(obstacles, [...obstacles.filter(isCompeting)].reverse());
}

/**
 * Begränsa en gruppförflyttning så att alla hinder i gruppen stannar inom
 * ytan. Gruppens inbördes form bevaras alltid.
 */
export function clampGroupDelta(
  items: Array<{ x: number; y: number }>,
  dx: number,
  dy: number,
  arena: ArenaSize,
  margin = EDGE_MARGIN_M,
): { dx: number; dy: number } {
  if (items.length === 0) return { dx: 0, dy: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of items) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const loX = margin - minX, hiX = arena.width - margin - maxX;
  const loY = margin - minY, hiY = arena.height - margin - maxY;
  return {
    dx: loX > hiX ? 0 : clamp(dx, loX, hiX),
    dy: loY > hiY ? 0 : clamp(dy, loY, hiY),
  };
}

/** Flytta alla olåsta hinder i `ids` lika långt (gruppen hålls inom ytan). */
export function translateObstacles(
  obstacles: PlacedObstacle[],
  ids: Iterable<string>,
  dx: number,
  dy: number,
  arena: ArenaSize,
): PlacedObstacle[] {
  const set = new Set(ids);
  const moving = obstacles.filter((o) => set.has(o.id) && !o.locked);
  if (moving.length === 0) return obstacles;
  const d = clampGroupDelta(moving, dx, dy, arena);
  if (Math.abs(d.dx) < 1e-9 && Math.abs(d.dy) < 1e-9) return obstacles;
  return obstacles.map((o) =>
    set.has(o.id) && !o.locked ? { ...o, x: round2(o.x + d.dx), y: round2(o.y + d.dy) } : o,
  );
}

/** Tyngdpunkt (medelvärde av mittpunkter). */
export function centroid(items: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (items.length === 0) return { x: 0, y: 0 };
  const sx = items.reduce((s, p) => s + p.x, 0);
  const sy = items.reduce((s, p) => s + p.y, 0);
  return { x: sx / items.length, y: sy / items.length };
}

/**
 * Rotera markerade hinder. Ett hinder roteras på stället; flera hinder
 * roteras som en grupp kring sin gemensamma mittpunkt (positioner + vinklar).
 */
export function rotateObstacles(
  obstacles: PlacedObstacle[],
  ids: Iterable<string>,
  deltaDeg: number,
  arena: ArenaSize,
): PlacedObstacle[] {
  const set = new Set(ids);
  const moving = obstacles.filter((o) => set.has(o.id) && !o.locked);
  if (moving.length === 0 || deltaDeg % 360 === 0) return obstacles;
  if (moving.length === 1) {
    const id = moving[0].id;
    return obstacles.map((o) => (o.id === id ? { ...o, rotation: normalizeDeg(o.rotation + deltaDeg) } : o));
  }
  const c = centroid(moving);
  const rad = (deltaDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return obstacles.map((o) => {
    if (!set.has(o.id) || o.locked) return o;
    const rx = o.x - c.x, ry = o.y - c.y;
    return {
      ...o,
      x: round2(clamp(c.x + rx * cos - ry * sin, EDGE_MARGIN_M, arena.width - EDGE_MARGIN_M)),
      y: round2(clamp(c.y + rx * sin + ry * cos, EDGE_MARGIN_M, arena.height - EDGE_MARGIN_M)),
      rotation: normalizeDeg(o.rotation + deltaDeg),
    };
  });
}

/** Sätt en exakt vinkel på ett hinder (0–359°). */
export function setRotation(obstacles: PlacedObstacle[], id: string, deg: number): PlacedObstacle[] {
  if (!Number.isFinite(deg)) return obstacles;
  return obstacles.map((o) => (o.id === id && !o.locked ? { ...o, rotation: normalizeDeg(deg) } : o));
}

/** Sätt en exakt position på ett hinder (hålls inom ytan). */
export function setPosition(
  obstacles: PlacedObstacle[],
  id: string,
  pos: { x?: number; y?: number },
  arena: ArenaSize,
): PlacedObstacle[] {
  return obstacles.map((o) => {
    if (o.id !== id || o.locked) return o;
    const x = pos.x !== undefined && Number.isFinite(pos.x) ? pos.x : o.x;
    const y = pos.y !== undefined && Number.isFinite(pos.y) ? pos.y : o.y;
    return {
      ...o,
      x: round2(clamp(x, EDGE_MARGIN_M, arena.width - EDGE_MARGIN_M)),
      y: round2(clamp(y, EDGE_MARGIN_M, arena.height - EDGE_MARGIN_M)),
    };
  });
}

/** Klipp/kopiera: ett fristående utdrag av hinder (utan id, nummer och lås). */
export type ClipboardItem = Omit<PlacedObstacle, "id" | "number" | "locked">;

export function copyObstacles(obstacles: PlacedObstacle[], ids: Iterable<string>): ClipboardItem[] {
  const set = new Set(ids);
  return obstacles
    .filter((o) => set.has(o.id))
    .map((o) => {
      const item: Partial<PlacedObstacle> = { ...o };
      delete item.id;
      delete item.number;
      delete item.locked;
      return item as ClipboardItem;
    });
}

/**
 * Lägg in kopior (från urklipp eller duplicering) förskjutna `offset` meter.
 * Kopiorna hamnar sist i banordningen och returneras med nya id:n.
 */
export function pasteObstacles(
  obstacles: PlacedObstacle[],
  items: ClipboardItem[],
  arena: ArenaSize,
  offset: { dx: number; dy: number } = { dx: 2, dy: 2 },
): { obstacles: PlacedObstacle[]; newIds: string[] } {
  if (items.length === 0) return { obstacles, newIds: [] };
  // Lägg först in gruppen inom ytan (urklipp kan komma från en större yta),
  // förskjut den sedan så långt det går.
  const inside = items.map((it) => ({
    ...it,
    x: clamp(it.x, EDGE_MARGIN_M, arena.width - EDGE_MARGIN_M),
    y: clamp(it.y, EDGE_MARGIN_M, arena.height - EDGE_MARGIN_M),
  }));
  const d = clampGroupDelta(inside, offset.dx, offset.dy, arena);
  const copies: PlacedObstacle[] = inside.map((it) => ({
    ...it,
    id: uid(),
    x: round2(it.x + d.dx),
    y: round2(it.y + d.dy),
    locked: false,
  }));
  return { obstacles: [...obstacles, ...copies], newIds: copies.map((c) => c.id) };
}

export function duplicateObstacles(
  obstacles: PlacedObstacle[],
  ids: Iterable<string>,
  arena: ArenaSize,
): { obstacles: PlacedObstacle[]; newIds: string[] } {
  return pasteObstacles(obstacles, copyObstacles(obstacles, ids), arena);
}

/** Ta bort markerade hinder — låsta hinder ligger kvar. */
export function deleteObstacles(obstacles: PlacedObstacle[], ids: Iterable<string>): PlacedObstacle[] {
  const set = new Set(ids);
  return obstacles.filter((o) => !set.has(o.id) || o.locked);
}

/** Lås alla om något är olåst, annars lås upp alla. */
export function toggleLock(obstacles: PlacedObstacle[], ids: Iterable<string>): PlacedObstacle[] {
  const set = new Set(ids);
  const targets = obstacles.filter((o) => set.has(o.id));
  if (targets.length === 0) return obstacles;
  const lock = targets.some((o) => !o.locked);
  return obstacles.map((o) => (set.has(o.id) ? { ...o, locked: lock } : o));
}

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

/** Justera mittpunkterna för markerade (olåsta) hinder längs en linje. */
export function alignObstacles(obstacles: PlacedObstacle[], ids: Iterable<string>, mode: AlignMode): PlacedObstacle[] {
  const set = new Set(ids);
  const items = obstacles.filter((o) => set.has(o.id) && !o.locked);
  if (items.length < 2) return obstacles;
  const xs = items.map((o) => o.x);
  const ys = items.map((o) => o.y);
  const c = centroid(items);
  const target =
    mode === "left" ? Math.min(...xs)
      : mode === "right" ? Math.max(...xs)
        : mode === "hcenter" ? c.x
          : mode === "top" ? Math.min(...ys)
            : mode === "bottom" ? Math.max(...ys)
              : c.y;
  const horizontalAxis = mode === "left" || mode === "right" || mode === "hcenter";
  return obstacles.map((o) => {
    if (!set.has(o.id) || o.locked) return o;
    return horizontalAxis ? { ...o, x: round2(target) } : { ...o, y: round2(target) };
  });
}

/** Fördela markerade (olåsta) hinder med jämna mellanrum längs x eller y. */
export function distributeObstacles(obstacles: PlacedObstacle[], ids: Iterable<string>, axis: "x" | "y"): PlacedObstacle[] {
  const set = new Set(ids);
  const items = obstacles.filter((o) => set.has(o.id) && !o.locked);
  if (items.length < 3) return obstacles;
  const sorted = [...items].sort((a, b) => a[axis] - b[axis] || a.id.localeCompare(b.id));
  const first = sorted[0][axis];
  const last = sorted[sorted.length - 1][axis];
  const step = (last - first) / (sorted.length - 1);
  const pos = new Map(sorted.map((o, i) => [o.id, round2(first + step * i)]));
  return obstacles.map((o) => (pos.has(o.id) ? { ...o, [axis]: pos.get(o.id) as number } : o));
}

/** Id:n för hinder vars mittpunkt ligger inom rektangeln (valfri hörnordning). */
export function idsInRect(
  obstacles: PlacedObstacle[],
  a: { x: number; y: number },
  b: { x: number; y: number },
): string[] {
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
  return obstacles.filter((o) => o.x >= minX && o.x <= maxX && o.y >= minY && o.y <= maxY).map((o) => o.id);
}

/** Närmaste hinder inom `radius` meter från punkten (för måttbandets snäpp). */
export function nearestObstacle(
  obstacles: PlacedObstacle[],
  p: { x: number; y: number },
  radius: number,
): PlacedObstacle | null {
  let best: PlacedObstacle | null = null;
  let bestD = radius;
  for (const o of obstacles) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d <= bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

export interface SegmentLabel {
  fromId: string;
  toId: string;
  fromNumber: number | "Start";
  toNumber: number | "Mål";
  /** Rakt avstånd mitt–mitt. */
  centerDistanceM: number;
  /**
   * Längs den beräknade hundlinjen, från passagepunkt till passagepunkt
   * (ribba/ring/hinderände) — samma mått som regelkontrollen använder.
   */
  pathDistanceM: number;
  /** Etikettens position: mitt på hundlinjens luftsegment. */
  x: number;
  y: number;
  /** Enhetsnormal till linjen vid etiketten (för att flytta den ur vägen). */
  nx: number;
  ny: number;
}

/**
 * Avståndsetiketter mellan på varandra följande hinder. Etiketten placeras
 * mitt på det luftsegment som ritas i editorn, så att den hamnar på linjen.
 */
export function computeSegmentLabels(numbered: PlacedObstacle[]): SegmentLabel[] {
  const competing = numbered
    .filter((o) => o.number != null)
    .sort((a, b) => (a.number as number) - (b.number as number));
  if (competing.length === 0) return [];
  const path = buildDogPath(
    competing.map<DogPathObstacle>((o) => ({
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      rotation: o.rotation,
      number: o.number ?? null,
      curveDeg: o.curveDeg,
      curveSide: o.curveSide,
      lengthM: o.lengthM,
    })),
  );
  const ranges = path.airRanges ?? [];
  const labels: SegmentLabel[] = [];
  for (let i = 0; i < competing.length - 1; i++) {
    const a = competing[i];
    const b = competing[i + 1];
    const range = ranges[i];
    let x = (a.x + b.x) / 2;
    let y = (a.y + b.y) / 2;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    let pathDistanceM = 0;
    if (range && range.endIdx > range.startIdx) {
      const lens: number[] = [];
      for (let k = range.startIdx; k < range.endIdx; k++) {
        const p = path.points[k], q = path.points[k + 1];
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        lens.push(len);
        pathDistanceM += len;
      }
      // Punkt halvvägs längs segmentet.
      let acc = 0;
      const half = pathDistanceM / 2;
      for (let k = 0; k < lens.length; k++) {
        if (acc + lens[k] >= half || k === lens.length - 1) {
          const p = path.points[range.startIdx + k];
          const q = path.points[range.startIdx + k + 1];
          const t = lens[k] > 0 ? clamp((half - acc) / lens[k], 0, 1) : 0;
          x = p.x + (q.x - p.x) * t;
          y = p.y + (q.y - p.y) * t;
          if (lens[k] > 0) {
            tx = q.x - p.x;
            ty = q.y - p.y;
          }
          break;
        }
        acc += lens[k];
      }
    }
    labels.push({
      fromId: a.id,
      toId: b.id,
      fromNumber: a.number as number,
      toNumber: b.number as number,
      centerDistanceM: Math.hypot(b.x - a.x, b.y - a.y),
      pathDistanceM: pathDistanceM + passageInsetM(a) + passageInsetM(b),
      x,
      y,
      nx: -ty / (Math.hypot(tx, ty) || 1),
      ny: tx / (Math.hypot(tx, ty) || 1),
    });
  }
  const start = numbered.find(o => o.type === "start");
  const finish = numbered.find(o => o.type === "finish");
  const first = path.anchors[0];
  const last = path.anchors.at(-1)!;
  const addBoundary = (a: { x: number; y: number }, b: { x: number; y: number }, fromId: string, toId: string, fromNumber: SegmentLabel["fromNumber"], toNumber: SegmentLabel["toNumber"], inset: number) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    labels.push({ fromId, toId, fromNumber, toNumber, pathDistanceM: d + inset, centerDistanceM: d + inset,
      x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, nx: -dy / (d || 1), ny: dx / (d || 1) });
  };
  if (start) addBoundary(start, first.entry, start.id, competing[0].id, "Start", competing[0].number!, passageInsetM(competing[0]));
  if (finish) addBoundary(last.exit, finish, competing.at(-1)!.id, finish.id, competing.at(-1)!.number!, "Mål", passageInsetM(competing.at(-1)!));
  return labels;
}

/**
 * Flytta etiketter som hamnar på ett nummer: prova lägen längs linjens
 * normal och välj det som ligger längst från närmaste nummer. `clearance`
 * är minsta önskade avstånd mellan etikettens och numrets mitt.
 */
export function placeLabelsAwayFrom<T extends { x: number; y: number; nx: number; ny: number }>(
  labels: T[],
  obstaclesToAvoid: Array<{ x: number; y: number }>,
  clearance: number,
  step: number,
): Array<T & { lx: number; ly: number }> {
  const minDist = (x: number, y: number) =>
    obstaclesToAvoid.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);
  return labels.map((lab) => {
    let best = { lx: lab.x, ly: lab.y, d: minDist(lab.x, lab.y) };
    if (best.d >= clearance) return { ...lab, lx: best.lx, ly: best.ly };
    for (const k of [1, -1, 2, -2]) {
      const lx = lab.x + lab.nx * step * k;
      const ly = lab.y + lab.ny * step * k;
      const d = minDist(lx, ly);
      if (d > best.d + 1e-6) best = { lx, ly, d };
      if (d >= clearance) break;
    }
    return { ...lab, lx: best.lx, ly: best.ly };
  });
}

/** "5,25 m" — svensk decimal, en eller två decimaler beroende på värde. */
export function formatMeters(m: number, decimals = 1): string {
  return `${m.toFixed(decimals).replace(".", ",")} m`;
}
