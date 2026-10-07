import autoTable from "jspdf-autotable";
import { measureCourse, roundedSections } from "./courseMeasurements";
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
import { computeCourseTimes, computeCourseLength, computeCourseLengthAlongPath, validateCourse, type ObstacleLite } from "./validation";
import { analyzeCourse } from "./courseAnalysis";
import { getRuleSet, getDefaultRuleSetIdForSport } from "./rules";
import { PDF_BRAND, PDF_PAGE, drawArenaVector, drawHeaderBand, drawFooterAllPages, safeFileName, installPdfTextSanitizer, qrBesideArena } from "./pdfHelpers";

export interface JudgePdfInput {
  targetLengthM?: number;
  planningSpeedMs?: number;
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
  /** Aktivt regelverk (Prompt A). Default väljs efter sport. */
  ruleSetId?: string;
  /** PNG dataURL för QR-kod som visas på sida 1. */
  qrDataUrl?: string;
  /** Premium-flagga för att slå av byline-vattenmärket. Default = true. */
  showWatermark?: boolean;
}

export async function exportJudgePdf(input: JudgePdfInput) {
  const doc = installPdfTextSanitizer(new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" }));
  const margin = PDF_PAGE.margin;
  const pageW = PDF_PAGE.width;
  const pageH = PDF_PAGE.height;

  const ruleSetForTpl = getRuleSet(input.ruleSetId ?? getDefaultRuleSetIdForSport(input.sport));
  const tpl = input.classTemplate
    ? (ruleSetForTpl?.classTemplates.find((t) => t.key === input.classTemplate) ??
        CLASS_TEMPLATES.find((t) => t.key === input.classTemplate))
    : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === input.sizeClass)!;
  const times = computeCourseTimes({
    sport: input.sport, sizeClass: input.sizeClass,
    arenaWidthM: input.arenaWidthM, arenaHeightM: input.arenaHeightM,
    classTemplate: input.classTemplate, obstacles: input.obstacles,
    ruleSetId: input.ruleSetId, targetLengthM: input.targetLengthM, planningSpeedMs: input.planningSpeedMs,
  });
  const issues = validateCourse({
    sport: input.sport, sizeClass: input.sizeClass,
    arenaWidthM: input.arenaWidthM, arenaHeightM: input.arenaHeightM,
    classTemplate: input.classTemplate, obstacles: input.obstacles,
    ruleSetId: input.ruleSetId, targetLengthM: input.targetLengthM, planningSpeedMs: input.planningSpeedMs,
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
  const competingCount = input.obstacles.filter((o) => !["start", "finish", "number", "handler_zone"].includes(o.type)).length;
  const fixedTimes = !times.refTimeIsEstimate;
  const cols = [
    { label: "Hinder", value: `${competingCount}`, sub: tpl ? `klassen: ${tpl.obstacleRange[0]}–${tpl.obstacleRange[1]}` : "" },
    { label: "Banlängd", value: `${times.lengthAlongPathM.toFixed(1)} m`, sub: "längs hundens väg" },
    {
      label: fixedTimes ? "Referenstid" : "Standardtid (uppsk.)",
      value: times.refTimeS != null ? `${times.refTimeS} s` : "—",
      sub: fixedTimes ? (times.refTimeS != null ? "fast enligt regelverket" : "ingen referenstid") : "domaren fastställer",
    },
    {
      label: "Maxtid",
      value: times.maxTimeS != null ? `${times.maxTimeS} s` : "—",
      sub: times.fixedMaxCourseTimeS != null ? "fast enligt regelverket" : times.maxTimeFactor ? `${times.maxTimeFactor} × referenstid` : "",
    },
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
  const arenaTopY = y;
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
  // Förhandskontrollen ersätter inte domarens bedömning — formulera därefter.
  if (errs > 0) {
    doc.setTextColor(...PDF_BRAND.error);
    doc.text(`Förhandskontroll: ${errs} fel och ${warns} varningar — se bygg-PDF:en`, margin, statusY);
  } else if (warns > 0) {
    doc.setTextColor(...PDF_BRAND.warning);
    doc.text(`Förhandskontroll: inga fel, ${warns} varningar att se över`, margin, statusY);
  } else {
    doc.setTextColor(...PDF_BRAND.primary);
    doc.text("Förhandskontroll: inga anmärkningar", margin, statusY);
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
  const lengthAlongPathM = computeCourseLengthAlongPath(input.obstacles);
  doc.text(`Banlängd (hundens väg): ${lengthAlongPathM.toFixed(1)} m`, margin, sy);
  sy += 5;
  doc.text(`Center-till-center (referens): ${lengthM.toFixed(1)} m`, margin, sy);
  sy += 5;
  doc.text(`Antal numrerade hinder: ${numbered.length}`, margin, sy);
  sy += 8;

  /* Tider per storleksklass */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(fixedTimes ? "Tider enligt regelverket" : "Uppskattad referenstid per storleksklass", margin, sy);
  sy += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  let ry = sy;
  if (fixedTimes) {
    // SHoK: 45/90 s i alla klasser. FCI: ingen referenstid, maxtid 180 s.
    doc.text(
      `Referenstid: ${times.refTimeS != null ? `${times.refTimeS} s` : "ingen (resultatet avgörs av fel)"} · Maxtid: ${times.maxTimeS != null ? `${times.maxTimeS} s` : "—"} — samma för alla storlekar.`,
      margin, ry + 4,
    );
    ry += 8;
  } else {
    // Planeringsstöd: domaren fastställer referenstiden på tävlingsdagen
    // (SAgiK §3.4). Hastigheterna nedan är AgilityManagers uppskattning.
    const tableX = margin;
    // Summerar till sidans innerbredd (210 − 2 × 12 mm).
    const colWidths = [20, 30, 34, 30, 30, 42];
    const headers = ["Klass", "Uppsk. m/s", "Banlängd (m)", "Ref.tid (s)", "Maxtid (s)", ""];

    doc.setFillColor(...PDF_BRAND.primary);
    doc.rect(tableX, ry, colWidths.reduce((a, b) => a + b, 0), 6, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    let cx = tableX + 2;
    headers.forEach((h, i) => { doc.text(h, cx, ry + 4); cx += colWidths[i]; });

    ry += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_BRAND.ink);
    for (const sc of SIZE_CLASSES) {
      const rowTimes = computeCourseTimes({ ...input, sizeClass: sc.key });
      const speed = rowTimes.refSpeedMs;
      const sct = rowTimes.refTimeS;
      const maxT = rowTimes.maxTimeS;
      const isCurrent = sc.key === input.sizeClass;
      if (isCurrent) {
        doc.setFillColor(245, 240, 230);
        doc.rect(tableX, ry, colWidths.reduce((a, b) => a + b, 0), 5.5, "F");
      }
      cx = tableX + 2;
      const cells = [
        sc.label,
        speed?.toFixed(2) ?? "—",
        lengthAlongPathM.toFixed(1),
        sct != null ? `${sct}` : "—",
        maxT != null ? `${maxT}` : "—",
        isCurrent ? "vald storlek" : "",
      ];
      if (isCurrent) doc.setFont("helvetica", "bold");
      cells.forEach((c, i) => { doc.text(c, cx, ry + 4); cx += colWidths[i]; });
      if (isCurrent) doc.setFont("helvetica", "normal");
      ry += 5.5;
    }
    doc.setFontSize(7);
    doc.setTextColor(...PDF_BRAND.muted);
    doc.text("Planeringsstöd: domaren fastställer referenstiden per bana. Maxtiden är 2 × referenstiden (SAgiK §3.4).", tableX, ry + 4);
    doc.setTextColor(...PDF_BRAND.ink);
    ry += 6;
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

  /* ─── SIDA 3 — Bananalys + Hindermått + Banbyggar-koordinater ─── */
  doc.addPage();
  drawHeaderBand(doc, {
    title: "Bananalys & mätprotokoll",
    subtitle: input.name || "Bana",
    badge: input.sport === "agility" ? "AGILITY" : "HOOPERS",
  });

  const ruleSetId = input.ruleSetId ?? getDefaultRuleSetIdForSport(input.sport);
  const ruleSet = getRuleSet(ruleSetId);

  let py = 32;
  doc.setTextColor(...PDF_BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bananalys (svårighet)", margin, py);
  py += 6;
  const analysis = analyzeCourse(input.obstacles);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Svårighet: ${analysis.difficultyLabel} (${analysis.difficultyScore}/100)`, margin, py); py += 5;
  doc.text(`Skarpa svängar (>90°): ${analysis.sharpTurns}`, margin, py); py += 5;
  doc.text(`Sidbyten: ${analysis.sideChanges}`, margin, py); py += 5;
  doc.text(`Längsta raksträcka: ${analysis.longestStraightM.toFixed(1)} m`, margin, py); py += 5;
  doc.text(`Medelsvängskärpa: ${analysis.avgCurvatureDegPerM.toFixed(1)}°/m`, margin, py); py += 5;
  doc.setTextColor(...PDF_BRAND.muted);
  doc.setFontSize(7.5);
  doc.text(
    `Poängkomponenter — svängar +${analysis.components.sharpTurns}, sidbyten +${analysis.components.sideChanges}, kurvatur +${analysis.components.avgCurvature}, fartsektion ${analysis.components.straightBonus}`,
    margin, py,
  );
  py += 8;

  /* Hindermått enligt regelverket för vald storleksklass */
  doc.setTextColor(...PDF_BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Hindermått — storleksklass ${sizeDef.label}`, margin, py);
  py += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Hopphöjd: ${sizeDef.jumpHeightCm[0]}–${sizeDef.jumpHeightCm[1]} cm`, margin, py); py += 5;
  doc.text(`Däckhöjd: ${sizeDef.tireHeightCm[0]}–${sizeDef.tireHeightCm[1]} cm`, margin, py); py += 5;
  doc.text(`Långhopp: ${sizeDef.longJumpPlanks} plankor, ${sizeDef.longJumpLengthCm[0]}–${sizeDef.longJumpLengthCm[1]} cm`, margin, py); py += 5;
  doc.text(`Min-avstånd kombination: ${sizeDef.comboDistanceM} m`, margin, py); py += 8;

  /* Banbyggar-koordinater */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Banbyggar-koordinater (m från nedre-vänster hörn)", margin, py);
  py += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_BRAND.muted);
  const bcols = [12, 50, 22, 22, 22];
  let bx = margin;
  ["#", "Hinder", "X (m)", "Y (m)", "Rotation"].forEach((h, i) => { doc.text(h, bx, py); bx += bcols[i]; });
  py += 1.5;
  doc.setDrawColor(...PDF_BRAND.line);
  doc.line(margin, py, pageW - margin, py);
  py += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_BRAND.ink);
  const buildList = input.obstacles
    .filter((o) => o.number != null && !["start", "finish", "number"].includes(o.type))
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  for (const ob of buildList) {
    if (py > pageH - 24) break;
    const def = getObstacleDefV2(ob.type as ObstacleTypeV2);
    let cx2 = margin;
    const cells = [
      String(ob.number),
      def?.label ?? ob.type,
      ob.x.toFixed(2),
      ob.y.toFixed(2),
      `${Math.round(ob.rotation)}°`,
    ];
    cells.forEach((c, i) => { doc.text(c, cx2, py); cx2 += bcols[i]; });
    py += 4.5;
  }

  /* Mätprotokoll-rad i botten */
  doc.setFontSize(7);
  doc.setTextColor(...PDF_BRAND.muted);
  const protoY = pageH - 18;
  const lengthAlongPathFinal = computeCourseLengthAlongPath(input.obstacles);
  doc.text(
    `Mätprotokoll: banlängd (hundens väg) ${lengthAlongPathFinal.toFixed(1)} m · ref ${times.refTimeS ?? "—"} s · max ${times.maxTimeS ?? "—"} s`,
    margin, protoY,
  );
  doc.text(
    `Regelverk: ${ruleSet?.name ?? ruleSetId} (giltigt ${ruleSet?.validFrom ?? "?"}${ruleSet?.validTo ? "–" + ruleSet.validTo : " och tills vidare"})`,
    margin, protoY + 4,
  );

  /* Footer på alla sidor */
  doc.addPage();
  drawHeaderBand(doc, { title: "Kontroll av banlängd", subtitle: input.name, badge: "MÄTPROTOKOLL" });
  const measurements = measureCourse(input.obstacles);
  const notes = [
    input.targetLengthM ? `Mål för banlängd: ${input.targetLengthM} m (tolerans 5 %, minst 1 m).` : null,
    measurements.startM == null ? "Startmarkör saknas: sträckan fram till första hindret ingår inte." : null,
    measurements.finishM == null ? "Målmarkör saknas: sträckan efter sista hindret ingår inte." : null,
  ].filter((note): note is string => !!note);
  doc.setFontSize(8);
  notes.forEach((note, i) => doc.text(note, margin, 27 + i * 4));
  autoTable(doc, {
    startY: 32 + notes.length * 4, margin: { top: 20, bottom: 22, left: margin, right: margin },
    head: [["Delsträcka längs hundens väg", { content: "Meter", styles: { halign: "right" } }]],
    body: roundedSections(measurements.sections).map(s => [s.label, s.distanceM.toFixed(1)]),
    foot: [["Summa", { content: measurements.path.total.toFixed(1), styles: { halign: "right" } }]],
    showFoot: "lastPage", styles: { fontSize: 8 }, columnStyles: { 1: { halign: "right" } },
    headStyles: { fillColor: PDF_BRAND.primary }, footStyles: { fillColor: PDF_BRAND.primary },
  });
  drawFooterAllPages(doc, { authorName: input.authorName ?? "", qrDataUrl: input.qrDataUrl, qrAt: qrBesideArena(arenaTopY, arenaResult), showWatermark: input.showWatermark });

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
