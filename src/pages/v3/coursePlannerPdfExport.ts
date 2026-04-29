import jsPDF from "jspdf";

// ==== Typer (speglar V3CoursePlannerPageFixed) ====
export type PdfPoint = { x: number; y: number };
export type PdfShape = "bar" | "wide" | "long" | "circle" | "tunnel" | "zone" | "triangle";
export type PdfObstacle = {
  id: string;
  type: string;
  label: string;
  shape: PdfShape;
  category: string;
  x: number;
  y: number;
  rotation: number;
  number?: number;
  color?: string;
};
export type PdfDrawPath = { id: string; points: PdfPoint[]; color: string; width: number };
export type PdfFreeNumber = { id: string; x: number; y: number; num: number; color: string };
export type PdfCourse = {
  obstacles: PdfObstacle[];
  paths: PdfDrawPath[];
  numbers: PdfFreeNumber[];
  width: number;
  height: number;
  name: string;
};
export type PdfMeta = {
  mode: "Agility" | "Hoopers";
  creator?: string;
  location?: string;
  notes?: string;
};

const NAVY: [number, number, number] = [32, 36, 95];
const FOREST: [number, number, number] = [26, 107, 60];
const CREAM: [number, number, number] = [249, 248, 246];
const GRASS_LIGHT: [number, number, number] = [188, 214, 168];
const GRASS_DARK: [number, number, number] = [142, 184, 120];
const RED: [number, number, number] = [231, 75, 75];
const TEXT_DARK: [number, number, number] = [40, 50, 45];
const TEXT_MUTED: [number, number, number] = [110, 115, 110];

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

// === Beräknad banstatistik ===
function computeStats(course: PdfCourse) {
  // Banlängd (m): summera segment mellan numrerade hinder i nummer-ordning, annars längs ritlinjer.
  const numbered = course.obstacles
    .filter((o) => typeof o.number === "number")
    .sort((a, b) => (a.number! - b.number!));
  let lenM = 0;
  if (numbered.length >= 2) {
    for (let i = 1; i < numbered.length; i++) {
      const a = numbered[i - 1];
      const b = numbered[i];
      // x/y är 0–100 → meter
      const dx = ((b.x - a.x) / 100) * course.width;
      const dy = ((b.y - a.y) / 100) * course.height;
      lenM += Math.hypot(dx, dy);
    }
  } else {
    for (const path of course.paths) {
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1];
        const b = path.points[i];
        const dx = ((b.x - a.x) / 100) * course.width;
        const dy = ((b.y - a.y) / 100) * course.height;
        lenM += Math.hypot(dx, dy);
      }
    }
  }
  // Antal per kategori
  const byCat = new Map<string, number>();
  for (const o of course.obstacles) byCat.set(o.category, (byCat.get(o.category) ?? 0) + 1);
  return {
    lengthM: Math.round(lenM),
    numberedCount: numbered.length,
    obstacleCount: course.obstacles.length,
    pathCount: course.paths.length,
    byCategory: Array.from(byCat.entries()),
  };
}

// === Isometrisk projektion ===
// fältkoordinat (fx, fy) i 0–100 → 3D-värld → 2D-PDF (mm)
function isoProjector(opts: {
  centerX: number; centerY: number; tileW: number; tileH: number;
  cols: number; rows: number;
}) {
  const { centerX, centerY, tileW, tileH, cols, rows } = opts;
  // origin i isometriska världen (övre hörnet), så banan centreras runt centerX/Y
  const originX = centerX;
  const originY = centerY - (cols + rows) * (tileH / 2) / 2 + tileH; // skift uppåt
  return (fx: number, fy: number, z = 0) => {
    const cx = (fx / 100) * cols;
    const cy = (fy / 100) * rows;
    const px = originX + (cx - cy) * (tileW / 2);
    const py = originY + (cx + cy) * (tileH / 2) - z;
    return { x: px, y: py };
  };
}

function fillPolygon(pdf: jsPDF, pts: PdfPoint[], rgb: [number, number, number], stroke?: [number, number, number], lw = 0.2) {
  pdf.setFillColor(...rgb);
  if (stroke) {
    pdf.setDrawColor(...stroke);
    pdf.setLineWidth(lw);
  }
  // jsPDF saknar polygon med "FD" enkelt → använd lines
  const start = pts[0];
  const lines: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) lines.push([pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y]);
  // stäng
  lines.push([pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y]);
  // @ts-expect-error – jsPDF lines styles parameter
  pdf.lines(lines, start.x, start.y, [1, 1], stroke ? "FD" : "F", true);
}

function drawIsoGrass(pdf: jsPDF, project: (fx: number, fy: number, z?: number) => PdfPoint, gridW: number, gridH: number) {
  // Hela bangolvet som en snygg romb med soft-skugga under
  const c00 = project(0, 0);
  const c10 = project(100, 0);
  const c11 = project(100, 100);
  const c01 = project(0, 100);
  // Mjuk skugga
  fillPolygon(
    pdf,
    [
      { x: c00.x + 1.5, y: c00.y + 3 },
      { x: c10.x + 1.5, y: c10.y + 3 },
      { x: c11.x + 1.5, y: c11.y + 3 },
      { x: c01.x + 1.5, y: c01.y + 3 },
    ],
    [225, 225, 220],
  );
  // Två gräs-toner (checker-känsla)
  const tilesX = Math.min(gridW, 20);
  const tilesY = Math.min(gridH, 20);
  for (let i = 0; i < tilesX; i++) {
    for (let j = 0; j < tilesY; j++) {
      const fx0 = (i / tilesX) * 100;
      const fy0 = (j / tilesY) * 100;
      const fx1 = ((i + 1) / tilesX) * 100;
      const fy1 = ((j + 1) / tilesY) * 100;
      const a = project(fx0, fy0);
      const b = project(fx1, fy0);
      const c = project(fx1, fy1);
      const d = project(fx0, fy1);
      fillPolygon(pdf, [a, b, c, d], (i + j) % 2 === 0 ? GRASS_LIGHT : GRASS_DARK);
    }
  }
  // Banram
  pdf.setDrawColor(60, 80, 70);
  pdf.setLineWidth(0.6);
  pdf.line(c00.x, c00.y, c10.x, c10.y);
  pdf.line(c10.x, c10.y, c11.x, c11.y);
  pdf.line(c11.x, c11.y, c01.x, c01.y);
  pdf.line(c01.x, c01.y, c00.x, c00.y);
}

function drawIsoObstacle(
  pdf: jsPDF,
  o: PdfObstacle,
  project: (fx: number, fy: number, z?: number) => PdfPoint,
  scale: number,
) {
  // Storlek på hindret i fältkoordinater (procent av banan)
  const W: Record<PdfShape, [number, number, number]> = {
    bar: [3, 1.2, 4],         // hopp – stång
    wide: [5, 2.4, 3.5],      // oxer/hoop
    long: [9, 1.8, 1.2],      // brygga/vipp
    circle: [3, 3, 3.5],      // däck/tunna
    tunnel: [7, 3, 2.5],      // tunnel
    triangle: [5, 5, 6],      // a-hinder
    zone: [6, 6, 0.4],        // handler-zone (platt matta)
  };
  const [w, d, h] = W[o.shape] ?? [3, 3, 2.5];
  const baseColor = hexToRgb(o.color || "#ffffff");
  const dark: [number, number, number] = [
    Math.max(0, baseColor[0] - 40),
    Math.max(0, baseColor[1] - 40),
    Math.max(0, baseColor[2] - 40),
  ];
  const mid: [number, number, number] = [
    Math.max(0, baseColor[0] - 20),
    Math.max(0, baseColor[1] - 20),
    Math.max(0, baseColor[2] - 20),
  ];

  const cx = o.x;
  const cy = o.y;
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const y0 = cy - d / 2, y1 = cy + d / 2;
  const Z = h * scale;

  // Bottensskugga
  const sa = project(x0, y0);
  const sb = project(x1, y0);
  const sc = project(x1, y1);
  const sd = project(x0, y1);
  fillPolygon(
    pdf,
    [
      { x: sa.x + 1, y: sa.y + 2 },
      { x: sb.x + 1, y: sb.y + 2 },
      { x: sc.x + 1, y: sc.y + 2 },
      { x: sd.x + 1, y: sd.y + 2 },
    ],
    [180, 180, 175],
  );

  if (o.shape === "triangle") {
    // A-hinder: två lutande ramper
    const apex = project(cx, cy, Z);
    const left = project(x0, cy);
    const right = project(x1, cy);
    const back = project(cx, y0);
    const front = project(cx, y1);
    fillPolygon(pdf, [left, apex, back], [220, 70, 70], dark, 0.25);
    fillPolygon(pdf, [right, apex, back], [200, 60, 60], dark, 0.25);
    fillPolygon(pdf, [left, apex, front], [220, 70, 70], dark, 0.25);
    fillPolygon(pdf, [right, apex, front], [200, 60, 60], dark, 0.25);
  } else if (o.shape === "circle") {
    // Däck/tunna: torus-look (ring + skugga)
    const top = project(cx, cy, Z);
    pdf.setFillColor(...mid);
    pdf.setDrawColor(...dark);
    pdf.setLineWidth(0.3);
    // botten
    pdf.ellipse(sa.x + (sc.x - sa.x) / 2, sa.y + (sc.y - sa.y) / 2, Math.abs(sc.x - sa.x) / 2, Math.abs(sc.y - sa.y) / 2, "FD");
    // topp
    pdf.setFillColor(...baseColor);
    pdf.ellipse(top.x, top.y, Math.abs(sc.x - sa.x) / 2, Math.abs(sc.y - sa.y) / 2, "FD");
  } else if (o.shape === "tunnel") {
    // Halvcylinder-look: två sidoplattor + topp
    const ta = project(x0, y0, Z);
    const tb = project(x1, y0, Z);
    const tc = project(x1, y1, Z);
    const td = project(x0, y1, Z);
    fillPolygon(pdf, [sa, sb, tb, ta], dark, dark, 0.2); // baksida
    fillPolygon(pdf, [sb, sc, tc, tb], mid, dark, 0.2); // höger
    fillPolygon(pdf, [ta, tb, tc, td], baseColor, dark, 0.2); // topp
    fillPolygon(pdf, [sa, sd, td, ta], mid, dark, 0.2); // vänster
  } else {
    // Generisk box (hopp, brygga, oxer, slalom, zon …)
    const ta = project(x0, y0, Z);
    const tb = project(x1, y0, Z);
    const tc = project(x1, y1, Z);
    const td = project(x0, y1, Z);
    // Sidor (mörk → ljusare för djup)
    fillPolygon(pdf, [sa, sb, tb, ta], dark, dark, 0.18);
    fillPolygon(pdf, [sb, sc, tc, tb], mid, dark, 0.18);
    fillPolygon(pdf, [sc, sd, td, tc], dark, dark, 0.18);
    fillPolygon(pdf, [sd, sa, ta, td], mid, dark, 0.18);
    // Topp
    fillPolygon(pdf, [ta, tb, tc, td], baseColor, dark, 0.22);

    // Hopp-stångdetalj
    if (o.shape === "bar") {
      pdf.setDrawColor(...RED);
      pdf.setLineWidth(0.6);
      pdf.line(ta.x, ta.y, tb.x, tb.y);
      pdf.line(td.x, td.y, tc.x, tc.y);
    }
  }

  // Nummerskylt ovanför hindret
  if (o.number) {
    const tag = project(cx, cy, Z + 4);
    pdf.setFillColor(...FOREST);
    pdf.circle(tag.x, tag.y, 2.6, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text(String(o.number), tag.x, tag.y + 0.9, { align: "center" });
  }
}

function drawIsoNumberedPath(
  pdf: jsPDF,
  course: PdfCourse,
  project: (fx: number, fy: number, z?: number) => PdfPoint,
) {
  const numbered = course.obstacles
    .filter((o) => typeof o.number === "number")
    .sort((a, b) => a.number! - b.number!);
  if (numbered.length < 2) return;
  pdf.setDrawColor(...RED);
  pdf.setLineWidth(0.55);
  // @ts-expect-error – setLineDash inte typat
  if (typeof pdf.setLineDashPattern === "function") pdf.setLineDashPattern([2, 1.6], 0);
  for (let i = 1; i < numbered.length; i++) {
    const a = project(numbered[i - 1].x, numbered[i - 1].y, 1.5);
    const b = project(numbered[i].x, numbered[i].y, 1.5);
    pdf.line(a.x, a.y, b.x, b.y);
  }
  // @ts-expect-error
  if (typeof pdf.setLineDashPattern === "function") pdf.setLineDashPattern([], 0);
}

// === Top-down vy (sida 2) ===
function drawTopDown(pdf: jsPDF, course: PdfCourse, x: number, y: number, w: number, h: number) {
  pdf.setFillColor(248, 250, 246);
  pdf.rect(x, y, w, h, "F");
  // Rutnät
  for (let gx = 0; gx <= course.width; gx++) {
    const px = x + (gx / course.width) * w;
    const c = gx % 5 === 0 ? 200 : 232;
    pdf.setDrawColor(c, c, c);
    pdf.setLineWidth(gx % 5 === 0 ? 0.18 : 0.1);
    pdf.line(px, y, px, y + h);
    if (gx % 5 === 0) {
      pdf.setTextColor(...TEXT_MUTED);
      pdf.setFontSize(5);
      pdf.text(String(gx), px, y + h + 4, { align: "center" });
    }
  }
  for (let gy = 0; gy <= course.height; gy++) {
    const py = y + (gy / course.height) * h;
    const c = gy % 5 === 0 ? 200 : 232;
    pdf.setDrawColor(c, c, c);
    pdf.setLineWidth(gy % 5 === 0 ? 0.18 : 0.1);
    pdf.line(x, py, x + w, py);
    if (gy % 5 === 0 && gy > 0) {
      pdf.setTextColor(...TEXT_MUTED);
      pdf.setFontSize(5);
      pdf.text(String(gy), x - 2, py + 1.4, { align: "right" });
    }
  }
  // Ram
  pdf.setDrawColor(80, 100, 90);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, w, h);

  const toPt = (fx: number, fy: number) => ({ x: x + (fx / 100) * w, y: y + (fy / 100) * h });

  // Ritlinjer
  pdf.setDrawColor(...RED);
  pdf.setLineWidth(0.55);
  // @ts-expect-error
  if (typeof pdf.setLineDashPattern === "function") pdf.setLineDashPattern([2, 1.6], 0);
  for (const path of course.paths) {
    for (let i = 1; i < path.points.length; i++) {
      const a = toPt(path.points[i - 1].x, path.points[i - 1].y);
      const b = toPt(path.points[i].x, path.points[i].y);
      pdf.line(a.x, a.y, b.x, b.y);
    }
  }
  // @ts-expect-error
  if (typeof pdf.setLineDashPattern === "function") pdf.setLineDashPattern([], 0);

  // Hinder
  for (const o of course.obstacles) {
    const p = toPt(o.x, o.y);
    const base = hexToRgb(o.color || "#ffffff");
    pdf.setFillColor(...base);
    pdf.setDrawColor(60, 80, 70);
    pdf.setLineWidth(0.4);
    if (o.shape === "long") pdf.roundedRect(p.x - 5, p.y - 1, 10, 2, 0.6, 0.6, "FD");
    else if (o.shape === "wide" || o.shape === "tunnel") pdf.roundedRect(p.x - 4, p.y - 1.6, 8, 3.2, 0.8, 0.8, "FD");
    else if (o.shape === "triangle") pdf.triangle(p.x, p.y - 3.5, p.x - 3, p.y + 3.5, p.x + 3, p.y + 3.5, "FD");
    else if (o.shape === "circle") pdf.circle(p.x, p.y, 2.6, "FD");
    else pdf.roundedRect(p.x - 2.4, p.y - 2.4, 4.8, 4.8, 0.6, 0.6, "FD");

    if (o.number) {
      pdf.setFillColor(...FOREST);
      pdf.circle(p.x + 3.6, p.y - 3.6, 1.9, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(4.4);
      pdf.text(String(o.number), p.x + 3.6, p.y - 3.05, { align: "center" });
    }
  }
  // Fria nummer
  for (const n of course.numbers) {
    const p = toPt(n.x, n.y);
    pdf.setFillColor(...hexToRgb(n.color || "#ffffff"));
    pdf.circle(p.x, p.y, 2, "F");
    pdf.setTextColor(20, 30, 25);
    pdf.setFontSize(4.4);
    pdf.text(String(n.num), p.x, p.y + 0.7, { align: "center" });
  }
}

// === Header och footer ===
function drawHeader(pdf: jsPDF, title: string, subtitle: string, page: number, totalPages: number) {
  const pageW = 297;
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 18, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(title, 12, 11.5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(subtitle, 12, 15);
  pdf.text(`Sida ${page} / ${totalPages}`, pageW - 12, 11.5, { align: "right" });
}

function drawFooter(pdf: jsPDF, line: string) {
  const pageW = 297, pageH = 210;
  pdf.setDrawColor(220, 220, 215);
  pdf.setLineWidth(0.2);
  pdf.line(12, pageH - 11, pageW - 12, pageH - 11);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text(line, pageW / 2, pageH - 6, { align: "center" });
}

// === Huvudfunktionen ===
export function exportCoursePdf(course: PdfCourse, meta: PdfMeta) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const stats = computeStats(course);
  const now = new Date();
  const dateStr = now.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  const totalPages = 2;

  // ==================== SIDA 1 – 3D-VY ====================
  drawHeader(
    pdf,
    course.name || `${meta.mode}bana`,
    `${meta.mode}  ·  ${course.width} × ${course.height} m  ·  ${dateStr}`,
    1,
    totalPages,
  );

  // Bakgrund (mjuk gradient-känsla via två rektanglar)
  pdf.setFillColor(...CREAM);
  pdf.rect(0, 18, 297, 210 - 18, "F");
  pdf.setFillColor(238, 240, 234);
  pdf.rect(0, 18, 297, 70, "F");

  // Titel ovanför 3D-scenen
  pdf.setTextColor(...TEXT_DARK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("3D-vy av banan", 18, 28);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text("Isometrisk perspektivvy renderad direkt från ditt utkast", 18, 33);

  // Beräkna isometriska parametrar så att hela banan får plats
  const sceneTop = 38;
  const sceneBottom = 175;
  const sceneLeft = 14;
  const sceneRight = 283;
  const sceneW = sceneRight - sceneLeft;
  const sceneH = sceneBottom - sceneTop;
  // Antal "rutor" att rendera = bana i meter (begränsat)
  const cols = Math.min(course.width, 40);
  const rows = Math.min(course.height, 40);
  // Anpassa kakelstorlek
  const tileW = Math.min(sceneW / (cols + rows), 14);
  const tileH = tileW * 0.55;
  const project = isoProjector({
    centerX: sceneLeft + sceneW / 2,
    centerY: sceneTop + sceneH / 2 + 10,
    tileW,
    tileH,
    cols,
    rows,
  });

  drawIsoGrass(pdf, project, cols, rows);
  drawIsoNumberedPath(pdf, course, project);
  // Sortera hinder så bakre ritas först (z-sortering på fx+fy)
  const sorted = [...course.obstacles].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (const o of sorted) drawIsoObstacle(pdf, o, project, 0.35);

  // Info-kort längst ner
  const cardY = 180;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(220, 220, 215);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, cardY, 269, 18, 2, 2, "FD");

  const info: { label: string; value: string }[] = [
    { label: "Skapare", value: meta.creator || "—" },
    { label: "Plats", value: meta.location || "—" },
    { label: "Skapad", value: `${dateStr} ${timeStr}` },
    { label: "Hinder", value: String(stats.obstacleCount) },
    { label: "Numrerade", value: String(stats.numberedCount) },
    { label: "Banlängd", value: stats.lengthM > 0 ? `~${stats.lengthM} m` : "—" },
  ];
  const colW = 269 / info.length;
  info.forEach((it, i) => {
    const cx = 14 + colW * i + colW / 2;
    pdf.setTextColor(...TEXT_MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(it.label.toUpperCase(), cx, cardY + 6, { align: "center" });
    pdf.setTextColor(...TEXT_DARK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(it.value, cx, cardY + 12.5, { align: "center" });
  });

  drawFooter(pdf, "Skapad med AgilityManager – agilitymanager.lovable.app");

  // ==================== SIDA 2 – 2D + DETALJER ====================
  pdf.addPage();
  drawHeader(
    pdf,
    `${course.name || meta.mode + "bana"} – Toppvy & detaljer`,
    `${meta.mode}  ·  ${course.width} × ${course.height} m  ·  ${dateStr}`,
    2,
    totalPages,
  );

  pdf.setFillColor(...CREAM);
  pdf.rect(0, 18, 297, 210 - 18, "F");

  // Toppvy (vänster)
  pdf.setTextColor(...TEXT_DARK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Toppvy (1 ruta = 1 m)", 14, 28);

  const topX = 14, topY = 32;
  const topW = 178;
  const topH = Math.min(150, topW * (course.height / course.width));
  drawTopDown(pdf, course, topX, topY, topW, topH);

  // Höger panel – metadata + hinderlista
  const rx = 200, ry = 28;
  const rw = 84;

  pdf.setTextColor(...TEXT_DARK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Detaljer", rx, ry);

  pdf.setDrawColor(220, 220, 215);
  pdf.setLineWidth(0.3);
  pdf.line(rx, ry + 2, rx + rw, ry + 2);

  const rows1: [string, string][] = [
    ["Sport", meta.mode],
    ["Bannamn", course.name || "—"],
    ["Banstorlek", `${course.width} × ${course.height} m`],
    ["Skapare", meta.creator || "—"],
    ["Plats", meta.location || "—"],
    ["Skapad", `${dateStr} ${timeStr}`],
    ["Hinder totalt", String(stats.obstacleCount)],
    ["Numrerade hinder", String(stats.numberedCount)],
    ["Beräknad banlängd", stats.lengthM > 0 ? `~${stats.lengthM} m` : "—"],
    ["Ritlinjer", String(stats.pathCount)],
  ];
  let yy = ry + 8;
  pdf.setFontSize(7.5);
  for (const [k, v] of rows1) {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(k, rx, yy);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(v, rx + rw, yy, { align: "right" });
    yy += 5;
  }

  // Hinderkategorier
  yy += 3;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...TEXT_DARK);
  pdf.text("Hinder per kategori", rx, yy);
  pdf.setDrawColor(220, 220, 215);
  pdf.line(rx, yy + 1.5, rx + rw, yy + 1.5);
  yy += 6;
  pdf.setFontSize(7.5);
  for (const [cat, count] of stats.byCategory) {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(cat, rx, yy);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(String(count), rx + rw, yy, { align: "right" });
    yy += 4.5;
  }

  // Hinderlista (numrerade) under toppvyn
  const listY = topY + topH + 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_DARK);
  pdf.text("Numrerade hinder", topX, listY);
  pdf.setDrawColor(220, 220, 215);
  pdf.line(topX, listY + 1.5, topX + topW, listY + 1.5);

  const numbered = course.obstacles
    .filter((o) => typeof o.number === "number")
    .sort((a, b) => a.number! - b.number!);
  if (numbered.length === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(...TEXT_MUTED);
    pdf.setFontSize(7.5);
    pdf.text("Inga numrerade hinder.", topX, listY + 8);
  } else {
    // Två kolumner
    const colCount = numbered.length > 8 ? 2 : 1;
    const colWi = topW / colCount;
    pdf.setFontSize(7);
    numbered.forEach((o, i) => {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const cx = topX + col * colWi;
      const cy = listY + 7 + row * 4.5;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...FOREST);
      pdf.text(String(o.number), cx, cy);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...TEXT_DARK);
      pdf.text(o.label, cx + 8, cy);
      pdf.setTextColor(...TEXT_MUTED);
      pdf.text(`(${Math.round((o.x / 100) * course.width)}, ${Math.round((o.y / 100) * course.height)} m)`, cx + colWi - 4, cy, { align: "right" });
    });
  }

  // Ev. anteckningar
  if (meta.notes && meta.notes.trim()) {
    const ny = 200;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text("Anteckningar:", rx, ny);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_MUTED);
    const wrapped = pdf.splitTextToSize(meta.notes, rw);
    pdf.text(wrapped, rx, ny + 4);
  }

  drawFooter(pdf, `Skapad med AgilityManager · ${dateStr} ${timeStr}`);

  pdf.save(`${course.name || meta.mode}.pdf`);
}
