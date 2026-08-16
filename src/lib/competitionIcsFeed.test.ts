import { describe, expect, it } from "vitest";
import type { UnifiedCompetition } from "./competitionData";
import { buildIcsFeed, foldLine, icsFeedCount, icsFeedFilename } from "./competitionIcsFeed";

function comp(partial: Partial<UnifiedCompetition>): UnifiedCompetition {
  return {
    key: "a-1",
    id: "1",
    sport: "agility",
    name: "Halmstad HU",
    club: "Halmstads BK",
    location: "Halmstad",
    county: "Hallands",
    dateStart: "2026-08-08",
    dateEnd: "2026-08-09",
    registrationCloses: "2026-07-20",
    classes: ["Ag1", "Ag2"],
    judges: [],
    path: "/tavlingar/1/halmstad-hu",
    status: null,
    sourceUrl: null,
    ...partial,
  } as UnifiedCompetition;
}

const now = new Date("2026-08-01T10:00:00Z");

describe("buildIcsFeed", () => {
  it("skapar ett VEVENT per tävling med datum, arrangör och plats", () => {
    const ics = buildIcsFeed([comp({}), comp({ key: "a-2", id: "2", name: "Växjö" })], { now });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260808");
    expect(ics).toContain("DTEND;VALUE=DATE:20260810");
    expect(ics).toContain("Halmstads BK");
    expect(ics).toContain("Hallands län");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("hoppar över tävlingar utan startdatum", () => {
    const list = [comp({}), comp({ key: "a-3", id: "3", dateStart: null })];
    expect(buildIcsFeed(list, { now }).match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(icsFeedCount(list)).toBe(1);
  });

  it("escapar kommatecken i namn", () => {
    expect(buildIcsFeed([comp({ name: "SM, final" })], { now })).toContain("SUMMARY:SM\\, final");
  });

  it("använder slutdatum lika med startdatum när det saknas", () => {
    expect(buildIcsFeed([comp({ dateEnd: null })], { now })).toContain("DTEND;VALUE=DATE:20260809");
  });

  it("viker långa rader enligt RFC 5545", () => {
    const folded = foldLine(`DESCRIPTION:${"a".repeat(200)}`);
    folded.split("\r\n").forEach((l) => expect(l.length).toBeLessThanOrEqual(75));
  });

  it("bygger filnamn från profilnamn", () => {
    expect(icsFeedFilename(" Rio ")).toBe("agilitymanager-tavlingar-rio.ics");
    expect(icsFeedFilename("")).toBe("agilitymanager-tavlingar.ics");
  });
});
