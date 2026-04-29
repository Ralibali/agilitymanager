/**
 * Banplaneraren v2 — Sprint 6 (DEL 2)
 * Central hotkey-hantering för planeraren.
 * Alla genvägar som listas i KeyboardShortcutsHelp MÅSTE finnas här.
 */
import { useEffect } from "react";

export interface CoursePlannerHotkeyHandlers {
  openPalette: () => void;
  openHelp: () => void;
  save: () => void;
  exportJudgePdf: () => void;
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  rotateSelected: (deg: number) => void;
  setToolSelect: () => void;
  setToolErase: () => void;
  setToolNumber: () => void;
  togglePath: () => void;
  deselect: () => void;
  /** Returns true if there is a selected obstacle (for selection-only hotkeys). */
  hasSelection: () => boolean;
  /** Z-order på markerat hinder. */
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  /** Lås/lås upp markerat hinder. */
  toggleLockSelected: () => void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useCoursePlannerHotkeys(handlers: CoursePlannerHotkeyHandlers): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      const typing = isTypingTarget(e.target);

      // Always-on, även i input
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.openPalette();
        return;
      }
      if (meta && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        handlers.save();
        return;
      }
      if (meta && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        handlers.exportJudgePdf();
        return;
      }
      if (e.key === "Escape") {
        // Esc: avmarkera. (Dialoger fångar Esc internt via Radix.)
        handlers.deselect();
        return;
      }

      // Endast utanför input
      if (typing) return;

      if (e.key === "?") {
        e.preventDefault();
        handlers.openHelp();
        return;
      }
      if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handlers.redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handlers.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "d") {
        if (handlers.hasSelection()) {
          e.preventDefault();
          handlers.duplicateSelected();
        }
        return;
      }
      // Z-order: Ctrl/Cmd + ] / [ (med Shift = längst fram/bak)
      if (meta && (e.key === "]" || e.key === "[")) {
        if (handlers.hasSelection()) {
          e.preventDefault();
          if (e.key === "]") {
            e.shiftKey ? handlers.bringToFront() : handlers.bringForward();
          } else {
            e.shiftKey ? handlers.sendToBack() : handlers.sendBackward();
          }
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (handlers.hasSelection()) {
          e.preventDefault();
          handlers.deleteSelected();
        }
        return;
      }
      if (e.key === "r" || e.key === "R") {
        if (handlers.hasSelection()) {
          e.preventDefault();
          handlers.rotateSelected(e.shiftKey ? -15 : 15);
        }
        return;
      }
      // Verktygsbyten — bara om inte modifier
      if (!meta && !e.altKey) {
        if (e.key === "v" || e.key === "V") { handlers.setToolSelect(); return; }
        if (e.key === "e" || e.key === "E") { handlers.setToolErase(); return; }
        if (e.key === "n" || e.key === "N") { handlers.setToolNumber(); return; }
        if (e.key === "g" || e.key === "G") { handlers.togglePath(); return; }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
