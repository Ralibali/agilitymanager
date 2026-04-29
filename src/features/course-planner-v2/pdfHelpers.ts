/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Delade vektor-renderingsfunktioner för Domar-/Tränings-/Bygg-PDF.
 *
 * Allt ritas med jsPDF-primitiver så att utskriften är skarp i alla zoom-nivåer.
 * Inga screenshots, ingen rasterisering.
 */
import type jsPDF from "jspdf";
import { getObstacleDefV2, type ObstacleTypeV2 } from "./config";
import type { ObstacleLite } from "./validation";

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
}

/** Returnerar de faktiska arena-måtten (mm) som ritades — användbart för layout. */
export function drawArenaVector(doc: jsPDF, opts: ArenaRenderOpts): { w: number; h: number; mmPerM: number } {
  const { x, y, maxWidth, maxHeight, arenaWidthM, arenaHeightM, obstacles } = opts;
  const grid = opts.grid !== false;
  const showPath = opts.showPath !== false;
  const numberBadge = opts.numberBadgeMm ?? 3;

  // Anpassa till tillgängligt utrymme bibehållande aspekt
  const aspect = arenaHeightM / arenaWidthM;
  let w = maxWidth;
  let h = w * aspect;
  if (h > maxHeight) {
    h = maxHeight;
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

  // Banlinje (numrerade hinder)
  if (showPath) {
    const numbered = obstacles
      .filter((o) => o.number != null && !["start", "finish", "number"].includes(o.type))
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    if (numbered.length > 1) {
      doc.setDrawColor(...PDF_BRAND.secondary);
      doc.setLineWidth(0.6);
      doc.setLineDashPattern([1.5, 1], 0);
      for (let i = 1; i < numbered.length; i++) {
        const a = numbered[i - 1], b = numbered[i];
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

  // Nummer-brickor
  for (const ob of obstacles) {
    if (ob.number == null || ["start", "finish", "number"].includes(ob.type)) continue;
    const def = getObstacleDefV2(ob.type);
    if (!def) continue;
    const offX = (def.sizeM.w / 2 + 0.4) * mmPerM;
    const offY = (-def.sizeM.d / 2 - 0.4) * mmPerM;
    const cx = m2x(ob.x) + offX;
    const cy = m2y(ob.y) + offY;
    doc.setFillColor(...PDF_BRAND.ink);
    doc.circle(cx, cy, numberBadge, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(numberBadge * 2.6);
    doc.text(String(ob.number), cx, cy + numberBadge * 0.45, { align: "center" });
  }

  return { w, h, mmPerM };
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
  const w = def.sizeM.w * mmPerM;
  const d = def.sizeM.d * mmPerM;

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
      const curveDeg = Math.max(0, Math.min(90, ob.curveDeg ?? 0));
      doc.setFillColor(245, 235, 215);
      if (curveDeg < 1) {
        drawRotatedRoundedRect(doc, cx, cy, w, d, ob.rotation, Math.min(d, w) / 2.2, true);
      } else {
        // Böjd tunnel — bezier mellan ändarna, kontrollpunkt offset åt curveSide.
        const side = (ob.curveSide ?? "right") === "right" ? 1 : -1;
        const r = d / 2;
        const offset = Math.tan((curveDeg * Math.PI / 180) / 2) * (w / 2);
        const ang = (ob.rotation * Math.PI) / 180;
        const ux = Math.cos(ang), uy = Math.sin(ang);   // längs tunneln
        const nx = -Math.sin(ang), ny = Math.cos(ang);  // sidan
        const p = (lx: number, ly: number) => [cx + lx * ux + ly * nx, cy + lx * uy + ly * ny] as [number, number];
        const [x0t, y0t] = p(-w / 2, -r);
        const [x1t, y1t] = p(w / 2, -r);
        const [cxT, cyT] = p(0, side * offset - r);
        const [x0b, y0b] = p(-w / 2, r);
        const [x1b, y1b] = p(w / 2, r);
        const [cxB, cyB] = p(0, side * offset + r);
        // Fyllnad via lines() med bezier-kurvor
        doc.lines(
          [
            [(cxT - x0t), (cyT - y0t), (x1t - x0t), (y1t - y0t)], // bezier topp (kontroll relativ start, slut relativ start)
            [(x1b - x1t), (y1b - y1t)],                            // höger sida
            [(cxB - x1b), (cyB - y1b), (x0b - x1b), (y0b - y1b)], // bezier botten (omvänt)
            [(x0t - x0b), (y0t - y0b)],                            // vänster sida (sluter formen)
          ],
          x0t, y0t, [1, 1], "FD", true,
        );
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
 * Renderar footer på alla sidor i dokumentet.
 * Anropa SIST efter att alla sidor är ritade.
 */
export function drawFooterAllPages(doc: jsPDF, opts: { authorName: string }) {
  const total = doc.getNumberOfPages();
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const y = PDF_PAGE.height - 6;
    doc.setDrawColor(...PDF_BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(PDF_PAGE.margin, y - 4, PDF_PAGE.width - PDF_PAGE.margin, y - 4);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_BRAND.muted);
    const author = opts.authorName ? `Banan skapad av ${opts.authorName} på agilitymanager.se` : "Skapad i Banplaneraren · agilitymanager.se";
    doc.text(author, PDF_PAGE.margin, y);
    doc.text(`${today} · sida ${i} av ${total}`, PDF_PAGE.width - PDF_PAGE.margin, y, { align: "right" });
    // varumärkesrad
    doc.setFillColor(...PDF_BRAND.primary);
    doc.rect(0, PDF_PAGE.height - 3, PDF_PAGE.width, 3, "F");
  }
  doc.setTextColor(0);
}

/** Sanering av filnamn. */
export function safeFileName(name: string): string {
  return (name || "bana").replace(/[^a-z0-9åäö_-]+/gi, "_");
}
