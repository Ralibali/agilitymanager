import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportFile, isExportCancelled, safeExportFileName } from "./exportFile";

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  writeFile: vi.fn(),
  share: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: native.isNativePlatform } }));
vi.mock("@capacitor/filesystem", () => ({ Directory: { Cache: "CACHE" }, Filesystem: { writeFile: native.writeFile } }));
vi.mock("@capacitor/share", () => ({ Share: { share: native.share } }));

beforeEach(() => {
  vi.clearAllMocks();
  native.isNativePlatform.mockReturnValue(false);
  native.writeFile.mockResolvedValue({ uri: "file:///cache/export.pdf" });
  native.share.mockResolvedValue({ activityType: "" });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("safeExportFileName", () => {
  it("uses a basename and removes characters that cannot be filenames", () => {
    expect(safeExportFileName("../../privat/bana.pdf")).toBe("bana.pdf");
    expect(safeExportFileName("folder\\..\\Söndag: bana?.pdf")).toBe("Söndag_ bana_.pdf");
    expect(safeExportFileName("../..\u0000.json")).toBe("_.json");
    expect(safeExportFileName(".. ")).toBe("agilitymanager-export");
  });

  it("limits the length while retaining the file type", () => {
    const result = safeExportFileName(`${"b".repeat(300)}.pdf`);
    expect(result.length).toBe(180);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});

describe("exportFile", () => {
  it("downloads on the web and releases the object URL after the download starts", async () => {
    vi.useFakeTimers();
    const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const appendChild = vi.fn();
    vi.stubGlobal("document", { createElement: vi.fn(() => anchor), body: { appendChild } });
    vi.stubGlobal("window", { setTimeout });
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL");
    const blob = new Blob(["{\"pass\":1}"], { type: "application/json" });

    await exportFile(blob, "../pass.json");

    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(anchor.download).toBe("pass.json");
    expect(anchor.href).toBe("blob:download");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4_000);
    expect(revokeUrl).toHaveBeenCalledWith("blob:download");
    expect(native.writeFile).not.toHaveBeenCalled();
    expect(native.share).not.toHaveBeenCalled();
  });

  it("writes exact binary bytes to native cache and shares the returned file URI", async () => {
    native.isNativePlatform.mockReturnValue(true);
    const createUrl = vi.spyOn(URL, "createObjectURL");
    const bytes = new Uint8Array([0, 255, 128, 65, 10]);

    await exportFile(new Blob([bytes], { type: "application/pdf" }), "../../bana.pdf");

    expect(native.writeFile).toHaveBeenCalledWith({
      path: expect.stringMatching(/^export-temp\/[^/]+\/bana\.pdf$/),
      data: "AP+AQQo=",
      directory: "CACHE",
      recursive: true,
    });
    expect(native.share).toHaveBeenCalledWith({
      files: ["file:///cache/export.pdf"], title: "bana.pdf", dialogTitle: "Spara eller dela fil",
    });
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("handles exports larger than a function's argument limit and preserves UTF-8", async () => {
    native.isNativePlatform.mockReturnValue(true);
    const text = "Hundträning 🐕 ".repeat(10_000);
    await exportFile(new Blob([text]), "pass.txt");
    const decoded = Uint8Array.from(atob(native.writeFile.mock.calls[0][0].data), (character) => character.charCodeAt(0));
    expect(new TextDecoder().decode(decoded)).toBe(text);
  });

  it("uses separate cache paths for successive exports with the same filename", async () => {
    native.isNativePlatform.mockReturnValue(true);
    await exportFile(new Blob(["första"]), "bana.json");
    await exportFile(new Blob(["andra"]), "bana.json");
    expect(native.writeFile.mock.calls[0][0].path).not.toBe(native.writeFile.mock.calls[1][0].path);
  });

  it("propagates storage and share failures to the calling UI", async () => {
    native.isNativePlatform.mockReturnValue(true);
    native.writeFile.mockRejectedValueOnce(new Error("disk full"));
    await expect(exportFile(new Blob(["pass"]), "pass.txt")).rejects.toThrow("disk full");
    expect(native.share).not.toHaveBeenCalled();
    native.share.mockRejectedValueOnce(new Error("share unavailable"));
    await expect(exportFile(new Blob(["pass"]), "pass.txt")).rejects.toThrow("share unavailable");
  });
});

it("distinguishes a cancelled native share sheet from an export failure", () => {
  expect(isExportCancelled(new Error("Share canceled"))).toBe(true);
  expect(isExportCancelled({ message: "Share canceled" })).toBe(true);
  expect(isExportCancelled(new Error("disk full"))).toBe(false);
  expect(isExportCancelled(undefined)).toBe(false);
});
