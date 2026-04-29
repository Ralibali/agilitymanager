/**
 * Sprint 2 — Domar-PDF för Banplaneraren v2.
 * Genererar en A4-stående PDF med banbild (SVG-rasterisering via canvas),
 * meta, hinderlista och tider.
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

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(input.name || "Bana", margin, margin + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  const headerLine = [
    input.sport === "agility" ? "Agility" : "Hoopers",
    tpl?.label,
    `Storleksklass ${sizeDef.label}`,
    `${input.arenaWidthM} × ${input.arenaHeightM} m`,
  ].filter(Boolean).join("  ·  ");
  doc.text(headerLine, margin, margin + 10);
  doc.setTextColor(0);

  // Meta-rutor
  let y = margin + 16;
  const cols = [
    { label: "Hinder", value: `${input.obstacles.filter((o) => !["start", "finish", "number"].includes(o.type)).length}` },
    { label: "Banlängd", value: `${times.lengthM.toFixed(1)} m` },
    { label: "Referenstid", value: times.refTimeS != null ? `${times.refTimeS} s` : "—" },
    { label: "Maxtid", value: times.maxTimeS != null ? `${times.maxTimeS} s` : "—" },
  ];
  const colW = (pageW - margin * 2) / cols.length;
  cols.forEach((c, i) => {
    const x = margin + i * colW;
    doc.setDrawColor(220);
    doc.roundedRect(x, y, colW - 2, 16, 1.5, 1.5);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(c.label.toUpperCase(), x + 3, y + 5);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(c.value, x + 3, y + 12);
    doc.setFont("helvetica", "normal");
  });
  y += 22;

  // Banbild
  if (input.svgElement) {
    const png = await svgToPngDataUrl(input.svgElement, 1200);
    if (png) {
      const imgW = pageW - margin * 2;
      const ratio = input.arenaHeightM / Math.max(1, input.arenaWidthM);
      const imgH = Math.min(imgW * ratio, pageH - y - 90);
      doc.addImage(png, "PNG", margin, y, imgW, imgH, undefined, "FAST");
      y += imgH + 6;
    }
  }

  // Hinderlista
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Hinderordning", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setDrawColor(230);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  const numbered = input.obstacles
    .filter((o) => o.number != null && !["start", "finish", "number"].includes(o.type))
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const listColW = (pageW - margin * 2) / 2;
  const startY = y;
  numbered.forEach((ob, idx) => {
    const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
    const col = Math.floor(idx / 12);
    const row = idx % 12;
    const lineY = startY + row * 5.5;
    if (lineY > pageH - 18) return;
    const x = margin + col * listColW;
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.text(`${ob.number}.`, x, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(`${def?.label ?? ob.type}`, x + 8, lineY);
    doc.setTextColor(140);
    doc.text(`x=${ob.x.toFixed(1)}  y=${ob.y.toFixed(1)}  ${Math.round(ob.rotation)}°`, x + 60, lineY);
    doc.setTextColor(0);
  });

  // Issues fotnot
  if (issues.length > 0) {
    const errs = issues.filter((i) => i.level === "error").length;
    const warns = issues.filter((i) => i.level === "warning").length;
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(
      `Validering: ${errs} fel · ${warns} varningar (se planerare för detaljer)`,
      margin, pageH - margin,
    );
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(160);
  doc.text(
    `Skapad ${new Date().toLocaleString("sv-SE")} · agilitymanager.lovable.app`,
    pageW - margin, pageH - margin,
    { align: "right" },
  );

  const safeName = (input.name || "bana").replace(/[^a-z0-9åäö_-]+/gi, "_");
  doc.save(`${safeName}_domarbana.pdf`);
}
