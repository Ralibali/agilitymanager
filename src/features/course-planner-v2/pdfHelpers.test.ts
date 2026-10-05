import { describe, expect, it } from "vitest";
import { pdfSafeText } from "./pdfHelpers";

describe("pdfSafeText", () => {
  it("ersätter pilar och symboler som Helvetica i jsPDF inte kan rita", () => {
    expect(pdfSafeText("Hinder 3→4: 5,2 m (≥ 6 m) ✓")).toBe("Hinder 3->4: 5,2 m (>= 6 m) OK");
  });
  it("behåller svenska tecken och typografi i cp1252", () => {
    const s = "Åre – Östersund · 30 × 40 m · 45°";
    expect(pdfSafeText(s)).toBe(s);
  });
  it("tar bort emoji i bannamn", () => {
    expect(pdfSafeText("Min bana 🐕")).toBe("Min bana ");
  });
});
