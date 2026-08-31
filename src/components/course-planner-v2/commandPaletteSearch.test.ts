import { describe, expect, it } from "vitest";
import {
  MAX_RECENT,
  rankCommands,
  rememberCommand,
  scoreCommand,
} from "./commandPaletteSearch";

const cmd = (id: string, label: string, extra?: Partial<Parameters<typeof scoreCommand>[0]>) => ({
  id,
  label,
  group: "Bana",
  ...extra,
});

describe("scoreCommand", () => {
  it("returnerar 0 för tom sökning (alla kommandon matchar)", () => {
    expect(scoreCommand(cmd("a", "Spara bana"), "  ")).toBe(0);
  });

  it("rankar exakt träff högst", () => {
    const exact = scoreCommand(cmd("a", "Spara bana"), "spara bana");
    const prefix = scoreCommand(cmd("b", "Spara bana som…"), "spara bana");
    expect(exact).toBeGreaterThan(prefix ?? 0);
  });

  it("matchar ordstart i hint/keywords", () => {
    const hit = scoreCommand(cmd("a", "Exportera PDF", { keywords: ["domare"] }), "dom");
    expect(hit).not.toBeNull();
  });

  it("fuzzy-matchar förkortningar som 'spdf'", () => {
    const hit = scoreCommand(cmd("a", "Exportera startlista/PDF"), "spdf");
    expect(hit).not.toBeNull();
  });

  it("returnerar null när tecken saknas", () => {
    expect(scoreCommand(cmd("a", "Spara bana"), "xyz")).toBeNull();
  });

  it("är case-insensitiv", () => {
    expect(scoreCommand(cmd("a", "Spara Bana"), "SPARA")).not.toBeNull();
  });
});

describe("rankCommands", () => {
  it("filtrerar bort icke-matchande och sorterar på score", () => {
    const ranked = rankCommands(
      [cmd("a", "Zooma in"), cmd("b", "Spara bana"), cmd("c", "Spara bana som…")],
      "spara",
    );
    expect(ranked.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("behåller ordningen utan sökterm", () => {
    const all = [cmd("a", "A"), cmd("b", "B")];
    expect(rankCommands(all, "").map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("rememberCommand", () => {
  it("lägger senaste kommandot först utan dubbletter", () => {
    expect(rememberCommand("b", ["a", "b", "c"], null)).toEqual(["b", "a", "c"]);
  });

  it("håller maxlängden", () => {
    const full = Array.from({ length: MAX_RECENT }, (_, i) => `c${i}`);
    expect(rememberCommand("ny", full, null)).toHaveLength(MAX_RECENT);
    expect(rememberCommand("ny", full, null)[0]).toBe("ny");
  });

  it("skriver till storage när det finns", () => {
    const writes: string[] = [];
    const storage = { setItem: (_k: string, v: string) => writes.push(v) };
    rememberCommand("a", [], storage);
    expect(writes).toEqual(['["a"]']);
  });
});
