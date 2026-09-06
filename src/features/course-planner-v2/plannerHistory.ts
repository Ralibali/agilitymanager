/**
 * Banplaneraren v2 — ångra/gör om för HELA utkastet.
 *
 * Historiken sparar inte bara hinderlistan utan även de inställningar som
 * påverkar banan: ytmått, storleksklass, klassmall, sport och valt regelverk.
 * Banans namn hålls utanför, så att ett namnbyte inte rullas tillbaka när
 * användaren ångrar ett hinderdrag.
 */
import type { PlacedObstacle } from "@/lib/course";
import type { ClassTemplateKey, SizeClassKey, Sport } from "./config";

export interface DraftLike {
  name: string;
  sport: Sport;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  classTemplate: ClassTemplateKey | null;
  obstacles: PlacedObstacle[];
  ruleSetId?: string;
}

/** Allt som ångras — utkastet utan namnet. */
export type DraftSnapshot = Omit<DraftLike, "name">;

export const HISTORY_LIMIT = 50;

export function snapshotDraft(d: DraftLike): DraftSnapshot {
  return {
    sport: d.sport,
    sizeClass: d.sizeClass,
    arenaWidthM: d.arenaWidthM,
    arenaHeightM: d.arenaHeightM,
    classTemplate: d.classTemplate,
    obstacles: d.obstacles,
    ruleSetId: d.ruleSetId,
  };
}

/** Lägger tillbaka ett läge i utkastet — namnet behålls som det är nu. */
export function applySnapshot(current: DraftLike, snap: DraftSnapshot): DraftLike {
  return { ...current, ...snap, name: current.name };
}

/** Är två lägen likvärdiga? Används för att slippa tomma ångra-steg. */
export function snapshotsEqual(a: DraftSnapshot, b: DraftSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pushHistory(past: DraftSnapshot[], snap: DraftSnapshot): DraftSnapshot[] {
  const last = past[past.length - 1];
  if (last && snapshotsEqual(last, snap)) return past;
  return [...past.slice(-(HISTORY_LIMIT - 1)), snap];
}
