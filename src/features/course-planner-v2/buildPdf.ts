/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Bygg-PDF — banbild med tydligt rutnät, hindertabell, valideringssammanfattning.
 */
import jsPDF from "jspdf";
import {
  CLASS_TEMPLATES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type SizeClassKey, type Sport,
} from "./config";
import { validateCourse, type ObstacleLite } from "./validation";
import { PDF_BRAND, PDF_PAGE, drawArenaVector, drawHeaderBand, drawFooterAllPages, safeFileName } from "./pdfHelpers";

export interface BuildPdfInput {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleLite[];
  authorName?: string;
}

export async function exportBuildPdf(input: BuildPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = PDF_PAGE.margin;
  const pageW = PDF_PAGE.width;
  const pageH = PDF_PAGE.height;

  const tpl = input.classTemplate ? CLASS_TEMPLATES.find((t) => t.key === input.classTemplate) : null;

  /* SIDA 1 — banbild + grid */
  drawHeaderBand(doc, {
    title: input.name || "Bygganvisning",
    subtitle: [
      input.sport === "agility" ? "Agility" : "Hoopers",
      tpl?.label,
      `${input.arenaWidthM} × ${input.arenaHeightM} m`,
    ].filter(Boolean).join("  ·  "),
    badge: "BYGG",
  });

  doc.setTextColor(...PDF_BRAND.muted);
  doc.setFontSize(8);
  doc.text("Rutnät: 1 m fina linjer · 5 m grova linjer · alla mått i meter", margin, 28);

  const arenaResult = drawArenaVector(doc, {
    x: margin, y: 32,
    maxWidth: pageW - margin * 2,
    maxHeight: pageH - 32 - 12,
    arenaWidthM: input.arenaWidthM,
    arenaHeightM: input.arenaHeightM,
    obstacles: input.obstacles,
    grid: true, showPath: false,
    numberBadgeMm: 3,
  });

  // Skala-info under banan
  const sy = 32 + arenaResult.h + 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(`Skala: ${(arenaResult.mmPerM).toFixed(2)} mm = 1 m`, margin, sy);

  /* SIDA 2 — Hindertabell */
  doc.addPage();
  drawHeaderBand(doc, {
    title: "Hindertabell",
    subtitle: input.name || "Bygganvisning",
    badge: "BYGG",
  });

  let y = 32;
  const table = [...input.obstacles]
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.type.localeCompare(b.type));

  // Tabell-headers
  const cols = [
    { key: "n", label: "#", w: 12, align: "left" as const },
    { key: "type", label: "Typ", w: 50, align: "left" as const },
    { key: "x", label: "X (m)", w: 24, align: "right" as const },
    { key: "y", label: "Y (m)", w: 24, align: "right" as const },
    { key: "rot", label: "Rot", w: 18, align: "right" as const },
    { key: "note", label: "Anteckning", w: 58, align: "left" as const },
  ];
  doc.setFillColor(...PDF_BRAND.primary);
  doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 6, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let cx = margin + 2;
  cols.forEach((c) => {
    const x = c.align === "right" ? cx + c.w - 4 : cx;
    doc.text(c.label, x, y + 4, { align: c.align });
    cx += c.w;
  });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_BRAND.ink);
  doc.setFontSize(8.5);
  table.forEach((ob, idx) => {
    if (y > pageH - 22) {
      doc.addPage();
      drawHeaderBand(doc, { title: "Hindertabell (forts.)", subtitle: input.name || "", badge: "BYGG" });
      y = 32;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(249, 248, 246);
      doc.rect(margin, y - 0.5, cols.reduce((a, c) => a + c.w, 0), 5.5, "F");
    }
    const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
    const cells = [
      ob.number != null ? String(ob.number) : "—",
      def?.label ?? ob.type,
      ob.x.toFixed(1),
      ob.y.toFixed(1),
      `${Math.round(ob.rotation)}°`,
      "",
    ];
    let xi = margin + 2;
    cells.forEach((c, i) => {
      const col = cols[i];
      const x = col.align === "right" ? xi + col.w - 4 : xi;
      doc.text(c, x, y + 4, { align: col.align });
      xi += col.w;
    });
    // skrivlinje för anteckning
    doc.setDrawColor(...PDF_BRAND.line);
    doc.line(margin + cols.slice(0, 5).reduce((a, c) => a + c.w, 0) + 2, y + 4.5, margin + cols.reduce((a, c) => a + c.w, 0) - 2, y + 4.5);
    y += 5.5;
  });

  /* SIDA 3 (eller fortsättning) — Valideringssammanfattning */
  const issues = validateCourse({
    sport: input.sport, sizeClass: input.sizeClass,
    arenaWidthM: input.arenaWidthM, arenaHeightM: input.arenaHeightM,
    classTemplate: input.classTemplate, obstacles: input.obstacles,
  });

  if (y + 40 > pageH - 14) {
    doc.addPage();
    drawHeaderBand(doc, { title: "Validering", subtitle: input.name || "", badge: "BYGG" });
    y = 32;
  } else {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_BRAND.ink);
    doc.text("Validering", margin, y);
    y += 6;
  }

  const errs = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (issues.length === 0) {
    doc.setTextColor(...PDF_BRAND.primary);
    doc.text("✓ Inga regelproblem hittades.", margin, y);
    y += 6;
  } else {
    const sections: { title: string; items: typeof issues; color: [number, number, number] }[] = [
      { title: `Fel (${errs.length})`, items: errs, color: PDF_BRAND.error },
      { title: `Varningar (${warns.length})`, items: warns, color: PDF_BRAND.warning },
      { title: `Info (${infos.length})`, items: infos, color: PDF_BRAND.muted },
    ];
    for (const sec of sections) {
      if (sec.items.length === 0) continue;
      if (y > pageH - 22) {
        doc.addPage();
        drawHeaderBand(doc, { title: "Validering (forts.)", subtitle: input.name || "", badge: "BYGG" });
        y = 32;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...sec.color);
      doc.text(sec.title, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_BRAND.ink);
      for (const issue of sec.items) {
        if (y > pageH - 22) {
          doc.addPage();
          drawHeaderBand(doc, { title: "Validering (forts.)", subtitle: input.name || "", badge: "BYGG" });
          y = 32;
        }
        const lines = doc.splitTextToSize(`• ${issue.message}`, pageW - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 4.2;
      }
      y += 3;
    }
  }

  drawFooterAllPages(doc, { authorName: input.authorName ?? "" });
  doc.save(`${safeFileName(input.name)}_bygg.pdf`);
}
