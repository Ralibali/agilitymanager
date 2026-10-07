import { describe, expect, it } from "vitest";
import { daysUntil, deadlineInfo, normalizeJudges, agilityToUnified, type AgilityCompetition } from "./competitionData";
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


describe('domarnamn från tävlingskällor', () => {
  it('deduplicerar den upprepade källetiketten på tävling 10144', () => {
    const comp = agilityToUnified({ id: '10144', judges: ['Malin Lindskog Malin Lindskog'] } as AgilityCompetition);
    expect(comp.judges).toEqual(['Malin Lindskog']);
  });
  it('rensar HTML, whitespace och dubletter men bevarar olika domare', () => {
    expect(normalizeJudges(['<b>Malin Lindskog</b>', ' malin  lindskog ', 'Anna Svensson; Anna Andersson'])).toEqual(['Malin Lindskog', 'Anna Svensson', 'Anna Andersson']);
    expect(normalizeJudges([null, ''])).toEqual([]);
  });
});
