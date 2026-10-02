import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportBuildPdf } from "./buildPdf";
import { exportJudgePdf } from "./judgePdf";
import { exportStartlistPdf } from "./startlistPdf";
import { exportTrainingPdf } from "./trainingPdf";

const exportFile = vi.hoisted(() => vi.fn());
vi.mock("@/lib/exportFile", () => ({ exportFile }));

const input = {
  name: "Min bana", sport: "agility" as const, sizeClass: "L" as const,
  arenaWidthM: 30, arenaHeightM: 40, classTemplate: null, obstacles: [],
};
const exporters = [
  { name: "build", run: () => exportBuildPdf(input), filename: "Min_bana_bygg.pdf" },
  { name: "judge", run: () => exportJudgePdf(input), filename: "Min_bana_domarbana.pdf" },
  { name: "training", run: () => exportTrainingPdf(input), filename: "Min_bana_traning.pdf" },
  { name: "startlist", run: () => exportStartlistPdf({ ...input, courseName: input.name }), filename: "startlista_Min_bana.pdf" },
];

beforeEach(() => {
  exportFile.mockReset();
  exportFile.mockResolvedValue(undefined);
});

describe("PDF file exports", () => {
  it.each(exporters)("exports a real $name PDF through the shared web/native helper", async ({ run, filename }) => {
    await run();
    expect(exportFile).toHaveBeenCalledWith(expect.any(Blob), filename);
    const blob: Blob = exportFile.mock.calls[0][0];
    expect(blob.type).toBe("application/pdf");
    expect((await blob.text()).startsWith("%PDF-")).toBe(true);
  });

  it.each(exporters)("waits for the $name export and propagates errors to the UI", async ({ run }) => {
    exportFile.mockRejectedValueOnce(new Error("share unavailable"));
    await expect(run()).rejects.toThrow("share unavailable");
  });
});
