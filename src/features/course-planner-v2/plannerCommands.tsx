/**
 * Banplaneraren v2 — Sprint 6 (DEL 1)
 * Bygger kommandolistan för CommandPalette.
 * Varje kommando MÅSTE vara wired till en faktisk handler — inga stubs.
 */
import {
  Save, Library, Share2, Dumbbell,
  MousePointer2, Eraser, Hash, ListOrdered, Eye, AlertTriangle,
  Plus, Activity, Flag, FileDown,
  Undo2, Redo2, Copy, Trash2, RotateCw,
} from "lucide-react";
import type { PaletteCommand } from "@/components/course-planner-v2/CommandPalette";
import type { Sport, ObstacleTypeV2 } from "@/features/course-planner-v2/config";

export interface PlannerCommandHandlers {
  // Bana
  save: () => void;
  openLibrary: () => void;
  openShare: () => void;
  trainThis: () => void;

  // Verktyg
  setToolSelect: () => void;
  setToolErase: () => void;
  setToolNumber: () => void;
  autoNumber: () => void;
  togglePath: () => void;
  toggleValidation: () => void;

  // Hinder
  addObstacle: (type: ObstacleTypeV2) => void;

  // Sport
  switchSport: (s: Sport) => void;
  currentSport: Sport;

  // Export
  exportJudgePdf: () => void;
  exportTrainingPdf: () => void;
  exportBuildPdf: () => void;
  exportStartlist: () => void;

  // Redigering
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export function buildPlannerCommands(h: PlannerCommandHandlers): PaletteCommand[] {
  const cmds: PaletteCommand[] = [];

  // ───────── Bana ─────────
  cmds.push(
    {
      id: "course.save", group: "Bana", label: "Spara bana",
      hint: "Sparar lokalt + i molnet om du är inloggad",
      shortcut: ["Ctrl", "S"], keywords: ["spara", "save"],
      icon: <Save size={14} />, run: h.save,
    },
    {
      id: "course.library", group: "Bana", label: "Öppna bibliotek",
      hint: "Bläddra färdiga, egna och delade banor",
      keywords: ["bibliotek", "ladda", "open", "library"],
      icon: <Library size={14} />, run: h.openLibrary,
    },
    {
      id: "course.share", group: "Bana", label: "Dela bana",
      hint: "Dela till klubb eller publik länk",
      keywords: ["dela", "share", "klubb", "länk"],
      icon: <Share2 size={14} />, run: h.openShare,
    },
    {
      id: "course.train", group: "Bana", label: "Skapa träningspass från bana",
      keywords: ["träna", "träning", "log", "pass"],
      icon: <Dumbbell size={14} />, run: h.trainThis,
    },
  );

  // ───────── Verktyg ─────────
  cmds.push(
    {
      id: "tool.select", group: "Verktyg", label: "Välj-verktyg",
      shortcut: ["V"], keywords: ["välj", "select", "markera"],
      icon: <MousePointer2 size={14} />, run: h.setToolSelect,
    },
    {
      id: "tool.erase", group: "Verktyg", label: "Sudda-verktyg",
      shortcut: ["E"], keywords: ["sudda", "erase", "ta bort"],
      icon: <Eraser size={14} />, run: h.setToolErase,
    },
    {
      id: "tool.number", group: "Verktyg", label: "Nummer-verktyg",
      shortcut: ["N"], keywords: ["nummer", "numrera"],
      icon: <Hash size={14} />, run: h.setToolNumber,
    },
    {
      id: "tool.autoNumber", group: "Verktyg", label: "Auto-numrera",
      hint: "Numrerar hinder i placeringsordning",
      keywords: ["auto", "numrera"],
      icon: <ListOrdered size={14} />, run: h.autoNumber,
    },
    {
      id: "tool.togglePath", group: "Verktyg", label: "Visa/dölj banlinje",
      shortcut: ["G"], keywords: ["banlinje", "rutnät", "path", "grid"],
      icon: <Eye size={14} />, run: h.togglePath,
    },
    {
      id: "tool.toggleValidation", group: "Verktyg", label: "Visa/dölj validering",
      keywords: ["validering", "fel", "varning"],
      icon: <AlertTriangle size={14} />, run: h.toggleValidation,
    },
  );

  // ───────── Hinder ─────────
  const addable: { type: ObstacleTypeV2; label: string; sport: Sport[] }[] = [
    { type: "jump",     label: "Hopp",      sport: ["agility"] },
    { type: "tunnel",   label: "Tunnel",    sport: ["agility", "hoopers"] },
    { type: "weave_12", label: "Slalom 12", sport: ["agility"] },
    { type: "aframe",   label: "A-hinder",  sport: ["agility"] },
    { type: "start",    label: "Start",     sport: ["agility", "hoopers"] },
    { type: "finish",   label: "Mål",       sport: ["agility", "hoopers"] },
  ];
  for (const it of addable) {
    if (!it.sport.includes(h.currentSport)) continue;
    cmds.push({
      id: `add.${it.type}`,
      group: "Hinder",
      label: `Lägg till ${it.label}`,
      keywords: ["lägg till", "add", it.label.toLowerCase()],
      icon: <Plus size={14} />,
      run: () => h.addObstacle(it.type),
    });
  }

  // ───────── Sport ─────────
  cmds.push(
    {
      id: "sport.agility", group: "Sport", label: "Växla till Agility",
      keywords: ["sport", "agility"],
      icon: <Activity size={14} />, run: () => h.switchSport("agility"),
    },
    {
      id: "sport.hoopers", group: "Sport", label: "Växla till Hoopers",
      keywords: ["sport", "hoopers"],
      icon: <Flag size={14} />, run: () => h.switchSport("hoopers"),
    },
  );

  // ───────── Export ─────────
  cmds.push(
    {
      id: "export.judge", group: "Export", label: "Exportera Domar-PDF",
      shortcut: ["Ctrl", "P"], keywords: ["pdf", "domare", "export"],
      icon: <FileDown size={14} />, run: h.exportJudgePdf,
    },
    {
      id: "export.training", group: "Export", label: "Exportera Tränings-PDF",
      keywords: ["pdf", "träning", "export"],
      icon: <FileDown size={14} />, run: h.exportTrainingPdf,
    },
    {
      id: "export.build", group: "Export", label: "Exportera Bygg-PDF",
      keywords: ["pdf", "bygg", "export"],
      icon: <FileDown size={14} />, run: h.exportBuildPdf,
    },
    {
      id: "export.startlist", group: "Export", label: "Exportera Startlista",
      keywords: ["pdf", "startlista", "export"],
      icon: <FileDown size={14} />, run: h.exportStartlist,
    },
  );

  // ───────── Redigering ─────────
  if (h.canUndo) {
    cmds.push({
      id: "edit.undo", group: "Redigering", label: "Ångra",
      shortcut: ["Ctrl", "Z"], keywords: ["ångra", "undo"],
      icon: <Undo2 size={14} />, run: h.undo,
    });
  }
  if (h.canRedo) {
    cmds.push({
      id: "edit.redo", group: "Redigering", label: "Gör om",
      shortcut: ["Ctrl", "Shift", "Z"], keywords: ["gör om", "redo"],
      icon: <Redo2 size={14} />, run: h.redo,
    });
  }
  if (h.hasSelection) {
    cmds.push(
      {
        id: "edit.duplicate", group: "Redigering", label: "Duplicera markerat hinder",
        shortcut: ["Ctrl", "D"], keywords: ["duplicera", "kopiera"],
        icon: <Copy size={14} />, run: h.duplicateSelected,
      },
      {
        id: "edit.delete", group: "Redigering", label: "Ta bort markerat hinder",
        shortcut: ["Delete"], keywords: ["ta bort", "delete", "radera"],
        icon: <Trash2 size={14} />, run: h.deleteSelected,
      },
    );
  }

  return cmds;
}
