/**
 * Tränings-PDF:en med förarplan och övningar: en extra sida per övning med
 * minst två steg, och inga krascher när lagren saknas.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import jsPDF from "jspdf";
import { exportTrainingPdf } from "./trainingPdf";
import type { ObstacleLite } from "./validation";

const obstacles: ObstacleLite[] = [
  { id: "s", type: "start", x: 4, y: 34, rotation: 0 },
  { id: "a", type: "jump", x: 6, y: 30, rotation: 0, number: 1 },
  { id: "b", type: "jump", x: 12, y: 26, rotation: 30, number: 2 },
  { id: "c", type: "tunnel", x: 18, y: 20, rotation: 90, number: 3, curveDeg: 90, curveSide: "left", lengthM: 4 },
  { id: "d", type: "jump", x: 20, y: 12, rotation: 0, number: 4 },
  { id: "f", type: "finish", x: 22, y: 8, rotation: 0 },
];

const base = {
  name: "Övningstest", sport: "agility" as const, sizeClass: "L" as const,
  arenaWidthM: 30, arenaHeightM: 40, classTemplate: null, obstacles,
};

/**
 * jsPDF kopierar metoderna i `jsPDF.API` till varje ny instans — en egen
 * `save` där fångar dokumentet i stället för att försöka ladda ner det.
 */
const api = jsPDF.API as unknown as Record<string, unknown>;
function captureSave() {
  const saved: Array<{ pages: number; name: string; text: string }> = [];
  api.save = function (this: jsPDF, name?: string) {
    saved.push({ pages: this.getNumberOfPages(), name: name ?? "", text: this.output() });
    return this;
  };
  return saved;
}

afterEach(() => {
  delete api.save;
  vi.restoreAllMocks();
});

describe("tränings-PDF med förarplan och övningar", () => {
  it("lägger en sida per övning med minst två steg", async () => {
    const saved = captureSave();
    await exportTrainingPdf({
      ...base,
      markup: {
        strokes: [{ id: "s1", points: [{ x: 4, y: 28 }, { x: 10, y: 30 }, { x: 16, y: 22 }] }],
        cues: [
          { id: "c1", kind: "front_cross", x: 10, y: 30 },
          { id: "c2", kind: "reward", x: 22, y: 10 },
          { id: "c3", kind: "note", x: 8, y: 12, text: "Lugn start — belöna efter 4" },
        ],
      },
      exercises: [
        { id: "e1", name: "Nivå 1", steps: ["a", "b", "a"] },
        { id: "e2", name: "Bara ett steg", steps: ["a"] },
        { id: "e3", name: "Nivå 3", steps: ["a", "b", "c", "d", "b"], markup: { strokes: [], cues: [{ id: "x", kind: "blind_cross", x: 14, y: 24 }] } },
      ],
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Övningstest_traning.pdf");
    // Sida 1 (+ ev. anteckningssida) och två övningssidor — "Bara ett steg" hoppas över.
    const withoutExercises = captureSave();
    await exportTrainingPdf({ ...base, markup: undefined, exercises: undefined });
    expect(saved[0].pages - withoutExercises[0].pages).toBe(2);
  });

  it("fungerar utan förarplan och övningar", async () => {
    const saved = captureSave();
    await exportTrainingPdf(base);
    expect(saved).toHaveLength(1);
    expect(saved[0].pages).toBeGreaterThanOrEqual(1);
  });

  it("antal sidor växer med antal övningar", async () => {
    const saved = captureSave();
    await exportTrainingPdf(base);
    await exportTrainingPdf({ ...base, exercises: [{ id: "e1", name: "A", steps: ["a", "b"] }, { id: "e2", name: "B", steps: ["b", "c"] }] });
    expect(saved[1].pages - saved[0].pages).toBe(2);
  });
});
