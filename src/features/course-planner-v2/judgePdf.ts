/**
 * Sprint 4 — Polerad domar-PDF för Banplaneraren v2.
 * A4-stående med färgad header, banbild, meta-rutor, klassmall-info och hinderlista.
 */
import jsPDF from "jspdf";
import {
  CLASS_TEMPLATES, SIZE_CLASSES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";
import { computeCourseTimes, validateCourse, type ObstacleLite } from "./validation";

interface JudgePdfInput {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleLite[];
  /** SVG-element för banan (klonas och rasteriseras). */
  svgElement: SVGSVGElement | null;
}

const BRAND = {
  primary: [26, 107, 60] as [number, number, number],     // #1a6b3c
  secondary: [200, 93, 30] as [number, number, number],   // #c85d1e
  ink: [23, 61, 44] as [number, number, number],          // #173d2c
  muted: [120, 120, 120] as [number, number, number],
  line: [225, 225, 225] as [number, number, number],
};

async function svgToPngDataUrl(svg: SVGSVGElement, pxWidth: number): Promise<string | null> {
  try {
    const cloned = svg.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(cloned);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const url = `data:image/svg+xml;base64,${svg64}`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg image load failed"));
      img.src = url;
    });
    const ratio = img.height / Math.max(1, img.width);
    const w = pxWidth;
    const h = Math.round(w * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function exportJudgePdf(input: JudgePdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

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

  /* ─── Header-band ─── */
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFillColor(...BRAND.secondary);
  doc.rect(0, 22, pageW, 1.2, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(input.name || "Bana", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headerLine = [
    input.sport === "agility" ? "Agility" : "Hoopers",
    tpl?.label,
    `Storleksklass ${sizeDef.label}`,
    `${input.arenaWidthM} × ${input.arenaHeightM} m`,
  ].filter(Boolean).join("  ·  ");
  doc.text(headerLine, margin, 17);

  // Sport-badge höger
  const badgeText = input.sport === "agility" ? "AGILITY" : "HOOPERS";
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  const badgeW = doc.getTextWidth(badgeText) + 6;
  doc.roundedRect(pageW - margin - badgeW, 6, badgeW, 8, 2, 2, "F");
  doc.setTextColor(...BRAND.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(badgeText, pageW - margin - badgeW / 2, 11.5, { align: "center" });

  /* ─── Meta-rutor ─── */
  doc.setTextColor(0);
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
    doc.setDrawColor(...BRAND.line);
    doc.roundedRect(x, y, colW - 2, 18, 1.8, 1.8, "FD");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(c.label.toUpperCase(), x + 3, y + 5);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.ink);
    doc.text(c.value, x + 3, y + 11.5);
    if (c.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND.muted);
      doc.text(c.sub, x + 3, y + 15.5);
    }
    doc.setFont("helvetica", "normal");
  });
  y += 24;

  /* ─── Banbild ─── */
  if (input.svgElement) {
    const png = await svgToPngDataUrl(input.svgElement, 1400);
    if (png) {
      const imgW = pageW - margin * 2;
      const ratio = input.arenaHeightM / Math.max(1, input.arenaWidthM);
      const imgH = Math.min(imgW * ratio, pageH - y - 95);
      doc.setDrawColor(...BRAND.line);
      doc.roundedRect(margin - 0.5, y - 0.5, imgW + 1, imgH + 1, 1.5, 1.5);
      doc.addImage(png, "PNG", margin, y, imgW, imgH, undefined, "FAST");
      y += imgH + 6;
    }
  }

  /* ─── Hinderordning ─── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.ink);
  doc.text("Hinderordning", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(`${competingCount} hinder · sortering enligt nummer`, pageW - margin, y, { align: "right" });
  y += 2.5;
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineWidth(0.2);
  y += 4;

  // Tabellhuvud
  const numbered = input.obstacles
    .filter((o) => o.number != null && !["start", "finish", "number"].includes(o.type))
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const listColW = (pageW - margin * 2) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  for (let col = 0; col < 2; col++) {
    const x = margin + col * listColW;
    doc.text("#", x, y);
    doc.text("HINDER", x + 8, y);
    doc.text("X", x + 50, y);
    doc.text("Y", x + 60, y);
    doc.text("ROT", x + 70, y);
  }
  doc.setDrawColor(...BRAND.line);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  const rowsPerCol = 14;
  numbered.forEach((ob, idx) => {
    const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
    const col = Math.floor(idx / rowsPerCol);
    const row = idx % rowsPerCol;
    if (col > 1) return; // max 28 i denna PDF
    const lineY = y + row * 5.2;
    if (lineY > pageH - 22) return;
    const x = margin + col * listColW;
    if (row % 2 === 1) {
      doc.setFillColor(249, 248, 246);
      doc.rect(x - 1, lineY - 3.5, listColW - 4, 4.8, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text(`${ob.number}`, x, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.ink);
    doc.text(`${def?.label ?? ob.type}`, x + 8, lineY);
    doc.setTextColor(...BRAND.muted);
    doc.text(`${ob.x.toFixed(1)}`, x + 50, lineY);
    doc.text(`${ob.y.toFixed(1)}`, x + 60, lineY);
    doc.text(`${Math.round(ob.rotation)}°`, x + 70, lineY);
    doc.setTextColor(...BRAND.ink);
  });

  /* ─── Klass-info / valideringsstatus längst ner ─── */
  const errs = issues.filter((i) => i.level === "error").length;
  const warns = issues.filter((i) => i.level === "warning").length;
  const footerY = pageH - 14;

  // accent-band
  doc.setDrawColor(...BRAND.line);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFontSize(8);
  if (errs > 0) {
    doc.setTextColor(190, 60, 60);
    doc.text(`⚠ ${errs} regelfel · ${warns} varningar`, margin, footerY);
  } else if (warns > 0) {
    doc.setTextColor(180, 120, 30);
    doc.text(`${warns} varningar — banan är godkänd att bygga`, margin, footerY);
  } else {
    doc.setTextColor(...BRAND.primary);
    doc.text(`✓ Banan uppfyller regelverket`, margin, footerY);
  }

  doc.setTextColor(...BRAND.muted);
  doc.text(
    `${new Date().toLocaleString("sv-SE")} · agilitymanager.lovable.app`,
    pageW - margin, footerY, { align: "right" },
  );

  // Sidfot - varumärkesrad
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, pageH - 4, pageW, 4, "F");

  const safeName = (input.name || "bana").replace(/[^a-z0-9åäö_-]+/gi, "_");
  doc.save(`${safeName}_domarbana.pdf`);
}
