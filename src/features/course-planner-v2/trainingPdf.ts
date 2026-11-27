/**
 * Banplaneraren v2 — Sprint 6 (DEL 3)
 * Tränings-PDF — banbild + skrivutrymmen för anteckningar.
 */
import jsPDF from "jspdf";
import { CLASS_TEMPLATES, SIZE_CLASSES, type ClassTemplateKey, type SizeClassKey, type Sport } from "./config";
import type { ObstacleLite } from "./validation";
import {
  PDF_BRAND, PDF_PAGE, drawArenaVector, drawHeaderBand, drawFooterAllPages, drawMarkupLegend,
  safeFileName, installPdfTextSanitizer, qrBesideArena,
} from "./pdfHelpers";
import {
  exerciseNumbersById, exerciseSequence, isMarkupEmpty, markupStats,
  type CourseExercise, type CourseMarkup,
} from "./courseExtras";
import { buildDogPath } from "./dogPath";

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
  qrDataUrl?: string;
  showWatermark?: boolean;
  /** Förarplan för huvudbanan. */
  markup?: CourseMarkup;
  /** Övningar — en sida per övning med minst två steg. */
  exercises?: CourseExercise[];
}

export async function exportTrainingPdf(input: TrainingPdfInput) {
  const doc = installPdfTextSanitizer(new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" }));
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
  const markup = isMarkupEmpty(input.markup) ? undefined : input.markup;
  const arenaH = (pageH - y - 130);
  const arenaTopY = y;
  const arenaResult = drawArenaVector(doc, {
    x: margin, y,
    maxWidth: pageW - margin * 2,
    maxHeight: arenaH,
    arenaWidthM: input.arenaWidthM,
    arenaHeightM: input.arenaHeightM,
    obstacles: input.obstacles,
    grid: true, showPath: true,
    numberBadgeMm: 3.5,
    markup,
  });
  y += arenaResult.h + 4;
  if (markup) {
    y += drawMarkupLegend(doc, margin, y, pageW - margin * 2, markup);
    const stats = markupStats(markup, buildDogPath(input.obstacles.filter((o) => o.number != null)).points);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_BRAND.muted);
    const bits = [
      stats.handlerLengthM > 0 ? `Förarens väg ca ${stats.handlerLengthM.toFixed(0)} m` : "",
      stats.crossings.length ? `korsar hundens linje ${stats.crossings.length} ${stats.crossings.length === 1 ? "gång" : "gånger"}` : "",
      stats.crossCues ? `${stats.crossCues} markerade byten` : "",
    ].filter(Boolean);
    if (bits.length) {
      doc.text(bits.join(" · "), margin, y + 1);
      y += 4;
    }
  }
  y += 4;

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

  /* En sida per övning */
  const ids = new Set(input.obstacles.map((o) => o.id));
  const mainNumber = new Map(input.obstacles.filter((o) => o.number != null).map((o) => [o.id, o.number as number]));
  for (const ex of input.exercises ?? []) {
    const sequence = exerciseSequence(ex.steps, input.obstacles);
    if (sequence.length < 2) continue;
    doc.addPage();
    drawHeaderBand(doc, {
      title: ex.name || "Övning",
      subtitle: `Övning på samma uppställning · ${input.name || "Träningsbana"}`,
      badge: "ÖVNING",
    });
    let ey = 28;
    const length = buildDogPath(sequence).total;
    doc.setFillColor(249, 248, 246);
    doc.setDrawColor(...PDF_BRAND.line);
    doc.roundedRect(margin, ey, pageW - margin * 2, 14, 2, 2, "FD");
    const exLabels = ["STEG", "LÄNGD", "SEKVENS (HUVUDBANANS NUMMER)"];
    const order = sequence.map((o) => mainNumber.get(o.sourceId) ?? "–").join(" → ");
    const exValues = [String(sequence.length), `ca ${length.toFixed(0)} m`, order];
    const widths = [22, 26, pageW - margin * 2 - 48];
    let ex0 = margin + 2;
    exLabels.forEach((l, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_BRAND.muted);
      doc.text(l, ex0, ey + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(i === 2 && order.length > 70 ? 7 : 9);
      doc.setTextColor(...PDF_BRAND.ink);
      const value = doc.splitTextToSize(exValues[i], widths[i] - 4)[0] as string;
      doc.text(value, ex0, ey + 10);
      ex0 += widths[i];
    });
    ey += 18;
    const exMarkup = isMarkupEmpty(ex.markup) ? undefined : ex.markup;
    const numbers = exerciseNumbersById(ex.steps, ids);
    const badgeTexts = new Map([...numbers].map(([id, nums]) => [id, nums.join("·")]));
    const result = drawArenaVector(doc, {
      x: margin, y: ey,
      maxWidth: pageW - margin * 2,
      maxHeight: pageH - ey - 80,
      arenaWidthM: input.arenaWidthM,
      arenaHeightM: input.arenaHeightM,
      // Hinder som inte ingår ritas, men utan nummer.
      obstacles: input.obstacles.map((o) => ({ ...o, number: undefined })),
      sequence,
      badgeTexts,
      grid: true, showPath: true,
      numberBadgeMm: 3.5,
      markup: exMarkup,
    });
    ey += result.h + 4;
    if (exMarkup) ey += drawMarkupLegend(doc, margin, ey, pageW - margin * 2, exMarkup);
    ey += 4;
    for (const b of [{ title: "Fokus i övningen", rows: 2 }, { title: "Anteckningar", rows: 4 }]) {
      if (ey + 6 + b.rows * lineGap > pageH - 24) break;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_BRAND.primary);
      doc.text(b.title, margin, ey);
      ey += 2;
      doc.setDrawColor(...PDF_BRAND.line);
      doc.setLineWidth(0.2);
      for (let i = 0; i < b.rows; i++) {
        ey += lineGap;
        doc.line(margin, ey, pageW - margin, ey);
      }
      ey += 5;
    }
  }

  drawFooterAllPages(doc, { authorName: input.authorName ?? "", qrDataUrl: input.qrDataUrl, qrAt: qrBesideArena(arenaTopY, arenaResult), showWatermark: input.showWatermark });
  doc.save(`${safeFileName(input.name)}_traning.pdf`);
}
