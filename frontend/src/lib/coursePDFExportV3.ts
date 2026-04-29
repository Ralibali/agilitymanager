/**
 * coursePDFExportV3.ts
 *
 * Världsklass flersidig PDF-export för V3-banplaneraren i AgilityManager.
 * Data-modellen är procent-baserad (0–100) och ritas direkt med jsPDF
 * (ingen canvas-till-bild – ger skarp vektorgrafik i alla zoom-nivåer).
 *
 * Sidor:
 *   1. Översikt – banan med numrering, dimensioner, domare-info
 *   2. Förarens väg – separat tydlig vy (endast om paths finns)
 *   3. Statistik – banlängd, SCT per storleksklass, hinderfördelning
 *   4. Anteckningar – fält för domare, vinnare, kommentarer
 *
 * Footer på varje sida: "Banan skapad av [namn] på agilitymanager.se"
 */

import jsPDF from 'jspdf';

export type Shape = 'bar' | 'wide' | 'long' | 'circle' | 'tunnel' | 'zone' | 'triangle';

export type PdfV3Obstacle = {
  id: string;
  type: string;
  label: string;
  shape: Shape;
  x: number; // 0..100
  y: number; // 0..100
  rotation: number;
  number?: number;
  color?: string;
};

export type PdfV3Path = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export type PdfV3Number = {
  id: string;
  x: number;
  y: number;
  num: number;
  color: string;
};

export type PdfV3Course = {
  name: string;
  location?: string;
  width: number;
  height: number;
  obstacles: PdfV3Obstacle[];
  paths: PdfV3Path[];
  numbers: PdfV3Number[];
};

export type PdfV3ExportOptions = {
  course: PdfV3Course;
  mode: 'Agility' | 'Hoopers';
  userName: string;
  judge?: string;
  club?: string;
  shokClassLabel?: string;
  date?: Date;
};

/* Brand constants */
const BRAND_NAVY: [number, number, number] = [32, 36, 95];
const BRAND_PRIMARY: [number, number, number] = [26, 107, 60];
const BRAND_SECONDARY: [number, number, number] = [200, 93, 30];
const BRAND_LIGHT: [number, number, number] = [248, 246, 239];
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [115, 115, 115];
const DRAW_RED = '#e74b4b';

/* Dog size classes */
const DOG_SIZE_CLASSES = [
  { label: 'XS (<35 cm)', speed: 3.5 },
  { label: 'S (35-43 cm)', speed: 4.0 },
  { label: 'M (43-50 cm)', speed: 4.2 },
  { label: 'L (>50 cm)',  speed: 4.5 },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#ffffff').replace('#', '');
  const norm = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  return [isNaN(r) ? 255 : r, isNaN(g) ? 255 : g, isNaN(b) ? 255 : b];
}

function formatDate(d: Date) {
  return d.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/å/gi, 'a').replace(/ä/gi, 'a').replace(/ö/gi, 'o')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

function setDash(pdf: jsPDF, pattern: number[], phase = 0) {
  const p = pdf as unknown as { setLineDashPattern?: (pattern: number[], phase: number) => void };
  if (typeof p.setLineDashPattern === 'function') p.setLineDashPattern(pattern, phase);
}

function drawHeader(pdf: jsPDF, pageW: number, opts: PdfV3ExportOptions, title?: string) {
  const today = opts.date ?? new Date();
  const dateStr = formatDate(today);

  pdf.setFillColor(...BRAND_NAVY);
  pdf.rect(0, 0, pageW, 17, 'F');
  pdf.setFillColor(...BRAND_SECONDARY);
  pdf.rect(0, 17, pageW, 0.9, 'F');

  pdf.setFillColor(255, 255, 255);
  pdf.circle(11, 8.5, 4.5, 'F');
  pdf.setFillColor(...BRAND_NAVY);
  pdf.circle(11, 9, 1.9, 'F');
  pdf.circle(9.3, 7.2, 0.75, 'F');
  pdf.circle(12.7, 7.2, 0.75, 'F');
  pdf.circle(8.5, 9.5, 0.65, 'F');
  pdf.circle(13.5, 9.5, 0.65, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  const headerTitle = title ?? (opts.course.name || `${opts.mode}-bana`);
  pdf.text(headerTitle, 19, 8);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const sub = opts.course.location
    ? `Plats: ${opts.course.location}  ·  ${opts.mode}`
    : `AgilityManager - Banplanerare  ·  ${opts.mode}`;
  pdf.text(sub, 19, 12.5);

  pdf.setFontSize(7);
  pdf.text(dateStr, pageW - 8, 10, { align: 'right' });
}

function drawFooter(pdf: jsPDF, pageW: number, pageH: number, opts: PdfV3ExportOptions, pageNum: number, totalPages: number) {
  pdf.setFillColor(...BRAND_LIGHT);
  pdf.rect(0, pageH - 10, pageW, 10, 'F');
  pdf.setDrawColor(220, 215, 205);
  pdf.setLineWidth(0.2);
  pdf.line(0, pageH - 10, pageW, pageH - 10);

  pdf.setTextColor(...MUTED);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Banan skapad av ${opts.userName} på agilitymanager.se`, 10, pageH - 4);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND_NAVY);
  pdf.text(`Sida ${pageNum} / ${totalPages}`, pageW - 10, pageH - 4, { align: 'right' });
}

function drawMetaBadges(pdf: jsPDF, pageW: number, opts: PdfV3ExportOptions, y: number): number {
  const course = opts.course;
  const obstacleCount = course.obstacles.filter(
    (o) => o.type !== 'start' && o.type !== 'finish' && o.type !== 'handler_zone',
  ).length;

  const badges: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Sport', value: opts.mode, color: BRAND_NAVY },
    { label: 'Plan', value: `${course.width}×${course.height} m`, color: [70, 70, 70] },
    { label: 'Hinder', value: `${obstacleCount}`, color: [70, 70, 70] },
  ];
  if (opts.shokClassLabel) badges.push({ label: 'Klass', value: opts.shokClassLabel, color: BRAND_PRIMARY });
  if (opts.judge) badges.push({ label: 'Domare', value: opts.judge, color: [70, 70, 70] });
  if (opts.club) badges.push({ label: 'Klubb', value: opts.club, color: [70, 70, 70] });

  let bx = 10;
  pdf.setFontSize(7);
  for (const b of badges) {
    pdf.setFont('helvetica', 'bold');
    const labelW = pdf.getTextWidth(b.label) + 4;
    pdf.setFont('helvetica', 'normal');
    const valueW = pdf.getTextWidth(b.value) + 4;
    const w = labelW + valueW;
    if (bx + w > pageW - 10) { bx = 10; y += 6; }

    pdf.setFillColor(...b.color);
    pdf.roundedRect(bx, y, labelW, 4.8, 1, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(b.label, bx + labelW / 2, y + 3.3, { align: 'center' });

    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(bx + labelW, y, valueW, 4.8, 1, 1, 'F');
    pdf.setTextColor(...INK);
    pdf.setFont('helvetica', 'normal');
    pdf.text(b.value, bx + labelW + valueW / 2, y + 3.3, { align: 'center' });

    bx += w + 2;
  }
  return y + 6;
}

function drawObstacleVector(pdf: jsPDF, o: PdfV3Obstacle, px: number, py: number, mmPerMeterX: number) {
  const [r, g, b] = hexToRgb(o.color ?? '#ffffff');
  pdf.setFillColor(r, g, b);
  pdf.setDrawColor(40, 60, 50);
  pdf.setLineWidth(0.45);

  const s = Math.max(2.2, mmPerMeterX * 0.9);
  const rotRad = (o.rotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const rp = (lx: number, ly: number) => ({ x: px + lx * cos - ly * sin, y: py + lx * sin + ly * cos });

  if (o.shape === 'long') {
    const w = s * 4, h = s * 0.7;
    const c1 = rp(-w / 2, -h / 2), c2 = rp(w / 2, -h / 2), c3 = rp(w / 2, h / 2), c4 = rp(-w / 2, h / 2);
    pdf.lines([[c2.x - c1.x, c2.y - c1.y], [c3.x - c2.x, c3.y - c2.y], [c4.x - c3.x, c4.y - c3.y]], c1.x, c1.y, [1, 1], 'FD', true);
    if (o.type === 'weave') {
      pdf.setFillColor(200, 40, 40);
      for (let i = 0; i < 7; i++) {
        const frac = -0.5 + i / 6;
        const p = rp(frac * w * 0.9, 0);
        pdf.circle(p.x, p.y, 0.35, 'F');
      }
    }
    if (o.type === 'dog_walk' || o.type === 'seesaw') {
      pdf.setFillColor(200, 40, 40);
      const zl = rp(-w / 2 + s * 0.4, 0), zr = rp(w / 2 - s * 0.4, 0);
      pdf.circle(zl.x, zl.y, s * 0.35, 'F');
      pdf.circle(zr.x, zr.y, s * 0.35, 'F');
    }
  } else if (o.shape === 'wide' || o.shape === 'tunnel') {
    const w = s * 2.2, h = s * 0.85;
    const c1 = rp(-w / 2, -h / 2), c2 = rp(w / 2, -h / 2), c3 = rp(w / 2, h / 2), c4 = rp(-w / 2, h / 2);
    pdf.lines([[c2.x - c1.x, c2.y - c1.y], [c3.x - c2.x, c3.y - c2.y], [c4.x - c3.x, c4.y - c3.y]], c1.x, c1.y, [1, 1], 'FD', true);
    if (o.shape === 'tunnel' || o.type === 'hoopers_tunnel' || o.type === 'tunnel') {
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.35);
      const a1 = rp(-w / 3, 0), a2 = rp(w / 3, 0);
      pdf.line(a1.x, a1.y, a2.x, a2.y);
      const ah1 = rp(w / 3 - s * 0.25, -s * 0.2);
      const ah2 = rp(w / 3 - s * 0.25,  s * 0.2);
      pdf.line(ah1.x, ah1.y, a2.x, a2.y);
      pdf.line(ah2.x, ah2.y, a2.x, a2.y);
    }
  } else if (o.shape === 'triangle') {
    const h = s * 1.4;
    const p1 = rp(0, -h * 0.55), p2 = rp(-h * 0.55, h * 0.45), p3 = rp(h * 0.55, h * 0.45);
    pdf.triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, 'FD');
    pdf.setFillColor(200, 40, 40);
    const cz1 = rp(-h * 0.32, h * 0.25), cz2 = rp(h * 0.32, h * 0.25);
    pdf.circle(cz1.x, cz1.y, s * 0.25, 'F');
    pdf.circle(cz2.x, cz2.y, s * 0.25, 'F');
  } else if (o.shape === 'circle') {
    pdf.circle(px, py, s * 0.85, 'FD');
    if (o.type === 'tire') {
      pdf.setDrawColor(200, 40, 40);
      pdf.setLineWidth(0.3);
      pdf.circle(px, py, s * 0.55, 'S');
    }
  } else if (o.shape === 'zone') {
    setDash(pdf, [0.8, 0.8], 0);
    pdf.setDrawColor(200, 60, 60);
    const w = s * 2.5, h = s * 2.5;
    const c1 = rp(-w / 2, -h / 2);
    pdf.roundedRect(c1.x, c1.y, w, h, 1, 1, 'S');
    setDash(pdf, [], 0);
  } else {
    if (o.type === 'start' || o.type === 'finish') {
      pdf.setDrawColor(o.type === 'start' ? 26 : 200, o.type === 'start' ? 107 : 40, o.type === 'start' ? 60 : 40);
      pdf.setLineWidth(0.6);
      const v1a = rp(-s * 0.35, -s * 0.75), v1b = rp(-s * 0.35, s * 0.75);
      const v2a = rp(s * 0.35, -s * 0.75), v2b = rp(s * 0.35, s * 0.75);
      pdf.line(v1a.x, v1a.y, v1b.x, v1b.y);
      pdf.line(v2a.x, v2a.y, v2b.x, v2b.y);
      setDash(pdf, [0.7, 0.7], 0);
      const ha = rp(-s * 0.35, 0), hb = rp(s * 0.35, 0);
      pdf.line(ha.x, ha.y, hb.x, hb.y);
      setDash(pdf, [], 0);
    } else {
      const w = s * 1.4, h = s * 0.35;
      const c1 = rp(-w / 2, -h / 2), c2 = rp(w / 2, -h / 2), c3 = rp(w / 2, h / 2), c4 = rp(-w / 2, h / 2);
      pdf.lines([[c2.x - c1.x, c2.y - c1.y], [c3.x - c2.x, c3.y - c2.y], [c4.x - c3.x, c4.y - c3.y]], c1.x, c1.y, [1, 1], 'FD', true);
      pdf.setFillColor(200, 40, 40);
      const pl = rp(-w / 2, 0), pr = rp(w / 2, 0);
      pdf.circle(pl.x, pl.y, s * 0.22, 'F');
      pdf.circle(pr.x, pr.y, s * 0.22, 'F');
    }
  }

  if (o.number) {
    const nx = px + s * 1.2, ny = py - s * 1.2;
    pdf.setFillColor(...BRAND_PRIMARY);
    pdf.circle(nx, ny, 2.6, 'F');
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.3);
    pdf.circle(nx, ny, 2.6, 'S');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(String(o.number), nx, ny + 0.9, { align: 'center' });
  }
}

type FieldLayout = { marginX: number; top: number; fieldW: number; fieldH: number };

function drawFieldBackground(pdf: jsPDF, layout: FieldLayout, course: PdfV3Course) {
  const { marginX, top, fieldW, fieldH } = layout;
  pdf.setFillColor(250, 250, 248);
  pdf.rect(marginX, top, fieldW, fieldH, 'F');

  pdf.setLineWidth(0.1);
  for (let x = 0; x <= course.width; x++) {
    const px = marginX + (x / course.width) * fieldW;
    const isMajor = x % 5 === 0;
    pdf.setDrawColor(isMajor ? 200 : 230, isMajor ? 200 : 230, isMajor ? 200 : 230);
    pdf.setLineWidth(isMajor ? 0.18 : 0.1);
    pdf.line(px, top, px, top + fieldH);
  }
  for (let y = 0; y <= course.height; y++) {
    const py = top + (y / course.height) * fieldH;
    const isMajor = y % 5 === 0;
    pdf.setDrawColor(isMajor ? 200 : 230, isMajor ? 200 : 230, isMajor ? 200 : 230);
    pdf.setLineWidth(isMajor ? 0.18 : 0.1);
    pdf.line(marginX, py, marginX + fieldW, py);
  }

  pdf.setTextColor(160, 160, 160);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5);
  for (let x = 0; x <= course.width; x += 5) {
    const px = marginX + (x / course.width) * fieldW;
    pdf.text(String(x), px, top + fieldH + 3.5, { align: 'center' });
  }
  for (let y = 0; y <= course.height; y += 5) {
    if (y === 0) continue;
    const py = top + (y / course.height) * fieldH;
    pdf.text(String(y), marginX - 2.5, py + 1, { align: 'right' });
  }

  pdf.setDrawColor(80, 80, 80);
  pdf.setLineWidth(0.5);
  pdf.rect(marginX, top, fieldW, fieldH, 'S');

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(marginX + 2, top + 2, 22, 5.2, 1, 1, 'FD');
  pdf.setTextColor(90, 90, 90);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1 ruta = 1 m', marginX + 13, top + 5.4, { align: 'center' });
}

function toMM(p: { x: number; y: number }, layout: FieldLayout) {
  return {
    x: layout.marginX + (p.x / 100) * layout.fieldW,
    y: layout.top + (p.y / 100) * layout.fieldH,
  };
}

function drawPaths(pdf: jsPDF, layout: FieldLayout, paths: PdfV3Path[], opts: { faded?: boolean; bold?: boolean } = {}) {
  const { bold = false } = opts;
  for (const path of paths) {
    if (path.points.length < 2) continue;
    const [r, g, b] = hexToRgb(path.color);
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(bold ? 1.1 : 0.7);
    setDash(pdf, bold ? [] : [2, 1.6], 0);
    const first = toMM(path.points[0], layout);
    pdf.moveTo(first.x, first.y);
    for (const pt of path.points.slice(1)) {
      const p = toMM(pt, layout);
      pdf.lineTo(p.x, p.y);
    }
    pdf.stroke();
  }
  setDash(pdf, [], 0);
}

function drawObstacles(pdf: jsPDF, layout: FieldLayout, course: PdfV3Course, opts: { faded?: boolean } = {}) {
  const { faded = false } = opts;
  const mmPerMeter = layout.fieldW / course.width;
  for (const o of course.obstacles) {
    const p = toMM(o, layout);
    if (faded) {
      const g = pdf as unknown as { GState?: new (o: { opacity: number }) => unknown; setGState?: (g: unknown) => void };
      if (g.GState && g.setGState) g.setGState(new g.GState({ opacity: 0.35 }));
      drawObstacleVector(pdf, o, p.x, p.y, mmPerMeter);
      if (g.GState && g.setGState) g.setGState(new g.GState({ opacity: 1 }));
    } else {
      drawObstacleVector(pdf, o, p.x, p.y, mmPerMeter);
    }
  }
}

function drawFreeNumbers(pdf: jsPDF, layout: FieldLayout, numbers: PdfV3Number[]) {
  for (const n of numbers) {
    const p = toMM(n, layout);
    const [r, g, b] = hexToRgb(n.color || DRAW_RED);
    pdf.setFillColor(r, g, b);
    pdf.circle(p.x, p.y, 2.4, 'F');
    const isWhiteBg = n.color?.toLowerCase() === '#ffffff';
    pdf.setTextColor(isWhiteBg ? 30 : 255, isWhiteBg ? 30 : 255, isWhiteBg ? 30 : 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.text(String(n.num), p.x, p.y + 0.9, { align: 'center' });
  }
}

function pageOverview(pdf: jsPDF, pageW: number, pageH: number, opts: PdfV3ExportOptions) {
  drawHeader(pdf, pageW, opts);
  const badgeEndY = drawMetaBadges(pdf, pageW, opts, 22);

  const availW = pageW - 30;
  const availH = pageH - badgeEndY - 22;
  const ratio = opts.course.width / opts.course.height;
  let fieldW = availW;
  let fieldH = fieldW / ratio;
  if (fieldH > availH) { fieldH = availH; fieldW = fieldH * ratio; }
  const marginX = (pageW - fieldW) / 2;
  const top = badgeEndY + 4;
  const layout: FieldLayout = { marginX, top, fieldW, fieldH };

  drawFieldBackground(pdf, layout, opts.course);
  drawPaths(pdf, layout, opts.course.paths);
  drawObstacles(pdf, layout, opts.course);
  drawFreeNumbers(pdf, layout, opts.course.numbers);
}

function pageHandlerPath(pdf: jsPDF, pageW: number, pageH: number, opts: PdfV3ExportOptions) {
  drawHeader(pdf, pageW, opts);

  let y = 22;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...BRAND_NAVY);
  pdf.text('Förarens väg', 10, y);
  y += 1.5;
  pdf.setDrawColor(...BRAND_NAVY);
  pdf.setLineWidth(0.4);
  pdf.line(10, y, pageW - 10, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text('Hindren är tonade så att förarens planerade väg framträder tydligare.', 10, y);
  y += 5;

  const availW = pageW - 30;
  const availH = pageH - y - 20;
  const ratio = opts.course.width / opts.course.height;
  let fieldW = availW;
  let fieldH = fieldW / ratio;
  if (fieldH > availH) { fieldH = availH; fieldW = fieldH * ratio; }
  const marginX = (pageW - fieldW) / 2;
  const layout: FieldLayout = { marginX, top: y, fieldW, fieldH };

  drawFieldBackground(pdf, layout, opts.course);
  drawObstacles(pdf, layout, opts.course, { faded: true });
  drawFreeNumbers(pdf, layout, opts.course.numbers);
  drawPaths(pdf, layout, opts.course.paths, { bold: true });

  if (opts.course.paths.length > 0) {
    const first = opts.course.paths[0];
    const last = opts.course.paths[opts.course.paths.length - 1];
    if (first.points.length > 0) {
      const p = toMM(first.points[0], layout);
      pdf.setFillColor(...BRAND_PRIMARY);
      pdf.circle(p.x, p.y, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.text('S', p.x, p.y + 0.7, { align: 'center' });
    }
    if (last.points.length > 0) {
      const p = toMM(last.points[last.points.length - 1], layout);
      pdf.setFillColor(...BRAND_SECONDARY);
      pdf.circle(p.x, p.y, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.text('M', p.x, p.y + 0.7, { align: 'center' });
    }
  }
}

function computeStats(course: PdfV3Course) {
  const numbered = course.obstacles
    .filter((o) => typeof o.number === 'number')
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const toM = (p: { x: number; y: number }) => ({
    x: (p.x / 100) * course.width,
    y: (p.y / 100) * course.height,
  });

  let lengthM = 0;
  for (let i = 1; i < numbered.length; i++) {
    const a = toM(numbered[i - 1]);
    const b = toM(numbered[i]);
    lengthM += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  let sharpTurns = 0, totalTurn = 0;
  for (let i = 1; i < numbered.length - 1; i++) {
    const a = toM(numbered[i - 1]);
    const b = toM(numbered[i]);
    const c = toM(numbered[i + 1]);
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const m1 = Math.hypot(v1.x, v1.y);
    const m2 = Math.hypot(v2.x, v2.y);
    if (m1 && m2) {
      const cos = (v1.x * v2.x + v1.y * v2.y) / (m1 * m2);
      const ang = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
      totalTurn += ang;
      if (ang > 90) sharpTurns++;
    }
  }

  const typeCounts: Record<string, number> = {};
  for (const o of course.obstacles) {
    if (o.type === 'start' || o.type === 'finish' || o.type === 'handler_zone') continue;
    typeCounts[o.type] = (typeCounts[o.type] ?? 0) + 1;
  }
  const totalObstacles = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  const sum = (arr: string[]) => arr.reduce((a, t) => a + (typeCounts[t] ?? 0), 0);

  return {
    lengthM: Math.round(lengthM * 10) / 10,
    numberedCount: numbered.length,
    totalObstacles,
    sharpTurns,
    avgTurnDeg: numbered.length > 2 ? totalTurn / (numbered.length - 2) : 0,
    typeCounts,
    jumpCount: sum(['jump', 'oxer', 'wall', 'long_jump', 'tire']),
    contactCount: sum(['a_frame', 'dog_walk', 'seesaw', 'balance']),
    tunnelCount: sum(['tunnel', 'hoopers_tunnel']),
    weaveCount: typeCounts['weave'] ?? 0,
  };
}

const LABEL_BY_TYPE: Record<string, string> = {
  jump: 'Hopp', oxer: 'Oxer', wall: 'Muren', long_jump: 'Långhopp',
  tunnel: 'Tunnel', a_frame: 'A-hinder', dog_walk: 'Brygga', seesaw: 'Vipp',
  balance: 'Balans', weave: 'Slalom', tire: 'Däck',
  start: 'Start', finish: 'Mål',
  hoop: 'Hoop', hoopers_tunnel: 'Tunnel', barrel: 'Tunna', gate: 'Staket', handler_zone: 'Zon',
};

function pageStatistics(pdf: jsPDF, pageW: number, pageH: number, opts: PdfV3ExportOptions) {
  drawHeader(pdf, pageW, opts, `${opts.course.name || `${opts.mode}-bana`} - Statistik`);
  let y = 22;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...BRAND_NAVY);
  pdf.text('Bananalys & Statistik', 10, y);
  y += 1.5;
  pdf.setDrawColor(...BRAND_NAVY);
  pdf.setLineWidth(0.4);
  pdf.line(10, y, pageW - 10, y);
  y += 7;

  const stats = computeStats(opts.course);

  const cards = [
    { label: 'Banlängd', value: `${stats.lengthM} m`, hint: 'mellan numrerade hinder' },
    { label: 'Numrerade', value: `${stats.numberedCount}`, hint: `av ${stats.totalObstacles} totalt` },
    { label: 'Skarpa svängar', value: `${stats.sharpTurns}`, hint: '>90° riktningsändringar' },
    { label: 'Medelsväng', value: `${Math.round(stats.avgTurnDeg)}°`, hint: 'per hinderpassering' },
  ];
  const cardW = (pageW - 20 - 3 * 4) / 4;
  cards.forEach((c, i) => {
    const cx = 10 + i * (cardW + 4);
    pdf.setFillColor(...BRAND_LIGHT);
    pdf.roundedRect(cx, y, cardW, 20, 2, 2, 'F');
    pdf.setDrawColor(...BRAND_NAVY);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(cx, y, cardW, 20, 2, 2, 'S');
    pdf.setTextColor(...MUTED);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(c.label.toUpperCase(), cx + 3, y + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...BRAND_NAVY);
    pdf.text(c.value, cx + 3, y + 13);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...MUTED);
    pdf.text(c.hint, cx + 3, y + 17.5);
  });
  y += 26;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text('Riktmärken för SCT (Standard Course Time)', 10, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text('Ungefärlig bantid per storleksklass - Klass 1-2 referens. Max-tid = SCT x 1,25.', 10, y + 4);
  y += 10;

  pdf.setFillColor(...BRAND_NAVY);
  pdf.rect(10, y, pageW - 20, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Storleksklass', 14, y + 4.8);
  pdf.text('Hastighet', 100, y + 4.8);
  pdf.text('SCT', 140, y + 4.8);
  pdf.text('Max-tid', 175, y + 4.8);
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  DOG_SIZE_CLASSES.forEach((d, idx) => {
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 247, 243);
      pdf.rect(10, y, pageW - 20, 7, 'F');
    }
    const sct = stats.lengthM > 0 ? Math.round(stats.lengthM / d.speed) : 0;
    const maxT = Math.round(sct * 1.25);
    pdf.setTextColor(...INK);
    pdf.text(d.label, 14, y + 4.8);
    pdf.text(`${d.speed.toFixed(1)} m/s`, 100, y + 4.8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stats.lengthM > 0 ? `${sct} s` : '-', 140, y + 4.8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...MUTED);
    pdf.text(stats.lengthM > 0 ? `${maxT} s` : '-', 175, y + 4.8);
    y += 7;
  });
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text('Hinderfördelning', 10, y);
  y += 6;

  const breakdown = opts.mode === 'Hoopers'
    ? [
        { label: 'Hoops', val: stats.typeCounts['hoop'] ?? 0, color: [230, 180, 40] as [number, number, number] },
        { label: 'Tunnlar', val: stats.tunnelCount, color: [180, 130, 50] as [number, number, number] },
        { label: 'Tunnor', val: stats.typeCounts['barrel'] ?? 0, color: [60, 110, 180] as [number, number, number] },
        { label: 'Staket', val: stats.typeCounts['gate'] ?? 0, color: [150, 80, 160] as [number, number, number] },
      ]
    : [
        { label: 'Hopphinder', val: stats.jumpCount, color: BRAND_SECONDARY },
        { label: 'Kontaktfält', val: stats.contactCount, color: [230, 190, 50] as [number, number, number] },
        { label: 'Tunnlar', val: stats.tunnelCount, color: [180, 130, 50] as [number, number, number] },
        { label: 'Slalom', val: stats.weaveCount, color: [130, 60, 130] as [number, number, number] },
      ];

  const barMaxW = pageW - 70;
  const maxVal = Math.max(1, ...breakdown.map((b) => b.val));
  breakdown.forEach((b) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...INK);
    pdf.text(b.label, 10, y + 4);
    const barW = (b.val / maxVal) * barMaxW;
    pdf.setFillColor(235, 232, 225);
    pdf.rect(50, y + 1, barMaxW, 5, 'F');
    pdf.setFillColor(...b.color);
    pdf.rect(50, y + 1, Math.max(0.5, barW), 5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${b.val}`, 50 + barMaxW + 3, y + 4);
    y += 8;
  });
  y += 4;

  const rows = Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]);
  if (rows.length > 0 && y < pageH - 30) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text('Alla hinder i banan', 10, y);
    y += 5;
    pdf.setFontSize(8.5);
    const colW = (pageW - 20) / 2;
    rows.forEach(([type, count], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 10 + col * colW;
      const cy = y + row * 5.5;
      if (cy > pageH - 18) return;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...INK);
      pdf.text(`${LABEL_BY_TYPE[type] ?? type}`, cx, cy);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...BRAND_NAVY);
      pdf.text(`${count}`, cx + colW - 5, cy, { align: 'right' });
    });
  }
}

function pageNotes(pdf: jsPDF, pageW: number, pageH: number, opts: PdfV3ExportOptions) {
  drawHeader(pdf, pageW, opts, `${opts.course.name || `${opts.mode}-bana`} - Anteckningar`);
  let y = 22;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...BRAND_NAVY);
  pdf.text('Domarblad & Anteckningar', 10, y);
  y += 1.5;
  pdf.setDrawColor(...BRAND_NAVY);
  pdf.setLineWidth(0.4);
  pdf.line(10, y, pageW - 10, y);
  y += 8;

  const colW = (pageW - 25) / 2;
  const fields = [
    ['Domare / TD:', 'Datum:'],
    ['Tävling / Klubb:', 'Plats:'],
    ['Vinnare:', 'Tid:'],
    ['Bästa förare i dag:', 'Hund-storleksklass:'],
  ];
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...INK);
  for (const [l, r] of fields) {
    pdf.text(l, 10, y);
    pdf.text(r, 15 + colW, y);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(10, y + 3, 10 + colW - 5, y + 3);
    pdf.line(15 + colW, y + 3, 15 + 2 * colW, y + 3);
    y += 9;
  }

  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...INK);
  pdf.text('Observationer & kommentarer:', 10, y);
  y += 4;

  const lineH = 6.5;
  const endY = pageH - 14;
  pdf.setDrawColor(230, 230, 230);
  pdf.setLineWidth(0.2);
  while (y < endY) {
    pdf.line(10, y, pageW - 10, y);
    y += lineH;
  }
}

export function exportCoursePdfV3(opts: PdfV3ExportOptions): string {
  const course = opts.course;
  const isWide = course.width >= course.height;
  const pdf = new jsPDF({
    orientation: isWide ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const hasHandlerPath = course.paths && course.paths.length > 0;
  const pages: Array<(p: jsPDF) => void> = [
    (p) => pageOverview(p, pageW, pageH, opts),
  ];
  if (hasHandlerPath) pages.push((p) => pageHandlerPath(p, pageW, pageH, opts));
  pages.push((p) => pageStatistics(p, pageW, pageH, opts));
  pages.push((p) => pageNotes(p, pageW, pageH, opts));

  pages.forEach((fn, i) => {
    if (i > 0) pdf.addPage('a4', isWide ? 'landscape' : 'portrait');
    fn(pdf);
    drawFooter(pdf, pageW, pageH, opts, i + 1, pages.length);
  });

  const parts = [course.name, course.location, opts.mode].filter(Boolean).map((p) => slugify(String(p))).filter(Boolean);
  const date = (opts.date ?? new Date()).toISOString().slice(0, 10);
  const filename = `${parts.join('_') || 'bana'}_${date}.pdf`;
  pdf.save(filename);
  return filename;
}
