import { describe, expect, it } from "vitest";
import { AGILITY_SOURCE, HOOPERS_SOURCE, competitionSource } from "./competitionSource";

describe("competitionSource", () => {
  it("använder tävlingens egen källsida när den finns", () => {
    expect(competitionSource("agility", "https://agilitydata.se/taevlingar/123")).toEqual({
      ...AGILITY_SOURCE,
      url: "https://agilitydata.se/taevlingar/123",
    });
  });

  it("visar värdnamnet när hoopers kommer från en annan sajt", () => {
    expect(competitionSource("hoopers", "https://www.example-hoopers.se/t/9")).toMatchObject({
      name: "example-hoopers.se",
      organization: HOOPERS_SOURCE.organization,
    });
  });

  it("faller tillbaka på standardkällan vid saknad eller ogiltig länk", () => {
    expect(competitionSource("agility", null)).toEqual(AGILITY_SOURCE);
    expect(competitionSource("hoopers", "javascript:alert(1)")).toEqual(HOOPERS_SOURCE);
    expect(competitionSource("agility", "inte en länk")).toEqual(AGILITY_SOURCE);
  });
});
