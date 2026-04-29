/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Polerad domar-PDF — VEKTOR-rendering, sida 2 statistik, footer på alla sidor.
 *
 * Sida 1: brand-header + meta-rutor + banbild (vektor) + hinderlista
 * Sida 2: statistik (banlängd, SCT per storleksklass, hinderfördelning)
 */
import jsPDF from "jspdf";
import {
  CLASS_TEMPLATES, SIZE_CLASSES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";
import { computeCourseTimes, computeCourseLength, validateCourse, type ObstacleLite } from "./validation";
import { PDF_BRAND, PDF_PAGE, drawArenaVector, drawHeaderBand, drawFooterAllPages, safeFileName } from "./pdfHelpers";

export interface JudgePdfInput {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleLite[];
  /** Författarens visningsnamn för footer. Tomt → "Skapad i Banplaneraren". */
  authorName?: string;
  /** Bakåtkompatibilitet — ignoreras (vi rasteriserar inte längre SVG). */
  svgElement?: SVGSVGElement | null;
}

export async function exportJudgePdf(input: JudgePdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = PDF_PAGE.margin;
  const pageW = PDF_PAGE.width;
  const pageH = PDF_PAGE.height;

  const tpl = input.classTemplate
    ? CLASS_TEMPLATES.find((t) => t.key === input.classTemplate)
    : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === input.sizeClass)!;
  const times = computeCourseTimes({
    sport: input.sport, sizeClass: input.sizeClass,
    arenaWidthM: input.arenaWidthM, arenaHeightM: input.arenaHeightM,
    classTemplate: input.classTemplate, obstacles: input.obstacles,
  });
  const issues = validateCourse({
    sport: input.sport, sizeClass: input.sizeClass,
    arenaWidthM: input.arenaWidthM, arenaHeightM: input.arenaHeightM,
    classTemplate: input.classTemplate, obstacles: input.obstacles,
  });

  /* ─── SIDA 1 ─────────────────────────────── */
  drawHeaderBand(doc, {
    title: input.name || "Bana",
    subtitle: [
      input.sport === "agility" ? "Agility" : "Hoopers",
      tpl?.label,
      `Storleksklass ${sizeDef.label}`,
      `${input.arenaWidthM} × ${input.arenaHeightM} m`,
    ].filter(Boolean).join("  ·  "),
    badge: input.sport === "agility" ? "AGILITY" : "HOOPERS",
  });

  /* Meta-rutor */
  let y = 30;
  const competingCount = input.obstacles.filter((o) => !["start", "finish", "number"].includes(o.type)).length;
  const cols = [
    { label: "Hinder", value: `${competingCount}`, sub: tpl ? `mål ${tpl.obstacleRange[0]}–${tpl.obstacleRange[1]}` : "" },
    { label: "Banlängd", value: `${times.lengthM.toFixed(1)} m`, sub: "mellan numrerade" },
    { label: "Referenstid", value: times.refTimeS != null ? `${times.refTimeS} s` : "—", sub: times.refSpeedMs ? `${times.refSpeedMs} m/s` : "" },
    { label: "Maxtid", value: times.maxTimeS != null ? `${times.maxTimeS} s` : "—", sub: times.maxTimeFactor ? `× ${times.maxTimeFactor}` : "" },
  ];
  const colW = (pageW - margin * 2) / cols.length;
  cols.forEach((c, i) => {
    const x = margin + i * colW;
    doc.setFillColor(249, 248, 246);
    doc.setDrawColor(...PDF_BRAND.line);
    doc.roundedRect(x, y, colW - 2, 18, 1.8, 1.8, "FD");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text(c.label.toUpperCase(), x + 3, y + 5);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND.ink);
    doc.text(c.value, x + 3, y + 11.5);
    if (c.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_BRAND.muted);
      doc.text(c.sub, x + 3, y + 15.5);
    }
    doc.setFont("helvetica", "normal");
  });
  y += 24;

  /* Banbild (vektor) */
  const arenaResult = drawArenaVector(doc, {
    x: margin, y,
    maxWidth: pageW - margin * 2,
    maxHeight: pageH - y - 95,
    arenaWidthM: input.arenaWidthM,
    arenaHeightM: input.arenaHeightM,
    obstacles: input.obstacles,
    grid: true,
    showPath: true,
  });
  y += arenaResult.h + 6;

  /* Hinderlista */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_BRAND.ink);
  doc.text("Hinderordning", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(`${competingCount} hinder · sortering enligt nummer`, pageW - margin, y, { align: "right" });
  y += 2.5;
  doc.setDrawColor(...PDF_BRAND.primary);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineWidth(0.2);
  y += 4;

  const numbered = input.obstacles
    .filter((o) => o.number != null && !["start", "finish", "number"].includes(o.type))
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const listColW = (pageW - margin * 2) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_BRAND.muted);
  for (let col = 0; col < 2; col++) {
    const x = margin + col * listColW;
    doc.text("#", x, y);
    doc.text("HINDER", x + 8, y);
    doc.text("X", x + 50, y);
    doc.text("Y", x + 60, y);
    doc.text("ROT", x + 70, y);
  }
  doc.setDrawColor(...PDF_BRAND.line);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_BRAND.ink);
  const rowsPerCol = 14;
  numbered.forEach((ob, idx) => {
    const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
    const col = Math.floor(idx / rowsPerCol);
    const row = idx % rowsPerCol;
    if (col > 1) return;
    const lineY = y + row * 5.2;
    if (lineY > pageH - 22) return;
    const x = margin + col * listColW;
    if (row % 2 === 1) {
      doc.setFillColor(249, 248, 246);
      doc.rect(x - 1, lineY - 3.5, listColW - 4, 4.8, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND.primary);
    doc.text(`${ob.number}`, x, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_BRAND.ink);
    doc.text(`${def?.label ?? ob.type}`, x + 8, lineY);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text(`${ob.x.toFixed(1)}`, x + 50, lineY);
    doc.text(`${ob.y.toFixed(1)}`, x + 60, lineY);
    doc.text(`${Math.round(ob.rotation)}°`, x + 70, lineY);
    doc.setTextColor(...PDF_BRAND.ink);
  });

  /* Valideringsstatus i botten av sida 1 */
  const errs = issues.filter((i) => i.level === "error").length;
  const warns = issues.filter((i) => i.level === "warning").length;
  const statusY = pageH - 18;
  doc.setFontSize(8);
  if (errs > 0) {
    doc.setTextColor(...PDF_BRAND.error);
    doc.text(`⚠ ${errs} regelfel · ${warns} varningar`, margin, statusY);
  } else if (warns > 0) {
    doc.setTextColor(...PDF_BRAND.warning);
    doc.text(`${warns} varningar — banan är godkänd att bygga`, margin, statusY);
  } else {
    doc.setTextColor(...PDF_BRAND.primary);
    doc.text(`✓ Banan uppfyller regelverket`, margin, statusY);
  }
  doc.setTextColor(0);

  /* ─── SIDA 2 — Statistik ─────────────────── */
  doc.addPage();
  drawHeaderBand(doc, {
    title: "Statistik",
    subtitle: input.name || "Bana",
    badge: input.sport === "agility" ? "AGILITY" : "HOOPERS",
  });

  let sy = 32;
  doc.setTextColor(...PDF_BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Banlängd & tider", margin, sy);
  sy += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lengthM = computeCourseLength(input.obstacles);
  doc.text(`Total banlängd (mellan numrerade hinder): ${lengthM.toFixed(1)} m`, margin, sy);
  sy += 5;
  doc.text(`Antal numrerade hinder: ${numbered.length}`, margin, sy);
  sy += 8;

  /* SCT per storleksklass */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Standard Course Time (SCT) per storleksklass", margin, sy);
  sy += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // SCT-tabell — använder mallens refSpeedMs som bas och skalfaktorer per storlek
  const sctScale: Record<SizeClassKey, number> = { XS: 0.65, S: 0.78, M: 0.9, L: 1.0, XL: 1.0 };
  const baseSpeed = tpl?.refSpeedMs ?? 3.5;
  const tableX = margin;
  const tableY = sy;
  const colWidths = [22, 36, 36, 36, 36, 36];
  const headers = ["Klass", "Hastighet (m/s)", "Banlängd (m)", "SCT (s)", "Maxtid (s)", "Status"];

  doc.setFillColor(...PDF_BRAND.primary);
  doc.rect(tableX, tableY, colWidths.reduce((a, b) => a + b, 0), 6, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  let cx = tableX + 2;
  headers.forEach((h, i) => { doc.text(h, cx, tableY + 4); cx += colWidths[i]; });

  let ry = tableY + 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_BRAND.ink);
  for (const sc of SIZE_CLASSES) {
    const speed = baseSpeed * sctScale[sc.key];
    const sct = lengthM > 0 ? Math.round(lengthM / speed) : null;
    const maxT = sct != null && tpl ? Math.round(sct * tpl.maxTimeFactor) : null;
    const isCurrent = sc.key === input.sizeClass;
    if (isCurrent) {
      doc.setFillColor(245, 240, 230);
      doc.rect(tableX, ry, colWidths.reduce((a, b) => a + b, 0), 5.5, "F");
    }
    cx = tableX + 2;
    const cells = [
      sc.label,
      speed.toFixed(2),
      lengthM.toFixed(1),
      sct != null ? `${sct}` : "—",
      maxT != null ? `${maxT}` : "—",
      isCurrent ? "← vald" : "",
    ];
    if (isCurrent) doc.setFont("helvetica", "bold");
    cells.forEach((c, i) => { doc.text(c, cx, ry + 4); cx += colWidths[i]; });
    if (isCurrent) doc.setFont("helvetica", "normal");
    ry += 5.5;
  }
  sy = ry + 8;

  /* Hinderfördelning — stapeldiagram */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_BRAND.ink);
  doc.text("Hinderfördelning", margin, sy);
  sy += 6;

  const dist = computeDistribution(input.obstacles);
  const maxCount = Math.max(1, ...Object.values(dist));
  const barAreaW = pageW - margin * 2 - 50;
  const rowH = 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let by = sy;
  for (const [cat, count] of Object.entries(dist)) {
    if (count === 0) continue;
    if (by > pageH - 30) break;
    doc.setTextColor(...PDF_BRAND.ink);
    doc.text(cat, margin, by + 4.5);
    const barW = (count / maxCount) * barAreaW;
    doc.setFillColor(...PDF_BRAND.primary);
    doc.rect(margin + 38, by, barW, rowH - 1.5, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    if (barW > 8) doc.text(String(count), margin + 38 + barW - 4, by + 4, { align: "right" });
    else {
      doc.setTextColor(...PDF_BRAND.ink);
      doc.text(String(count), margin + 38 + barW + 2, by + 4);
    }
    doc.setFont("helvetica", "normal");
    by += rowH;
  }

  /* Footer på alla sidor */
  drawFooterAllPages(doc, { authorName: input.authorName ?? "" });

  doc.save(`${safeFileName(input.name)}_domarbana.pdf`);
}

function computeDistribution(obstacles: ObstacleLite[]): Record<string, number> {
  const out: Record<string, number> = {
    "Hopphinder": 0, "Tunnlar": 0, "Slalom": 0, "Balans": 0,
    "Bord": 0, "Hoopers": 0, "Bankontroll": 0, "Områden": 0,
  };
  for (const ob of obstacles) {
    const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
    if (!def) continue;
    out[def.category] = (out[def.category] ?? 0) + 1;
  }
  return out;
}
