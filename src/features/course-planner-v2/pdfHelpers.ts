/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Delade vektor-renderingsfunktioner för Domar-/Tränings-/Bygg-PDF.
 *
 * Allt ritas med jsPDF-primitiver så att utskriften är skarp i alla zoom-nivåer.
 * Inga screenshots, ingen rasterisering.
 */
import type jsPDF from "jspdf";
import { getObstacleDefV2, type ObstacleTypeV2 } from "./config";
import { obstacleSizeM } from "./obstacleSize";
import type { ObstacleLite } from "./validation";
import { normalizeCurveDeg, toWorld, tunnelEdgesLocal } from "./tunnelGeometry";
import { buildDogPath } from "./dogPath";
import {
  CUE_DEFS, findPolylineCrossings, smoothStrokePoints, wrapNoteText,
  type CourseMarkup, type CueKind, type Vec2,
} from "./courseExtras";

/** Färgpalett som matchar appens "Varm Sand"-tema. */
export const PDF_BRAND = {
  primary: [26, 107, 60] as [number, number, number],     // #1a6b3c forest
  primaryLight: [200, 220, 200] as [number, number, number],
  secondary: [200, 93, 30] as [number, number, number],   // #c85d1e ember
  ink: [23, 61, 44] as [number, number, number],          // #173d2c
  text: [30, 30, 30] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  line: [225, 225, 225] as [number, number, number],
  arenaFill: [220, 229, 207] as [number, number, number], // #dce5cf
  arenaBorder: [23, 61, 44] as [number, number, number],
  gridFine: [23, 61, 44] as [number, number, number],
  warning: [180, 120, 30] as [number, number, number],
  error: [190, 60, 60] as [number, number, number],
};

export const PDF_PAGE = {
  /** A4 portrait i mm. */
  width: 210,
  height: 297,
  margin: 12,
};

export interface ArenaRenderOpts {
  /** Översta vänstra hörnet i mm. */
  x: number;
  y: number;
  /** Tillgängligt utrymme i mm (höjd anpassas till banans aspect). */
  maxWidth: number;
  maxHeight: number;
  arenaWidthM: number;
  arenaHeightM: number;
  obstacles: ObstacleLite[];
  /** Visa rutnätslinjer (1m + 5m). Default true. */
  grid?: boolean;
  /** Visa banlinje mellan numrerade hinder. Default true. */
  showPath?: boolean;
  /** Skala på nummer-brickor (i mm). Default ~3. */
  numberBadgeMm?: number;
  /** Visa banmått (yttre linjaler med tickmarks). Default true. */
  showDimensions?: boolean;
  /**
   * Egen sekvens (övning): hundlinjen ritas från den i stället för från
   * hindrens nummer. Brickornas text kommer då från `badgeTexts`.
   */
  sequence?: ObstacleLite[];
  /** Brickornas text per hinder-id (t.ex. "2·6" när ett hinder tas två gånger). */
  badgeTexts?: Map<string, string>;
  /** Förarplan (förarlinje + markeringar) att rita ovanpå banan. */
  markup?: CourseMarkup;
}

/**
 * Returnerar ritade mått i mm — `h` inkluderar linjalmarginalen ovanför
 * banan, så att anroparen kan fortsätta direkt under bilden.
 */
export function drawArenaVector(doc: jsPDF, opts: ArenaRenderOpts): { w: number; h: number; mmPerM: number } {
  const { x: x0, y: y0, maxWidth, maxHeight, arenaWidthM, arenaHeightM, obstacles } = opts;
  const grid = opts.grid !== false;
  const showPath = opts.showPath !== false;
  const numberBadge = opts.numberBadgeMm ?? 3;
  const showDim = opts.showDimensions !== false;
  // Reservera plats för linjaler/dimensioner (vänster + topp).
  const dimMargin = showDim ? 8 : 0;

  const x = x0 + dimMargin;
  const y = y0 + dimMargin;
  const availW = maxWidth - dimMargin;
  const availH = maxHeight - dimMargin;

  // Anpassa till tillgängligt utrymme bibehållande aspekt
  const aspect = arenaHeightM / arenaWidthM;
  let w = availW;
  let h = w * aspect;
  if (h > availH) {
    h = availH;
    w = h / aspect;
  }
  const mmPerM = w / arenaWidthM;
  const m2x = (mx: number) => x + mx * mmPerM;
  const m2y = (my: number) => y + my * mmPerM;

  // Ramyta
  doc.setFillColor(...PDF_BRAND.arenaFill);
  doc.setDrawColor(...PDF_BRAND.arenaBorder);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, "FD");

  // Banmått (linjaler med tickmarks) — alltid med i PDF om inte explicit avstängt.
  if (showDim) {
    drawArenaDimensions(doc, x, y, w, h, arenaWidthM, arenaHeightM);
  }

  // Rutnät
  if (grid) {
    doc.setDrawColor(...PDF_BRAND.gridFine);
    for (let i = 1; i < arenaWidthM; i++) {
      doc.setLineWidth(i % 5 === 0 ? 0.18 : 0.05);
      doc.line(m2x(i), y, m2x(i), y + h);
    }
    for (let i = 1; i < arenaHeightM; i++) {
      doc.setLineWidth(i % 5 === 0 ? 0.18 : 0.05);
      doc.line(x, m2y(i), x + w, m2y(i));
    }
  }

  // Hundens väg — exakt samma linje som i editorn (genom hindren, i nummerordning).
  const pathSource = opts.sequence ?? obstacles.filter((o) => o.number != null && !["start", "finish", "number", "handler_zone"].includes(o.type));
  const path = buildDogPath(pathSource);
  if (showPath) {
    if (path.points.length > 1) {
      doc.setDrawColor(...PDF_BRAND.secondary);
      doc.setLineWidth(0.6);
      doc.setLineDashPattern([1.5, 1], 0);
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1], b = path.points[i];
        doc.line(m2x(a.x), m2y(a.y), m2x(b.x), m2y(b.y));
      }
      doc.setLineDashPattern([], 0);
    }
  }

  // Hinder + nummer — sortera på zIndex stigande, id som tiebreaker
  const sortedObstacles = [...obstacles].sort((a, b) => {
    const za = a.zIndex ?? 0;
    const zb = b.zIndex ?? 0;
    if (za !== zb) return za - zb;
    return a.id.localeCompare(b.id);
  });
  for (const ob of sortedObstacles) {
    drawObstacleVector(doc, ob, m2x, m2y, mmPerM);
  }

  // Förarlinjen ritas under brickorna men över hindren.
  if (opts.markup) drawMarkupStrokes(doc, opts.markup, m2x, m2y, mmPerM);

  // Nummer-brickor
  for (const ob of obstacles) {
    const text = opts.badgeTexts
      ? opts.badgeTexts.get(ob.id)
      : ob.number != null && !["start", "finish", "number"].includes(ob.type) ? String(ob.number) : undefined;
    if (!text) continue;
    const def = getObstacleDefV2(ob.type);
    if (!def) continue;
    const size = obstacleSizeM(ob);
    const offX = (size.w / 2 + 0.4) * mmPerM;
    const offY = (-size.d / 2 - 0.4) * mmPerM;
    const cx = m2x(ob.x) + offX;
    const cy = m2y(ob.y) + offY;
    doc.setFillColor(...(opts.badgeTexts ? HANDLER_RGB : PDF_BRAND.ink));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(numberBadge * 2.6);
    if (text.length <= 2) {
      doc.circle(cx, cy, numberBadge, "F");
    } else {
      const bw = Math.max(numberBadge * 2, doc.getTextWidth(text) + numberBadge * 1.1);
      doc.roundedRect(cx - bw / 2, cy - numberBadge, bw, numberBadge * 2, numberBadge, numberBadge, "F");
    }
    doc.setTextColor(255, 255, 255);
    doc.text(text, cx, cy + numberBadge * 0.45, { align: "center" });
  }

  if (opts.markup) {
    const crossings = opts.markup.strokes.flatMap((st) => findPolylineCrossings(smoothStrokePoints(st.points), path.points));
    drawMarkupCues(doc, opts.markup, crossings, m2x, m2y, mmPerM);
  }

  return { w, h: h + dimMargin, mmPerM };
}

/* ───────────── Förarplan i PDF ───────────── */

const HANDLER_RGB: [number, number, number] = [29, 78, 216];
const CROSSING_RGB: [number, number, number] = [190, 18, 60];

function drawPolyline(doc: jsPDF, pts: Array<{ x: number; y: number }>) {
  for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
}

function drawMarkupStrokes(
  doc: jsPDF,
  markup: CourseMarkup,
  m2x: (m: number) => number,
  m2y: (m: number) => number,
  mmPerM: number,
) {
  doc.setDrawColor(...HANDLER_RGB);
  doc.setFillColor(...HANDLER_RGB);
  for (const stroke of markup.strokes) {
    const smooth = smoothStrokePoints(stroke.points).map((p) => ({ x: m2x(p.x), y: m2y(p.y) }));
    doc.setLineWidth(0.7);
    drawPolyline(doc, smooth);
    doc.circle(smooth[0].x, smooth[0].y, 0.8, "F");
    // Riktningspilar var ~3 m.
    let acc = 0;
    let next = 3 * mmPerM * 0.6;
    doc.setLineWidth(0.5);
    for (let i = 1; i < smooth.length; i++) {
      const a = smooth[i - 1];
      const b = smooth[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      while (seg > 0 && acc + seg >= next) {
        const t = (next - acc) / seg;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const s = 1.1;
        const back = (da: number) => ({ x: px - Math.cos(ang + da) * s, y: py - Math.sin(ang + da) * s });
        const l = back(0.6);
        const r = back(-0.6);
        doc.line(l.x, l.y, px, py);
        doc.line(r.x, r.y, px, py);
        next += 3 * mmPerM;
      }
      acc += seg;
    }
  }
}

function drawStar(doc: jsPDF, cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return { x: cx + Math.cos(rad) * rr, y: cy + Math.sin(rad) * rr };
  });
  const deltas = pts.slice(1).map((p, i) => [p.x - pts[i].x, p.y - pts[i].y]);
  doc.lines(deltas, pts[0].x, pts[0].y, [1, 1], "FD", true);
}

/** En markering (bricka/stjärna/lapp) centrerad i (cx, cy) mm. */
export function drawCueGlyphPdf(doc: jsPDF, kind: CueKind, cx: number, cy: number, r: number, text?: string) {
  const def = CUE_DEFS.find((d) => d.kind === kind);
  doc.setLineWidth(0.35);
  switch (kind) {
    case "reward":
      doc.setFillColor(245, 179, 1);
      doc.setDrawColor(...PDF_BRAND.text);
      drawStar(doc, cx, cy, r * 1.15);
      return;
    case "note": {
      const lines = wrapNoteText(text ?? "", 24, 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      const width = Math.max(14, ...lines.map((l) => doc.getTextWidth(l))) + 3;
      const height = lines.length * 2.8 + 2;
      doc.setFillColor(255, 243, 176);
      doc.setDrawColor(...PDF_BRAND.muted);
      doc.roundedRect(cx - width / 2, cy - height / 2, width, height, 0.8, 0.8, "FD");
      doc.setTextColor(...PDF_BRAND.text);
      lines.forEach((line, i) => doc.text(line, cx - width / 2 + 1.5, cy - height / 2 + 1 + 2.3 + i * 2.8));
      return;
    }
    default: {
      const filled = kind !== "rear_cross";
      doc.setDrawColor(...HANDLER_RGB);
      if (kind === "blind_cross") doc.setFillColor(15, 23, 42);
      else if (filled) doc.setFillColor(...HANDLER_RGB);
      else doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, r, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(r * 2.3);
      doc.setTextColor(...(filled ? ([255, 255, 255] as [number, number, number]) : HANDLER_RGB));
      doc.text(def?.short ?? "", cx, cy + r * 0.38, { align: "center" });
    }
  }
}

function drawMarkupCues(
  doc: jsPDF,
  markup: CourseMarkup,
  crossings: Vec2[],
  m2x: (m: number) => number,
  m2y: (m: number) => number,
  mmPerM: number,
) {
  const r = Math.max(1.6, Math.min(2.4, 0.55 * mmPerM));
  doc.setLineWidth(0.4);
  for (const c of crossings) {
    const cx = m2x(c.x), cy = m2y(c.y);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...CROSSING_RGB);
    doc.circle(cx, cy, r * 0.6, "FD");
    const k = r * 0.32;
    doc.line(cx - k, cy - k, cx + k, cy + k);
    doc.line(cx + k, cy - k, cx - k, cy + k);
  }
  for (const cue of markup.cues) drawCueGlyphPdf(doc, cue.kind, m2x(cue.x), m2y(cue.y), r, cue.text);
  doc.setTextColor(0);
}

/** Teckenförklaring för förarplanen — returnerar höjden i mm. */
export function drawMarkupLegend(doc: jsPDF, x: number, y: number, maxWidth: number, markup: CourseMarkup): number {
  const used = new Set(markup.cues.map((c) => c.kind));
  const items: Array<{ draw: (cx: number, cy: number) => void; label: string }> = [];
  if (markup.strokes.length) {
    items.push({
      label: "Förarlinje",
      draw: (cx, cy) => {
        doc.setDrawColor(...HANDLER_RGB);
        doc.setLineWidth(0.7);
        doc.line(cx - 3, cy, cx + 3, cy);
      },
    });
    items.push({
      label: "Korsar hundens linje",
      draw: (cx, cy) => {
        doc.setLineWidth(0.4);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...CROSSING_RGB);
        doc.circle(cx, cy, 1.2, "FD");
        doc.line(cx - 0.6, cy - 0.6, cx + 0.6, cy + 0.6);
        doc.line(cx + 0.6, cy - 0.6, cx - 0.6, cy + 0.6);
      },
    });
  }
  for (const def of CUE_DEFS) {
    if (!used.has(def.kind) || def.kind === "note") continue;
    items.push({ label: def.label, draw: (cx, cy) => drawCueGlyphPdf(doc, def.kind, cx, cy, 1.7) });
  }
  if (items.length === 0) return 0;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  let cx = x;
  let cy = y + 2.5;
  for (const it of items) {
    const wItem = 9 + doc.getTextWidth(it.label) + 5;
    if (cx + wItem > x + maxWidth) { cx = x; cy += 6; }
    it.draw(cx + 3.5, cy);
    doc.setTextColor(...PDF_BRAND.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(it.label, cx + 8, cy + 1);
    cx += wItem;
  }
  doc.setTextColor(0);
  return cy - y + 4;
}

/** Ritar ett enskilt hinder vektorbaserat. Skala = mmPerM. */
function drawObstacleVector(
  doc: jsPDF,
  ob: ObstacleLite,
  m2x: (m: number) => number,
  m2y: (m: number) => number,
  mmPerM: number,
) {
  const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
  if (!def) return;
  const cx = m2x(ob.x);
  const cy = m2y(ob.y);
  const size = obstacleSizeM(ob);
  const w = size.w * mmPerM;
  const d = size.d * mmPerM;

  // Rotation kring center via matrix-transform genom doc.advancedAPI är tungt;
  // för korthetens skull ritar vi rotationsoberoende silhuett (rektangel/ellips)
  // för långa/asymmetriska hinder och beräknar rotation manuellt.
  // jsPDF har ingen pushTransform, men vi kan använda matrisrotation via
  // saveGraphicsState + setMatrixTransformation (saknas i jsPDF). Vi approx
  // genom att rita roterad polygon för rektangulära hinder, cirkel för runda.

  doc.setLineWidth(0.25);
  doc.setDrawColor(...PDF_BRAND.ink);

  switch (def.type) {
    case "jump": case "wall": case "combo": case "longjump":
    case "table": case "start": case "finish":
    case "fence": case "handler_zone": {
      // Roterad rektangel
      const fill: [number, number, number] =
        def.type === "start" ? [200, 230, 200] :
        def.type === "finish" ? [230, 200, 200] :
        def.type === "longjump" ? [255, 240, 200] :
        def.type === "table" ? [240, 220, 200] :
        def.type === "handler_zone" ? [220, 230, 245] :
        [255, 255, 255];
      doc.setFillColor(...fill);
      drawRotatedRect(doc, cx, cy, w, d, ob.rotation, true);
      // Stolpar för hopphinder
      if (def.type === "jump" || def.type === "wall" || def.type === "combo") {
        doc.setFillColor(...PDF_BRAND.ink);
        const stub = 0.5;
        drawRotatedRect(doc, cx - (w / 2) * Math.cos((ob.rotation * Math.PI) / 180), 0, 0, 0, 0, false);
        // Ritar två små markörer vid kortändarna
        const ang = (ob.rotation * Math.PI) / 180;
        const ux = Math.cos(ang), uy = Math.sin(ang);
        for (const sign of [-1, 1]) {
          const px = cx + sign * (w / 2) * ux;
          const py = cy + sign * (w / 2) * uy;
          doc.circle(px, py, stub, "F");
        }
      }
      break;
    }
    case "tire": case "hoop": case "barrel": {
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, w / 2, "FD");
      if (def.type === "tire") {
        doc.setDrawColor(...PDF_BRAND.ink);
        doc.circle(cx, cy, w / 4);
      }
      break;
    }
    case "tunnel": {
      const curveDeg = normalizeCurveDeg(ob.curveDeg ?? 0);
      doc.setFillColor(245, 235, 215);
      if (curveDeg < 1) {
        drawRotatedRoundedRect(doc, cx, cy, w, d, ob.rotation, Math.min(d, w) / 2.2, true);
      } else {
        // Böjd tunnel — exakt samma cirkelbåge som i editorn och hundvägen.
        const { top, bottom } = tunnelEdgesLocal(w, d, curveDeg, ob.curveSide);
        const outline = [...top, ...[...bottom].reverse()].map((p) =>
          toWorld(p, cx, cy, ob.rotation),
        );
        const deltas: number[][] = [];
        for (let i = 1; i < outline.length; i++) {
          deltas.push([outline[i].x - outline[i - 1].x, outline[i].y - outline[i - 1].y]);
        }
        deltas.push([outline[0].x - outline[outline.length - 1].x, outline[0].y - outline[outline.length - 1].y]);
        doc.lines(deltas, outline[0].x, outline[0].y, [1, 1], "FD", true);
      }
      break;
    }

    case "weave_8": case "weave_10": case "weave_12": {
      const count = def.type === "weave_8" ? 8 : def.type === "weave_10" ? 10 : 12;
      const ang = (ob.rotation * Math.PI) / 180;
      const dirX = Math.sin(ang), dirY = -Math.cos(ang); // riktning längs djup-axeln
      const total = d;
      doc.setFillColor(...PDF_BRAND.ink);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count - 0.5;
        const px = cx + dirX * total * t;
        const py = cy + dirY * total * t;
        doc.circle(px, py, 0.4, "F");
      }
      // streckad vägledningslinje
      doc.setDrawColor(...PDF_BRAND.muted);
      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.line(
        cx - dirX * total / 2, cy - dirY * total / 2,
        cx + dirX * total / 2, cy + dirY * total / 2,
      );
      doc.setLineDashPattern([], 0);
      break;
    }
    case "aframe": case "dogwalk": case "seesaw": {
      const fill: [number, number, number] =
        def.type === "aframe" ? [240, 200, 180] :
        def.type === "dogwalk" ? [220, 220, 220] :
        [220, 200, 220];
      doc.setFillColor(...fill);
      drawRotatedRect(doc, cx, cy, w, d, ob.rotation, true);
      // Kontaktfält i ändarna (gult)
      if (def.hasContactZone) {
        const ang = (ob.rotation * Math.PI) / 180;
        const dirX = Math.sin(ang), dirY = -Math.cos(ang);
        const zoneLen = Math.min(d * 0.15, mmPerM * 0.9);
        doc.setFillColor(255, 215, 0);
        for (const sign of [-1, 1]) {
          const cx2 = cx + dirX * (d / 2 - zoneLen / 2) * sign;
          const cy2 = cy + dirY * (d / 2 - zoneLen / 2) * sign;
          drawRotatedRect(doc, cx2, cy2, w, zoneLen, ob.rotation, true);
        }
      }
      break;
    }
    case "number": {
      doc.setFillColor(...PDF_BRAND.secondary);
      doc.circle(cx, cy, Math.max(w, d) / 2, "F");
      break;
    }
    default: {
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, Math.max(w, d) / 2, "FD");
    }
  }

  // Etikett för start/mål
  if (def.type === "start" || def.type === "finish") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(...PDF_BRAND.ink);
    doc.text(def.type === "start" ? "S" : "M", cx, cy + 1, { align: "center" });
  }
}

/** Ritar en roterad rektangel som polygon. */
function drawRotatedRect(
  doc: jsPDF, cx: number, cy: number, w: number, d: number, rotDeg: number, fill: boolean,
) {
  if (w <= 0 || d <= 0) return;
  const r = (rotDeg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  const hw = w / 2, hd = d / 2;
  const corners: [number, number][] = [
    [-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd],
  ].map(([px, py]) => [cx + px * c - py * s, cy + px * s + py * c]);
  // jsPDF saknar polygon — använd lines/triangles
  const lines: [number, number][] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length];
    lines.push([b[0] - a[0], b[1] - a[1]]);
  }
  if (fill) {
    doc.lines(lines, corners[0][0], corners[0][1], [1, 1], "FD", true);
  } else {
    doc.lines(lines, corners[0][0], corners[0][1], [1, 1], "S", true);
  }
}

/** Approximerar roterad rounded-rect via rotated rect (rundning ignoreras vid extrema vinklar). */
function drawRotatedRoundedRect(
  doc: jsPDF, cx: number, cy: number, w: number, d: number, rotDeg: number, _radius: number, fill: boolean,
) {
  // För enkelhet: rita roterad rektangel + två cirklar i ändarna för rundning
  drawRotatedRect(doc, cx, cy, w, d, rotDeg, fill);
  const r = (rotDeg * Math.PI) / 180;
  const dirX = Math.cos(r), dirY = Math.sin(r);
  const halfW = w / 2;
  for (const sign of [-1, 1]) {
    const ex = cx + sign * halfW * dirX;
    const ey = cy + sign * halfW * dirY;
    if (fill) doc.circle(ex, ey, d / 2, "FD");
    else doc.circle(ex, ey, d / 2, "S");
  }
}

/* ───────────── Header / footer ───────────── */

export function drawHeaderBand(doc: jsPDF, opts: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  doc.setFillColor(...PDF_BRAND.primary);
  doc.rect(0, 0, PDF_PAGE.width, 22, "F");
  doc.setFillColor(...PDF_BRAND.secondary);
  doc.rect(0, 22, PDF_PAGE.width, 1.2, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(opts.title, PDF_PAGE.margin, 11);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(opts.subtitle, PDF_PAGE.margin, 17);
  }
  if (opts.badge) {
    doc.setFillColor(255, 255, 255);
    const w = doc.getTextWidth(opts.badge) + 6;
    doc.roundedRect(PDF_PAGE.width - PDF_PAGE.margin - w, 6, w, 8, 2, 2, "F");
    doc.setTextColor(...PDF_BRAND.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(opts.badge, PDF_PAGE.width - PDF_PAGE.margin - w / 2, 11.5, { align: "center" });
  }
  doc.setTextColor(0);
}


/**
 * Diagonalt vattenmärke tvärs över sidan.
 * Ritas på varje sida för gratisexporter.
 */
export function drawDiagonalWatermark(doc: jsPDF, label = "agilitymanager.se") {
  const gs = (doc as unknown as {
    GState?: (o: { opacity: number }) => unknown;
    setGState?: (s: unknown) => void;
  });
  const hasGState = typeof gs.GState === "function" && typeof gs.setGState === "function";
  if (hasGState) gs.setGState!(gs.GState!({ opacity: 0.09 }));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.setTextColor(...PDF_BRAND.primary);
  doc.text(label, PDF_PAGE.width / 2, PDF_PAGE.height / 2, {
    align: "center",
    baseline: "middle",
    angle: 30,
  });
  if (hasGState) gs.setGState!(gs.GState!({ opacity: 1 }));
  doc.setTextColor(0);
}


/**
 * Renderar footer på alla sidor i dokumentet.
 * Anropa SIST efter att alla sidor är ritade.
 */
export function drawFooterAllPages(
  doc: jsPDF,
  opts: {
    authorName: string;
    /** PNG dataURL för QR-kod som ritas i nedre vänstra hörnet på sida 1. */
    qrDataUrl?: string;
    /** Egen placering (mm, övre vänstra hörnet) för QR-koden på sida 1. */
    qrAt?: { x: number; y: number };
    /** URL som QR-koden pekar på — samma URL används i den klickbara footer-länken. */
    qrUrl?: string;
    /** Premium-användare kan slå av byline-vattenmärket. Default = true. */
    showWatermark?: boolean;
  },
) {
  const total = doc.getNumberOfPages();
  const today = new Date().toISOString().slice(0, 10);
  const showWatermark = opts.showWatermark !== false;
  const linkUrl = opts.qrUrl ?? "https://agilitymanager.se/banplanerare?utm_source=pdf&utm_medium=export";
  const SITE = "agilitymanager.se";

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    if (showWatermark) {
      drawDiagonalWatermark(doc);
    }

    const y = PDF_PAGE.height - 6;
    doc.setDrawColor(...PDF_BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(PDF_PAGE.margin, y - 4, PDF_PAGE.width - PDF_PAGE.margin, y - 4);

    if (showWatermark) {
      // Vänster: "Banan skapad av X på " (italic) + "agilitymanager.se" (bold + länk)
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF_BRAND.muted);
      const prefix = opts.authorName ? `Banan skapad av ${opts.authorName} på ` : "Skapad i Banbyggaren · ";
      doc.text(prefix, PDF_PAGE.margin, y);
      const prefixW = doc.getTextWidth(prefix);

      // Site-länk i medium/bold + klickbar annotation
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_BRAND.primary);
      const linkX = PDF_PAGE.margin + prefixW;
      doc.textWithLink(SITE, linkX, y, { url: linkUrl });

      // Reklamrad ovanför footer-linjen
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...PDF_BRAND.primary);
      doc.textWithLink(
        "Rita egna agility- och hoopersbanor gratis på agilitymanager.se",
        PDF_PAGE.width / 2,
        y - 7,
        { url: linkUrl, align: "center" },
      );
    }

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text(`${today} · sida ${i} av ${total}`, PDF_PAGE.width - PDF_PAGE.margin, y, { align: "right" });

    // varumärkesrad
    doc.setFillColor(...PDF_BRAND.primary);
    doc.rect(0, PDF_PAGE.height - 3, PDF_PAGE.width, 3, "F");


    // QR-kod nere till vänster på sida 1
    if (i === 1 && opts.qrDataUrl) {
      const qrSize = 18; // mm
      const qrX = opts.qrAt?.x ?? PDF_PAGE.margin;
      const qrY = opts.qrAt?.y ?? PDF_PAGE.height - 3 - qrSize - 8; // ovanför footer-linjen
      try {
        doc.addImage(opts.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...PDF_BRAND.muted);
        doc.text("Öppna banan digitalt", qrX + qrSize / 2, qrY + qrSize + 2.5, { align: "center" });
        // Hela QR-ytan klickbar också
        doc.link(qrX, qrY, qrSize, qrSize, { url: linkUrl });
      } catch {
        // Skit i det om addImage failar — footern behöver ändå fungera.
      }
    }
  }
  doc.setTextColor(0);
}

/**
 * Ritar yttre banmått (linjaler) ovanför och till vänster om arenan.
 * Tickmarks vid varje 5 m, fina streck vid varje 1 m, mått-text "X m" centrerat.
 */
export function drawArenaDimensions(
  doc: jsPDF,
  arenaX: number, arenaY: number,
  arenaWidthMm: number, arenaHeightMm: number,
  arenaWidthM: number, arenaHeightM: number,
): void {
  const offset = 4; // mm utanför banan
  doc.setDrawColor(...PDF_BRAND.muted);
  doc.setTextColor(...PDF_BRAND.muted);

  // Topp-linje
  doc.setLineWidth(0.25);
  doc.line(arenaX, arenaY - offset, arenaX + arenaWidthMm, arenaY - offset);
  // Bredd-text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${arenaWidthM} m`, arenaX + arenaWidthMm / 2, arenaY - offset - 2, { align: "center" });

  // Tickmarks topp
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setLineWidth(0.15);
  for (let m = 0; m <= arenaWidthM; m++) {
    const px = arenaX + (m / arenaWidthM) * arenaWidthMm;
    const major = m % 5 === 0;
    const tickLen = major ? 1.5 : 0.6;
    doc.line(px, arenaY - offset, px, arenaY - offset - tickLen);
    if (major && m > 0 && m < arenaWidthM) {
      doc.text(String(m), px, arenaY - offset - tickLen - 0.5, { align: "center" });
    }
  }

  // Vänster-linje
  doc.setLineWidth(0.25);
  doc.line(arenaX - offset, arenaY, arenaX - offset, arenaY + arenaHeightMm);
  // Höjd-text (roterad)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${arenaHeightM} m`, arenaX - offset - 2, arenaY + arenaHeightMm / 2, { align: "center", angle: 90 });

  // Tickmarks vänster
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setLineWidth(0.15);
  for (let m = 0; m <= arenaHeightM; m++) {
    const py = arenaY + (m / arenaHeightM) * arenaHeightMm;
    const major = m % 5 === 0;
    const tickLen = major ? 1.5 : 0.6;
    doc.line(arenaX - offset, py, arenaX - offset - tickLen, py);
    if (major && m > 0 && m < arenaHeightM) {
      doc.text(String(m), arenaX - offset - tickLen - 0.5, py + 0.8, { align: "right" });
    }
  }

  doc.setTextColor(0);
  doc.setLineWidth(0.5);
}

/** Sanering av filnamn. */
export function safeFileName(name: string): string {
  return (name || "bana").replace(/[^a-z0-9åäö_-]+/gi, "_");
}

/* ───────────── Teckensäker text ───────────── */

/** Tecken som saknas i Helvetica/WinAnsi men har en läsbar ersättning. */
const PDF_REPLACEMENTS: Array<[number, string]> = [
  [0x2192, "->"], // högerpil
  [0x2190, "<-"], // vänsterpil
  [0x2265, ">="],
  [0x2264, "<="],
  [0x2300, "\u00D8"], // diameter
  [0x2713, "OK"],
  [0x2714, "OK"],
  [0x26a0, "!"],
  [0x2212, "-"], // minustecken
];

/** cp1252-tecken utanför Latin-1 (t.ex. –, —, …, ”, €). */
const CP1252_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function isWinAnsi(cp: number): boolean {
  return cp === 0x0a || (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || CP1252_EXTRA.has(cp);
}

/**
 * jsPDF:s inbyggda Helvetica klarar bara WinAnsi (cp1252). Allt annat — pilar
 * i regelmeddelanden, emoji i bannamn — blir annars skräptecken i PDF:en.
 */
export function pdfSafeText(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const rep = PDF_REPLACEMENTS.find(([c]) => c === cp);
    if (rep) out += rep[1];
    else if (isWinAnsi(cp)) out += ch;
  }
  return out;
}

/** Låter alla text-anrop på dokumentet gå genom `pdfSafeText`. */
export function installPdfTextSanitizer(doc: jsPDF): jsPDF {
  const clean = (t: unknown) =>
    typeof t === "string" ? pdfSafeText(t) : Array.isArray(t) ? t.map((x) => (typeof x === "string" ? pdfSafeText(x) : x)) : t;
  const d = doc as unknown as Record<string, (...args: unknown[]) => unknown>;
  for (const method of ["text", "splitTextToSize", "textWithLink", "getTextWidth"]) {
    const original = d[method];
    if (typeof original !== "function") continue;
    d[method] = function patched(this: unknown, first: unknown, ...rest: unknown[]) {
      return original.call(doc, clean(first), ...rest);
    };
  }
  return doc;
}

/**
 * Placering för QR-koden till höger om banbilden när det finns plats, så att
 * den aldrig hamnar ovanpå hinderlistor eller banan.
 */
export function qrBesideArena(arenaTopY: number, arena: { w: number }): { x: number; y: number } | undefined {
  const dimMargin = 8;
  const right = PDF_PAGE.margin + dimMargin + arena.w + 8;
  if (PDF_PAGE.width - PDF_PAGE.margin - right < 22) return undefined;
  return { x: PDF_PAGE.width - PDF_PAGE.margin - 20, y: arenaTopY + dimMargin };
}
