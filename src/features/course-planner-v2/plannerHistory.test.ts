import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  applySnapshot,
  pushHistory,
  snapshotDraft,
  snapshotsEqual,
  type DraftLike,
} from "./plannerHistory";

const base: DraftLike = {
  name: "Min bana",
  sport: "agility",
  sizeClass: "L",
  arenaWidthM: 30,
  arenaHeightM: 40,
  classTemplate: null,
  obstacles: [{ id: "a", type: "jump", x: 5, y: 5, rotation: 0 }],
  ruleSetId: "skk-agility-2023",
};

describe("ångra-historik för hela utkastet", () => {
  it("snapshot omfattar ytmått, storlek, klass och regelverk", () => {
    const snap = snapshotDraft(base);
    expect(Object.keys(snap).sort()).toEqual([
      "arenaHeightM", "arenaWidthM", "classTemplate", "obstacles", "ruleSetId", "sizeClass", "sport",
    ]);
  });

  it("ångra återställer inställningar, inte bara hinder", () => {
    const before = snapshotDraft(base);
    const changed: DraftLike = {
      ...base,
      arenaWidthM: 20,
      arenaHeightM: 25,
      sizeClass: "S",
      classTemplate: "agility_1",
      ruleSetId: "hoopers-shs-2022",
      obstacles: [],
    };
    const restored = applySnapshot(changed, before);
    expect(restored.arenaWidthM).toBe(30);
    expect(restored.arenaHeightM).toBe(40);
    expect(restored.sizeClass).toBe("L");
    expect(restored.classTemplate).toBeNull();
    expect(restored.ruleSetId).toBe("skk-agility-2023");
    expect(restored.obstacles).toHaveLength(1);
  });

  it("namnet rullas inte tillbaka", () => {
    const renamed = { ...base, name: "Nytt namn", arenaWidthM: 18 };
    expect(applySnapshot(renamed, snapshotDraft(base)).name).toBe("Nytt namn");
  });

  it("gör om tar tillbaka läget exakt", () => {
    const changed: DraftLike = { ...base, arenaWidthM: 18, obstacles: [] };
    const undone = applySnapshot(changed, snapshotDraft(base));
    const redone = applySnapshot(undone, snapshotDraft(changed));
    expect(snapshotsEqual(snapshotDraft(redone), snapshotDraft(changed))).toBe(true);
  });

  it("identiska lägen ger inget extra ångra-steg", () => {
    const past = pushHistory([], snapshotDraft(base));
    expect(pushHistory(past, snapshotDraft(base))).toHaveLength(1);
    expect(pushHistory(past, snapshotDraft({ ...base, arenaWidthM: 22 }))).toHaveLength(2);
  });

  it("historiken växer inte obegränsat", () => {
    let past = pushHistory([], snapshotDraft(base));
    for (let i = 0; i < 200; i++) past = pushHistory(past, snapshotDraft({ ...base, arenaWidthM: 10 + i }));
    expect(past.length).toBeLessThanOrEqual(HISTORY_LIMIT);
    // Senaste läget ligger sist.
    expect(past[past.length - 1].arenaWidthM).toBe(209);
  });

  it("gamla sparade banor utan regelverk klarar snapshot/återställning", () => {
    const legacy: DraftLike = { ...base, ruleSetId: undefined };
    const snap = snapshotDraft(legacy);
    expect(snap.ruleSetId).toBeUndefined();
    expect(applySnapshot({ ...legacy, ruleSetId: "hoopers-fci-2026" }, snap).ruleSetId).toBeUndefined();
  });
});
