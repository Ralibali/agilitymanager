import { describe, expect, it } from "vitest";
import { draftSaveStatusLabel, saveDraftToStorage } from "./draftStorage";

const draft = { name: "Bana", obstacles: [] };

function failingStorage(err: unknown) {
  return { setItem() { throw err; } };
}

describe("saveDraftToStorage", () => {
  it("lyckas och skriver texten", () => {
    let written: string | null = null;
    const res = saveDraftToStorage("k", draft, { setItem: (_k, v) => { written = v; } });
    expect(res.ok).toBe(true);
    expect(written).toBe(JSON.stringify(draft));
  });

  it("rapporterar full lagring (quota) i stället för att svälja felet", () => {
    const err = Object.assign(new Error("full"), { name: "QuotaExceededError" });
    const res = saveDraftToStorage("k", draft, failingStorage(err));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("quota");
    expect(res.message).toMatch(/full/i);
  });

  it("rapporterar blockerad lagring (SecurityError)", () => {
    const err = Object.assign(new Error("blocked"), { name: "SecurityError" });
    const res = saveDraftToStorage("k", draft, failingStorage(err));
    expect(res.ok && "ok").toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("blocked");
  });

  it("hanterar äldre webbläsares felkoder (code 22 / 1014)", () => {
    for (const code of [22, 1014]) {
      const res = saveDraftToStorage("k", draft, failingStorage(Object.assign(new Error("x"), { code })));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("quota");
    }
  });

  it("saknad lagring ger fel — inte tyst framgång", () => {
    const res = saveDraftToStorage("k", draft, null);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("blocked");
  });

  it("cirkulär data ger serialize-fel utan att kasta", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const res = saveDraftToStorage("k", circular, { setItem: () => {} });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("serialize");
  });

  it("ett nytt försök efter fel kan lyckas", () => {
    let fail = true;
    const store = { setItem: () => { if (fail) throw Object.assign(new Error("full"), { name: "QuotaExceededError" }); } };
    expect(saveDraftToStorage("k", draft, store).ok).toBe(false);
    fail = false;
    expect(saveDraftToStorage("k", draft, store).ok).toBe(true);
  });

  it("statustexter är på svenska och särskiljer lägena", () => {
    expect(draftSaveStatusLabel("saving")).toBe("Sparar…");
    expect(draftSaveStatusLabel("saved")).toBe("Sparad i den här webbläsaren");
    expect(draftSaveStatusLabel("error")).toBe("Kunde inte spara");
    expect(draftSaveStatusLabel("idle")).not.toBe(draftSaveStatusLabel("saved"));
  });
});
