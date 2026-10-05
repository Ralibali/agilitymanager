import { describe, expect, it } from "vitest";
import { daysUntil, deadlineInfo } from "./competitionData";
import { localIsoDate } from "./format";

describe("datum i lokal tid", () => {
  // 6 oktober kl. 00:30 lokal tid — i UTC är det fortfarande 5 oktober i
  // tidszoner öster om Greenwich (t.ex. Sverige).
  const justAfterMidnight = new Date(2026, 9, 6, 0, 30);

  it("localIsoDate ger det lokala datumet", () => {
    expect(localIsoDate(justAfterMidnight)).toBe("2026-10-06");
  });

  it("daysUntil räknar från lokal midnatt", () => {
    expect(daysUntil("2026-10-06", justAfterMidnight)).toBe(0);
    expect(daysUntil("2026-10-05", justAfterMidnight)).toBe(-1);
    expect(daysUntil("2026-10-13", justAfterMidnight)).toBe(7);
  });

  it("en anmälan som stängde i går visas som stängd strax efter midnatt", () => {
    expect(deadlineInfo("2026-10-05", justAfterMidnight).tone).toBe("closed");
    expect(deadlineInfo("2026-10-06", justAfterMidnight).label).toBe("Sista anmälningsdag i dag");
  });
});
