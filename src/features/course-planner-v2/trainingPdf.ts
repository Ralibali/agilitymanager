/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Tränings-PDF — banbild + skrivutrymmen för anteckningar.
 */
import jsPDF from "jspdf";
import { CLASS_TEMPLATES, SIZE_CLASSES, type ClassTemplateKey, type SizeClassKey, type Sport } from "./config";
import type { ObstacleLite } from "./validation";
import { PDF_BRAND, PDF_PAGE, drawArenaVector, drawHeaderBand, drawFooterAllPages, safeFileName } from "./pdfHelpers";

export interface TrainingPdfInput {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleLite[];
  authorName?: string;
  /** Hundens namn (valfritt). */
  dogName?: string;
}

export async function exportTrainingPdf(input: TrainingPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = PDF_PAGE.margin;
  const pageW = PDF_PAGE.width;
  const pageH = PDF_PAGE.height;

  drawHeaderBand(doc, {
    title: input.name || "Träningspass",
    subtitle: input.sport === "agility" ? "Träningsbana — agility" : "Träningsbana — hoopers",
    badge: "TRÄNING",
  });

  const tpl = input.classTemplate ? CLASS_TEMPLATES.find((t) => t.key === input.classTemplate) : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === input.sizeClass);

  /* Pass-info kort */
  let y = 28;
  doc.setFillColor(249, 248, 246);
  doc.setDrawColor(...PDF_BRAND.line);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND.muted);
  const labels = ["BANA", "SPORT", "KLASS", "STORLEK", "DATUM", "HUND"];
  const values = [
    input.name || "Ny bana",
    input.sport === "agility" ? "Agility" : "Hoopers",
    tpl?.label ?? "Egen",
    sizeDef?.label ?? "—",
    new Date().toLocaleDateString("sv-SE"),
    input.dogName || "_______",
  ];
  const colW = (pageW - margin * 2) / labels.length;
  labels.forEach((l, i) => {
    const x = margin + i * colW + 2;
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text(l, x, y + 4);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND.ink);
    doc.text(values[i], x, y + 10);
    doc.setFont("helvetica", "normal");
  });
  y += 18;

  /* Banbild — fyller halva sidan */
  const arenaH = (pageH - y - 130);
  const arenaResult = drawArenaVector(doc, {
    x: margin, y,
    maxWidth: pageW - margin * 2,
    maxHeight: arenaH,
    arenaWidthM: input.arenaWidthM,
    arenaHeightM: input.arenaHeightM,
    obstacles: input.obstacles,
    grid: true, showPath: true,
    numberBadgeMm: 3.5,
  });
  y += arenaResult.h + 8;

  /* Anteckningsblock */
  const blocks: { title: string; rows: number }[] = [
    { title: "Fokus i dag", rows: 3 },
    { title: "Vad gick bra", rows: 3 },
    { title: "Vad ska tränas nästa gång", rows: 3 },
    { title: "Övriga noteringar", rows: 5 },
  ];
  const lineGap = 5.5;
  for (const b of blocks) {
    if (y + 6 + b.rows * lineGap > pageH - 30) {
      doc.addPage();
      drawHeaderBand(doc, { title: input.name || "Träningspass", subtitle: "Anteckningar", badge: "TRÄNING" });
      y = 30;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_BRAND.primary);
    doc.text(b.title, margin, y);
    y += 2;
    doc.setDrawColor(...PDF_BRAND.line);
    doc.setLineWidth(0.2);
    for (let i = 0; i < b.rows; i++) {
      y += lineGap;
      doc.line(margin, y, pageW - margin, y);
    }
    y += 3;
  }

  /* Checklista */
  if (y + 30 > pageH - 14) {
    doc.addPage();
    drawHeaderBand(doc, { title: input.name || "Träningspass", subtitle: "Checklista", badge: "TRÄNING" });
    y = 30;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_BRAND.primary);
  doc.text("Checklista", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_BRAND.ink);
  const items = [
    "Värmde upp hunden",
    "Kollade hindersäkerhet",
    "Belönade efter passet",
    "Loggade i AgilityManager",
  ];
  for (const it of items) {
    doc.setDrawColor(...PDF_BRAND.ink);
    doc.setLineWidth(0.3);
    doc.rect(margin, y - 3.2, 4, 4);
    doc.text(it, margin + 6.5, y);
    y += 6;
  }

  drawFooterAllPages(doc, { authorName: input.authorName ?? "" });
  doc.save(`${safeFileName(input.name)}_traning.pdf`);
}
