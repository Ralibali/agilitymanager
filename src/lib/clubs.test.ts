import { describe, expect, it } from "vitest";
import { buildClubDirectory, filterClubs, groupClubsByCounty } from "./clubs";
import { registrationOpen, type UnifiedCompetition } from "./competitionData";

const NOW = new Date("2026-09-29T12:00:00");

function comp(patch: Partial<UnifiedCompetition>): UnifiedCompetition {
  return {
    key: "agility-1",
    id: "1",
    sport: "agility",
    name: "Tävling",
    club: "Kungälvs BK",
    location: "Kungälv",
    county: "Västra Götalands",
    dateStart: "2026-10-10",
    dateEnd: null,
    registrationCloses: "2026-10-20",
    classes: [],
    judges: [],
    status: null,
    sourceUrl: null,
    path: "/tavlingar/1",
    ...patch,
  };
}

describe("registrationOpen", () => {
  it("räknar bara känt, framtida sista anmälningsdatum som öppet", () => {
    expect(registrationOpen("2026-10-20", NOW)).toBe(true);
    expect(registrationOpen("2026-09-29", NOW)).toBe(true);
    expect(registrationOpen("2026-09-01", NOW)).toBe(false);
    expect(registrationOpen(null, NOW)).toBe(false);
  });
});

describe("buildClubDirectory", () => {
  it("slår ihop stavningsvarianter och sammanfattar klubbens tävlingar", () => {
    const clubs = buildClubDirectory([
      comp({ key: "a", club: "Kungälvs BK", dateStart: "2026-11-01", location: "Kungälv" }),
      comp({ key: "b", club: "Kungälvs BK", dateStart: "2026-10-05", location: "Ytterby" }),
      comp({ key: "c", club: "KUNGÄLVS BK", sport: "hoopers", dateStart: "2026-12-01", registrationCloses: null }),
      comp({ key: "d", club: "", location: "Okänd" }),
      comp({ key: "e", club: "Alingsås HK", county: null, dateStart: null }),
    ]);
    expect(clubs.map((c) => c.slug)).toEqual(["alingsas-hk", "kungalvs-bk"]);
    const kbk = clubs[1];
    expect(kbk).toMatchObject({
      name: "Kungälvs BK",
      county: "Västra Götalands",
      sports: ["agility", "hoopers"],
      upcoming: 3,
      nextDate: "2026-10-05",
      locations: ["Kungälv", "Ytterby"],
    });
    expect(clubs[0]).toMatchObject({ county: null, nextDate: null });
  });
});

describe("buildClubDirectory med genomförda tävlingar", () => {
  it("behåller klubbar som bara har genomförda tävlingar", () => {
    const clubs = buildClubDirectory(
      [comp({ key: "a", club: "Kungälvs BK", dateStart: "2026-11-01" })],
      [
        comp({ key: "p1", club: "Hallabergs Brukshundklubb", location: "Laholm", county: "Hallands", dateStart: "2026-05-01" }),
        comp({ key: "p2", club: "Hallabergs Brukshundklubb", location: "Laholm", county: "Hallands", dateStart: "2026-08-29" }),
        comp({ key: "p3", club: "Kungälvs BK", dateStart: "2026-06-01" }),
      ],
    );
    const halla = clubs.find((c) => c.slug === "hallabergs-brukshundklubb");
    expect(halla).toMatchObject({ upcoming: 0, past: 2, lastDate: "2026-08-29", nextDate: null, county: "Hallands" });
    expect(clubs.find((c) => c.slug === "kungalvs-bk")).toMatchObject({ upcoming: 1, past: 1, nextDate: "2026-11-01" });
  });
});

describe("groupClubsByCounty", () => {
  it("sorterar län i bokstavsordning med okänt län sist", () => {
    const clubs = buildClubDirectory([
      comp({ key: "a", club: "Ö-klubben", county: "Örebro" }),
      comp({ key: "b", club: "A-klubben", county: null }),
      comp({ key: "c", club: "B-klubben", county: "Blekinge" }),
    ]);
    expect(groupClubsByCounty(clubs).map(([county]) => county)).toEqual(["Blekinge", "Örebro", ""]);
  });
});

describe("filterClubs", () => {
  const clubs = buildClubDirectory([
    comp({ key: "a", club: "Kungälvs BK", location: "Kungälv", county: "Västra Götalands" }),
    comp({ key: "b", club: "Malmö BK", location: "Malmö", county: "Skåne" }),
  ]);

  it("söker i namn, ort och län utan hänsyn till åäö", () => {
    expect(filterClubs(clubs, "malmo").map((c) => c.name)).toEqual(["Malmö BK"]);
    expect(filterClubs(clubs, "Skåne").map((c) => c.name)).toEqual(["Malmö BK"]);
    expect(filterClubs(clubs, "kungalv").map((c) => c.name)).toEqual(["Kungälvs BK"]);
    expect(filterClubs(clubs, "  ")).toHaveLength(2);
  });
});
