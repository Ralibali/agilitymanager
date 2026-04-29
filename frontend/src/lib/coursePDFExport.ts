/**
 * coursePDFExport.ts
 *
 * Världsklass PDF-export för AgilityManager banplanerare.
 *
 * - Sida 1: Översikt med numrering, dimensioner, domare-info och legend
 * - Sida 2: Förarens väg (handler path) - separat tydlig vy
 * - Sida 3: Statistik (banlängd, SCT per storleksklass, hinderfördelning)
 * - Sida 4: Anteckningssida med rutnät
 *
 * Personaliserad footer: "Banan skapad av [namn] på agilitymanager.se"
 */

import jsPDF from 'jspdf';

export type PDFObstacle = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  label: string;
  numbers: number[];
  colorNumbers?: { num: number; color: string }[];
  tunnelLength?: 4 | 6;
  bendAngle?: number;
  barrelDirection?: 'cw' | 'ccw';
};

export type PDFExportOptions = {
  obstacles: PDFObstacle[];
  handlerPath: { x: number; y: number }[];
  canvasWidth: number; // in pixels
  canvasHeight: number; // in pixels
  pxPerMeter: number;
  courseName: string;
  sportMode: 'agility' | 'hoopers';
  shokClassLabel?: string;
  /** Full image of the main view (as drawn on screen) */
  overviewImageData: string;
  /** Optional image of handler-path-only view */
  handlerPathImageData?: string;
  /** User display name for footer */
  userName: string;
  /** Optional judge/TD information */
  judge?: string;
  club?: string;
  /** Additional metadata */
  date?: Date;
};

/* ========== Brand constants ========== */
const BRAND_PRIMARY: [number, number, number] = [26, 107, 60]; // #1a6b3c
const BRAND_SECONDARY: [number, number, number] = [200, 93, 30]; // #c85d1e
const BRAND_LIGHT: [number, number, number] = [245, 243, 238]; // warm off-white
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];

/* ========== Dog size classes (SKK) with typical SCT speeds ========== */
// m/s used as reference speeds for SCT estimation (Klass 1-2 level)
const DOG_SPEEDS = [
  { label: 'XS (<35 cm)', speed: 3.5 },
  { label: 'S (35-43 cm)', speed: 4.0 },
  { label: 'M (43-50 cm)', speed: 4.2 },
  { label: 'L (>50 cm)', speed: 4.5 },
];

/* ========== Helpers ========== */

function formatDate(d: Date): string {
  return d.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function drawHeaderBand(doc: jsPDF, opts: PDFExportOptions, pageW: number) {
  const today = opts.date ?? new Date();
  const dateStr = formatDate(today);

  // Main band
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, pageW, 18, 'F');
  // Accent stripe
  doc.setFillColor(...BRAND_SECONDARY);
  doc.rect(0, 18, pageW, 1.2, 'F');

  // Logo circle
  doc.setFillColor(255, 255, 255);
  doc.circle(12, 9, 5, 'F');
  doc.setFillColor(...BRAND_PRIMARY);
  doc.circle(12, 9.5, 2.2, 'F');
  doc.circle(10, 7.5, 0.9, 'F');
  doc.circle(14, 7.5, 0.9, 'F');
  doc.circle(9, 10, 0.8, 'F');
  doc.circle(15, 10, 0.8, 'F');

  // Brand title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AgilityManager', 21, 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Banplanerare · agilitymanager.se', 21, 13.5);

  // Date (right)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, pageW - 8, 11, { align: 'right' });
}

function drawFooter(
  doc: jsPDF,
  opts: PDFExportOptions,
  pageW: number,
  pageH: number,
  pageNum: number,
  totalPages: number,
) {
  // Light band
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(0, pageH - 11, pageW, 11, 'F');
  // Thin top stroke
  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.2);
  doc.line(0, pageH - 11, pageW, pageH - 11);

  // Left: personal stamp
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const stamp = `Banan skapad av ${opts.userName} på agilitymanager.se`;
  doc.text(stamp, 10, pageH - 4.5);

  // Right: page number
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text(`Sida ${pageNum} / ${totalPages}`, pageW - 10, pageH - 4.5, { align: 'right' });
}

function drawCourseInfoRow(
  doc: jsPDF,
  opts: PDFExportOptions,
  pageW: number,
  y: number,
): number {
  const widthM = Math.round(opts.canvasWidth / opts.pxPerMeter);
  const heightM = Math.round(opts.canvasHeight / opts.pxPerMeter);
  const obstacleCount = opts.obstacles.filter(
    (o) => o.type !== 'start' && o.type !== 'finish' && o.type !== 'handler_zone',
  ).length;
  const sportLabel = opts.sportMode === 'hoopers' ? 'Hoopers' : 'Agility';
  const className = opts.shokClassLabel ?? '—';

  // Course title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(opts.courseName || 'Namnlös bana', 10, y);

  // Meta badges row
  y += 6;
  const badges: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Sport', value: sportLabel, color: BRAND_PRIMARY },
    { label: 'Klass', value: className, color: BRAND_SECONDARY },
    { label: 'Plan', value: `${widthM}×${heightM} m`, color: [90, 90, 90] },
    { label: 'Hinder', value: `${obstacleCount}`, color: [90, 90, 90] },
  ];
  if (opts.judge) badges.push({ label: 'Domare', value: opts.judge, color: [90, 90, 90] });
  if (opts.club) badges.push({ label: 'Klubb', value: opts.club, color: [90, 90, 90] });

  let bx = 10;
  doc.setFontSize(7);
  for (const b of badges) {
    doc.setFont('helvetica', 'bold');
    const labelW = doc.getTextWidth(b.label) + 4;
    doc.setFont('helvetica', 'normal');
    const valueW = doc.getTextWidth(b.value) + 4;
    const w = labelW + valueW;

    if (bx + w > pageW - 10) {
      bx = 10;
      y += 6;
    }

    // Label pill (dark)
    doc.setFillColor(...b.color);
    doc.roundedRect(bx, y, labelW, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(b.label, bx + labelW / 2, y + 3.1, { align: 'center' });

    // Value pill (light)
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(bx + labelW, y, valueW, 4.5, 1, 1, 'F');
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'normal');
    doc.text(b.value, bx + labelW + valueW / 2, y + 3.1, { align: 'center' });

    bx += w + 2;
  }
  return y + 7;
}

function drawCourseImage(
  doc: jsPDF,
  imgData: string,
  imgPxW: number,
  imgPxH: number,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  const ratio = Math.min(maxW / imgPxW, maxH / imgPxH);
  const drawW = imgPxW * ratio;
  const drawH = imgPxH * ratio;
  const cx = x + (maxW - drawW) / 2;
  const cy = y + (maxH - drawH) / 2;

  // Thin frame
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(cx - 0.8, cy - 0.8, drawW + 1.6, drawH + 1.6);

  doc.addImage(imgData, 'PNG', cx, cy, drawW, drawH);
}

/* ========== Obstacle icon mini-renderers for legend ========== */

function drawLegendIcon(
  doc: jsPDF,
  type: string,
  x: number,
  y: number,
  size: number,
) {
  const c = x + size / 2;
  const m = y + size / 2;
  doc.setLineWidth(0.4);
  doc.setDrawColor(60, 60, 60);
  doc.setFillColor(255, 255, 255);

  switch (type) {
    case 'jump':
      doc.setDrawColor(180, 40, 40);
      doc.setLineWidth(0.6);
      doc.line(x + 1.5, m, x + size - 1.5, m);
      doc.setFillColor(180, 40, 40);
      doc.rect(x + 1, m - 1.5, 0.8, 3, 'F');
      doc.rect(x + size - 1.8, m - 1.5, 0.8, 3, 'F');
      break;
    case 'oxer':
      doc.setDrawColor(180, 40, 40);
      doc.setLineWidth(0.6);
      doc.line(x + 1.5, m - 1, x + size - 1.5, m - 1);
      doc.line(x + 1.5, m + 1, x + size - 1.5, m + 1);
      doc.setFillColor(180, 40, 40);
      doc.rect(x + 1, m - 2, 0.8, 4, 'F');
      doc.rect(x + size - 1.8, m - 2, 0.8, 4, 'F');
      break;
    case 'wall':
      doc.setFillColor(130, 130, 130);
      doc.rect(x + 1, m - 1.5, size - 2, 3, 'F');
      break;
    case 'long_jump':
      doc.setFillColor(60, 110, 180);
      doc.rect(x + 1, m - 2, size - 2, 1.8, 'F');
      doc.setFillColor(200, 200, 220);
      doc.rect(x + 1, m, size - 2, 1.8, 'F');
      break;
    case 'tunnel':
    case 'hoopers_tunnel':
      doc.setDrawColor(180, 130, 50);
      doc.setLineWidth(1.2);
      doc.line(c, y + 1.5, c, y + size - 1.5);
      break;
    case 'a_frame':
      doc.setDrawColor(60, 60, 60);
      doc.setFillColor(230, 190, 50);
      doc.triangle(x + 1.5, y + size - 1.5, c, y + 1.5, x + size - 1.5, y + size - 1.5, 'FD');
      break;
    case 'dog_walk':
      doc.setFillColor(230, 190, 50);
      doc.rect(x + 0.8, m - 1, size - 1.6, 2, 'F');
      doc.setFillColor(180, 40, 40);
      doc.rect(x + 0.8, m - 1, 1.5, 2, 'F');
      doc.rect(x + size - 2.3, m - 1, 1.5, 2, 'F');
      break;
    case 'seesaw':
      doc.setFillColor(80, 150, 80);
      doc.rect(x + 0.8, m - 1, size - 1.6, 2, 'F');
      doc.setFillColor(180, 40, 40);
      doc.rect(x + 0.8, m - 1, 1.3, 2, 'F');
      doc.rect(x + size - 2.1, m - 1, 1.3, 2, 'F');
      doc.setFillColor(50, 50, 50);
      doc.circle(c, m, 0.5, 'F');
      break;
    case 'weave':
      doc.setFillColor(180, 40, 40);
      for (let i = 0; i < 6; i++) {
        doc.circle(x + 1.5 + i * ((size - 3) / 5), m, 0.5, 'F');
      }
      break;
    case 'tire':
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.8);
      doc.circle(c, m, (size - 3) / 2);
      doc.setDrawColor(230, 190, 50);
      doc.setLineWidth(0.5);
      doc.circle(c, m, (size - 6) / 2);
      break;
    case 'start':
    case 'finish':
      doc.setDrawColor(40, 130, 40);
      doc.setLineWidth(0.8);
      doc.line(x + 1.5, y + 2, x + 1.5, y + size - 2);
      doc.line(x + size - 1.5, y + 2, x + size - 1.5, y + size - 2);
      doc.setLineDashPattern([0.8, 0.8], 0);
      doc.line(x + 1.5, m, x + size - 1.5, m);
      doc.setLineDashPattern([], 0);
      break;
    case 'hoop':
      doc.setDrawColor(200, 160, 40);
      doc.setLineWidth(0.8);
      doc.ellipse(c, m, (size - 3) / 2, 1.5);
      break;
    case 'barrel':
      doc.setFillColor(60, 110, 180);
      doc.circle(c, m, (size - 4) / 2, 'F');
      doc.setLineDashPattern([0.5, 0.5], 0);
      doc.setDrawColor(30, 70, 130);
      doc.line(c - (size - 4) / 2, m, c + (size - 4) / 2, m);
      doc.setLineDashPattern([], 0);
      break;
    case 'gate':
      doc.setFillColor(230, 140, 50);
      doc.rect(x + 1, m - 1, size - 2, 2, 'F');
      break;
    case 'handler_zone':
      doc.setDrawColor(180, 40, 40);
      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.setLineWidth(0.3);
      doc.rect(x + 1.5, y + 1.5, size - 3, size - 3);
      doc.setLineDashPattern([], 0);
      break;
    default:
      doc.setFillColor(120, 120, 120);
      doc.rect(x + 1, y + 1, size - 2, size - 2, 'F');
  }
}

function getUsedTypes(obstacles: PDFObstacle[]): string[] {
  const set = new Set<string>();
  obstacles.forEach((o) => set.add(o.type));
  return Array.from(set);
}

const TYPE_LABELS: Record<string, string> = {
  jump: 'Hopp',
  oxer: 'Oxer',
  wall: 'Mur',
  long_jump: 'Långhopp',
  tunnel: 'Tunnel',
  a_frame: 'A-hinder',
  dog_walk: 'Brygga',
  seesaw: 'Vipp',
  balance: 'Balans',
  weave: 'Slalom',
  tire: 'Däck',
  start: 'Start',
  finish: 'Mål',
  hoop: 'Hoop',
  hoopers_tunnel: 'Tunnel (Hoopers)',
  barrel: 'Tunna',
  gate: 'Staket',
  handler_zone: 'Dirigeringsområde (DO)',
};

function drawLegend(
  doc: jsPDF,
  obstacles: PDFObstacle[],
  x: number,
  y: number,
  maxW: number,
): number {
  const types = getUsedTypes(obstacles);
  if (types.length === 0) return y;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Hinderlegend', x, y);
  y += 4;

  const iconSize = 7;
  const gap = 3;
  const itemH = 8;
  const colsPerRow = Math.max(1, Math.floor(maxW / 55));
  const colW = maxW / colsPerRow;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  types.forEach((type, idx) => {
    const col = idx % colsPerRow;
    const row = Math.floor(idx / colsPerRow);
    const ix = x + col * colW;
    const iy = y + row * itemH;

    drawLegendIcon(doc, type, ix, iy, iconSize);
    doc.setTextColor(...INK);
    doc.text(TYPE_LABELS[type] ?? type, ix + iconSize + gap, iy + iconSize / 2 + 1.2);
  });

  const rows = Math.ceil(types.length / colsPerRow);
  return y + rows * itemH + 2;
}

/* ========== Statistics computation ========== */

function computeStats(opts: PDFExportOptions) {
  const PX_PER_METER = opts.pxPerMeter;
  const METERS_PER_PX = 1 / PX_PER_METER;

  // Sort by numbering
  const numbered = opts.obstacles
    .filter((o) => (o.colorNumbers || o.numbers || []).length > 0)
    .map((o) => ({
      obs: o,
      num: Math.min(...(o.colorNumbers?.map((e) => e.num) || o.numbers)),
    }))
    .sort((a, b) => a.num - b.num);

  // Course length through numbered obstacles
  let lengthM = 0;
  for (let i = 1; i < numbered.length; i++) {
    const a = numbered[i - 1].obs;
    const b = numbered[i].obs;
    lengthM += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) * METERS_PER_PX;
  }

  // Turn analysis
  let sharpTurns = 0;
  let totalTurnDeg = 0;
  for (let i = 1; i < numbered.length - 1; i++) {
    const a = numbered[i - 1].obs;
    const b = numbered[i].obs;
    const c = numbered[i + 1].obs;
    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const dot = v1x * v2x + v1y * v2y;
    const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (m1 > 0 && m2 > 0) {
      const angle = (Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI;
      totalTurnDeg += angle;
      if (angle > 90) sharpTurns++;
    }
  }

  // Obstacle breakdown
  const typeCounts: Record<string, number> = {};
  opts.obstacles.forEach((o) => {
    if (o.type === 'start' || o.type === 'finish' || o.type === 'handler_zone') return;
    typeCounts[o.type] = (typeCounts[o.type] ?? 0) + 1;
  });

  const totalObstacles = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  const jumpTypes = ['jump', 'oxer', 'wall', 'long_jump', 'tire'];
  const contactTypes = ['a_frame', 'dog_walk', 'seesaw', 'balance'];
  const jumpCount = jumpTypes.reduce((a, t) => a + (typeCounts[t] ?? 0), 0);
  const contactCount = contactTypes.reduce((a, t) => a + (typeCounts[t] ?? 0), 0);
  const tunnelCount = (typeCounts['tunnel'] ?? 0) + (typeCounts['hoopers_tunnel'] ?? 0);
  const weaveCount = typeCounts['weave'] ?? 0;

  return {
    lengthM: Math.round(lengthM * 10) / 10,
    numberedCount: numbered.length,
    totalObstacles,
    jumpCount,
    contactCount,
    tunnelCount,
    weaveCount,
    sharpTurns,
    avgTurnDeg: numbered.length > 2 ? totalTurnDeg / (numbered.length - 2) : 0,
    typeCounts,
  };
}

/* ========== Page: Statistics ========== */

function drawStatisticsPage(
  doc: jsPDF,
  opts: PDFExportOptions,
  pageW: number,
  pageH: number,
) {
  drawHeaderBand(doc, opts, pageW);
  let y = drawCourseInfoRow(doc, opts, pageW, 28);

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text('Bananalys & Statistik', 10, y);
  y += 2;
  doc.setDrawColor(...BRAND_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(10, y, pageW - 10, y);
  y += 8;

  const stats = computeStats(opts);

  // Key metrics cards
  const cards = [
    { label: 'Banlängd', value: `${stats.lengthM} m`, hint: 'mellan numrerade hinder' },
    { label: 'Numrerade hinder', value: `${stats.numberedCount}`, hint: `av ${stats.totalObstacles} totalt` },
    { label: 'Skarpa svängar', value: `${stats.sharpTurns}`, hint: '>90° riktning' },
    { label: 'Medelsväng', value: `${Math.round(stats.avgTurnDeg)}°`, hint: 'per hinderpassering' },
  ];
  const cardW = (pageW - 20 - 3 * 4) / 4;
  cards.forEach((c, i) => {
    const cx = 10 + i * (cardW + 4);
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(cx, y, cardW, 20, 2, 2, 'F');
    doc.setDrawColor(...BRAND_PRIMARY);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, 20, 2, 2, 'S');
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label.toUpperCase(), cx + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...BRAND_PRIMARY);
    doc.text(c.value, cx + 3, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(c.hint, cx + 3, y + 17);
  });
  y += 26;

  // SCT table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text('Riktmärken för SCT (Standard Course Time)', 10, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Ungefärlig bantid baserat på banlängd och typisk hastighet per storleksklass (Klass 1-2 referens).', 10, y + 4);
  y += 10;

  // Table header
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(10, y, pageW - 20, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Storleksklass', 14, y + 4.8);
  doc.text('Hastighet', 80, y + 4.8);
  doc.text('SCT', 115, y + 4.8);
  doc.text('Max-tid (+25%)', 145, y + 4.8);
  y += 7;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  DOG_SPEEDS.forEach((d, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 247, 243);
      doc.rect(10, y, pageW - 20, 7, 'F');
    }
    const sct = stats.lengthM > 0 ? Math.round(stats.lengthM / d.speed) : 0;
    const maxT = Math.round(sct * 1.25);
    doc.setTextColor(...INK);
    doc.text(d.label, 14, y + 4.8);
    doc.text(`${d.speed.toFixed(1)} m/s`, 80, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.text(stats.lengthM > 0 ? `${sct} s` : '—', 115, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(stats.lengthM > 0 ? `${maxT} s` : '—', 145, y + 4.8);
    y += 7;
  });

  y += 6;

  // Obstacle breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text('Hinderfördelning', 10, y);
  y += 6;

  const breakdown = [
    { label: 'Hopphinder', val: stats.jumpCount, color: BRAND_SECONDARY },
    { label: 'Kontaktfält', val: stats.contactCount, color: [230, 190, 50] as [number, number, number] },
    { label: 'Tunnlar', val: stats.tunnelCount, color: [180, 130, 50] as [number, number, number] },
    { label: 'Slalom', val: stats.weaveCount, color: [130, 60, 130] as [number, number, number] },
  ];

  const barMaxW = pageW - 60;
  const maxVal = Math.max(1, ...breakdown.map((b) => b.val));
  breakdown.forEach((b) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(b.label, 10, y + 4);
    const barW = (b.val / maxVal) * barMaxW;
    doc.setFillColor(235, 232, 225);
    doc.rect(45, y + 1, barMaxW, 5, 'F');
    doc.setFillColor(...b.color);
    doc.rect(45, y + 1, Math.max(0.5, barW), 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(`${b.val}`, 45 + barMaxW + 3, y + 4);
    y += 8;
  });

  // Legend section
  y += 4;
  drawLegend(doc, opts.obstacles, 10, y, pageW - 20);
}

/* ========== Page: Overview ========== */

function drawOverviewPage(
  doc: jsPDF,
  opts: PDFExportOptions,
  pageW: number,
  pageH: number,
  imgPxW: number,
  imgPxH: number,
) {
  drawHeaderBand(doc, opts, pageW);
  const y = drawCourseInfoRow(doc, opts, pageW, 28);

  // Course image
  const imgMaxH = pageH - y - 16;
  drawCourseImage(
    doc,
    opts.overviewImageData,
    imgPxW,
    imgPxH,
    10,
    y,
    pageW - 20,
    imgMaxH,
  );
}

/* ========== Page: Handler path ========== */

function drawHandlerPathPage(
  doc: jsPDF,
  opts: PDFExportOptions,
  pageW: number,
  pageH: number,
  imgPxW: number,
  imgPxH: number,
) {
  drawHeaderBand(doc, opts, pageW);
  let y = drawCourseInfoRow(doc, opts, pageW, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text('Förarens väg (handler path)', 10, y);
  y += 2;
  doc.setDrawColor(...BRAND_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(10, y, pageW - 10, y);
  y += 6;

  const imgData = opts.handlerPathImageData ?? opts.overviewImageData;
  const imgMaxH = pageH - y - 16;
  drawCourseImage(doc, imgData, imgPxW, imgPxH, 10, y, pageW - 20, imgMaxH);
}

/* ========== Page: Notes ========== */

function drawNotesPage(doc: jsPDF, opts: PDFExportOptions, pageW: number, pageH: number) {
  drawHeaderBand(doc, opts, pageW);
  let y = drawCourseInfoRow(doc, opts, pageW, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text('Anteckningar', 10, y);
  y += 2;
  doc.setDrawColor(...BRAND_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(10, y, pageW - 10, y);
  y += 8;

  // Info boxes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Domare / Domslut:', 10, y);
  doc.text('Vinnare:', pageW / 2 + 5, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(10, y + 4, pageW / 2 - 5, y + 4);
  doc.line(pageW / 2 + 5, y + 4, pageW - 10, y + 4);
  y += 10;

  doc.text('Datum för bedömning:', 10, y);
  doc.text('Tävling / Klubb:', pageW / 2 + 5, y);
  y += 2;
  doc.line(10, y + 4, pageW / 2 - 5, y + 4);
  doc.line(pageW / 2 + 5, y + 4, pageW - 10, y + 4);
  y += 12;

  // Notes grid (ruled area)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Observationer & kommentarer:', 10, y);
  y += 4;

  const lineH = 6;
  const linesEndY = pageH - 16;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  while (y < linesEndY) {
    doc.line(10, y, pageW - 10, y);
    y += lineH;
  }
}

/* ========== MAIN EXPORT FUNCTION ========== */

export async function exportCoursePDF(
  opts: PDFExportOptions,
  imgPxW: number,
  imgPxH: number,
): Promise<void> {
  const widthM = opts.canvasWidth / opts.pxPerMeter;
  const heightM = opts.canvasHeight / opts.pxPerMeter;
  const isWide = widthM >= heightM;

  const doc = new jsPDF({
    orientation: isWide ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Determine pages to include
  const hasHandlerPath = opts.handlerPath.length > 1 && !!opts.handlerPathImageData;
  const pages: Array<(doc: jsPDF) => void> = [
    (d) => drawOverviewPage(d, opts, pageW, pageH, imgPxW, imgPxH),
  ];
  if (hasHandlerPath) {
    pages.push((d) => drawHandlerPathPage(d, opts, pageW, pageH, imgPxW, imgPxH));
  }
  pages.push((d) => drawStatisticsPage(d, opts, pageW, pageH));
  pages.push((d) => drawNotesPage(d, opts, pageW, pageH));

  const totalPages = pages.length;

  pages.forEach((pageFn, idx) => {
    if (idx > 0) doc.addPage();
    pageFn(doc);
    drawFooter(doc, opts, pageW, pageH, idx + 1, totalPages);
  });

  // Safe file name
  const fileName = (opts.courseName || 'bana')
    .replace(/[^a-zA-Z0-9åäöÅÄÖ_-]/g, '_')
    .toLowerCase();
  doc.save(`agilitymanager-${fileName}.pdf`);
}
