/**
 * Sprint 5 — Startlista PDF
 * Komprimerad numrerad lista över hinder för domare/bandomare.
 */
import jsPDF from "jspdf";
import { CLASS_TEMPLATES, SIZE_CLASSES, getObstacleDefV2,
  type ClassTemplateKey, type ObstacleTypeV2, type Sport, type SizeClassKey } from "./config";
import { computeCourseTimes } from "./validation";

interface ObstacleLite {
  id: string; type: ObstacleTypeV2; x: number; y: number; rotation: number; number?: number;
}

interface Args {
  courseName: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  classTemplate: ClassTemplateKey | null;
  obstacles: ObstacleLite[];
}

export function exportStartlistPdf(a: Args) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210; const M = 12;
  const tpl = a.classTemplate ? CLASS_TEMPLATES.find((t) => t.key === a.classTemplate) : null;
  const sizeDef = SIZE_CLASSES.find((s) => s.key === a.sizeClass);
  const times = computeCourseTimes({
    sport: a.sport, sizeClass: a.sizeClass, arenaWidthM: 30, arenaHeightM: 40,
    classTemplate: a.classTemplate, obstacles: a.obstacles,
  });

  // Header
  doc.setFillColor(26, 107, 60);
  doc.rect(0, 0, W, 18, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("STARTLISTA", M, 11);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(a.courseName, W - M, 11, { align: "right" });

  // Meta
  doc.setTextColor(40); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(tpl?.label ?? "Egen bana", M, 28);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const meta = [
    `Sport: ${a.sport === "agility" ? "Agility" : "Hoopers"}`,
    `Storleksklass: ${sizeDef?.label ?? "—"}`,
    `Hinder: ${a.obstacles.length}`,
    `Banlängd: ${times.lengthM.toFixed(1)} m`,
    times.refTimeS != null ? `Referenstid: ${times.refTimeS} s` : null,
    times.maxTimeS != null ? `Maxtid: ${times.maxTimeS} s` : null,
  ].filter(Boolean).join("    ·    ");
  doc.text(meta, M, 34);

  // Tabell-header
  let y = 44;
  doc.setFillColor(245, 245, 245); doc.rect(M, y, W - M * 2, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("#", M + 2, y + 5);
  doc.text("Hinder", M + 14, y + 5);
  doc.text("Position (m)", M + 80, y + 5);
  doc.text("Rot", M + 130, y + 5);
  doc.text("Anteckning", M + 145, y + 5);
  y += 7;

  const numbered = [...a.obstacles]
    .filter((o) => o.number != null)
    .sort((aa, bb) => (aa.number ?? 0) - (bb.number ?? 0));

  doc.setFont("helvetica", "normal");
  for (let i = 0; i < numbered.length; i++) {
    const ob = numbered[i];
    const def = getObstacleDefV2(ob.type);
    if (y > 280) { doc.addPage(); y = 20; }
    if (i % 2 === 1) { doc.setFillColor(250, 250, 250); doc.rect(M, y, W - M * 2, 7, "F"); }
    doc.setFontSize(9); doc.setTextColor(20);
    doc.setFont("helvetica", "bold"); doc.text(String(ob.number), M + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(def?.label ?? ob.type, M + 14, y + 5);
    doc.text(`${ob.x.toFixed(1)} / ${ob.y.toFixed(1)}`, M + 80, y + 5);
    doc.text(`${Math.round(ob.rotation)}°`, M + 130, y + 5);
    doc.line(M + 145, y + 6, W - M, y + 6); // skrivlinje
    y += 7;
  }

  // Footer
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(120);
  doc.text(`Genererad ${new Date().toLocaleString("sv-SE")} · Banplaneraren`, M, 290);

  doc.save(`startlista_${a.courseName.replace(/\s+/g, "_")}.pdf`);
}
