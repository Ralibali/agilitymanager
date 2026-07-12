/**
 * Rena geometry-helpers för banplaneraren.
 *
 * Extraherade så att bounds/clamping-logiken kan enhetstestas och delas
 * mellan V3CoursePlannerV2Page, validation.ts och framtida mobil-komponenter.
 * Inga UI-beroenden — pure TypeScript, deterministiska funktioner.
 */

export interface Point {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RotatedBox {
  /** Fyra hörn i kurs-koordinater efter rotation kring center. */
  corners: [Point, Point, Point, Point];
  /** Axel-parallell hölje kring den roterade rektangeln. */
  aabb: AABB;
}

/**
 * Beräknar bounding-boxen (både roterade hörn och AABB) för ett hinder
 * med storlek `widthM × depthM` (i kurs-koord X/Y) roterat `rotationDeg`
 * grader kring `(x, y)`.
 */
export function computeRotatedBox(
  center: Point,
  widthM: number,
  depthM: number,
  rotationDeg: number,
): RotatedBox {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = widthM / 2;
  const hd = depthM / 2;
  // Lokala hörn (relativa till center) — clockwise från top-left.
  const local: Point[] = [
    { x: -hw, y: -hd },
    { x: +hw, y: -hd },
    { x: +hw, y: +hd },
    { x: -hw, y: +hd },
  ];
  const corners = local.map<Point>((p) => ({
    x: center.x + p.x * cos - p.y * sin,
    y: center.y + p.x * sin + p.y * cos,
  })) as [Point, Point, Point, Point];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of corners) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { corners, aabb: { minX, maxX, minY, maxY } };
}

/**
 * Snabbare variant som bara returnerar AABB. Använder Math.abs-triangelolikhet
 * — samma resultat som `computeRotatedBox(...).aabb` men utan att räkna hörn.
 */
export function rotatedAabb(
  center: Point,
  widthM: number,
  depthM: number,
  rotationDeg: number,
): AABB {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = (widthM * cos + depthM * sin) / 2;
  const halfH = (widthM * sin + depthM * cos) / 2;
  return {
    minX: center.x - halfW,
    maxX: center.x + halfW,
    minY: center.y - halfH,
    maxY: center.y + halfH,
  };
}

export function aabbsOverlap(a: AABB, b: AABB): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
}

/**
 * Vilken (eller vilka) kant(er) på arenan som en AABB överskrider.
 * Returnerar en lista med sidor och överskridande belopp i meter så att
 * validation.ts kan säga exakt vilken kant som är problemet.
 */
export type ArenaEdge = "vänster" | "höger" | "topp" | "botten";

export interface EdgeExceedance {
  edge: ArenaEdge;
  /** Positivt antal meter utanför den kanten. */
  overshootM: number;
}

export function edgesOutsideArena(
  aabb: AABB,
  arenaWidthM: number,
  arenaHeightM: number,
  marginM = 0,
): EdgeExceedance[] {
  const list: EdgeExceedance[] = [];
  if (aabb.minX < marginM) list.push({ edge: "vänster", overshootM: marginM - aabb.minX });
  if (aabb.maxX > arenaWidthM - marginM)
    list.push({ edge: "höger", overshootM: aabb.maxX - (arenaWidthM - marginM) });
  if (aabb.minY < marginM) list.push({ edge: "topp", overshootM: marginM - aabb.minY });
  if (aabb.maxY > arenaHeightM - marginM)
    list.push({ edge: "botten", overshootM: aabb.maxY - (arenaHeightM - marginM) });
  return list;
}

/**
 * Klampa ett hinder-center så att HELA den roterade bounding-boxen ligger
 * inom [0, arenaWidthM] × [0, arenaHeightM]. Om hindret är större än arenan
 * i någon dimension centreras det i den dimensionen istället.
 */
export function clampCenterForRotatedBox(
  desiredCenter: Point,
  widthM: number,
  depthM: number,
  rotationDeg: number,
  arenaWidthM: number,
  arenaHeightM: number,
): Point {
  const aabb = rotatedAabb(desiredCenter, widthM, depthM, rotationDeg);
  const bboxWidth = aabb.maxX - aabb.minX;
  const bboxHeight = aabb.maxY - aabb.minY;
  let x = desiredCenter.x;
  let y = desiredCenter.y;
  if (bboxWidth >= arenaWidthM) {
    x = arenaWidthM / 2;
  } else {
    const minCenterX = bboxWidth / 2;
    const maxCenterX = arenaWidthM - bboxWidth / 2;
    x = Math.max(minCenterX, Math.min(maxCenterX, x));
  }
  if (bboxHeight >= arenaHeightM) {
    y = arenaHeightM / 2;
  } else {
    const minCenterY = bboxHeight / 2;
    const maxCenterY = arenaHeightM - bboxHeight / 2;
    y = Math.max(minCenterY, Math.min(maxCenterY, y));
  }
  return { x, y };
}

/** Snap ett meter-värde till närmaste `stepM`. */
export function snapToGrid(valueM: number, stepM: number): number {
  if (stepM <= 0) return valueM;
  return Math.round(valueM / stepM) * stepM;
}
