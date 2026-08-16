import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FILTER_PREFS,
  readFilterPrefs,
  sanitizeFilterPrefs,
  writeFilterPrefs,
} from "./competitionFilterPrefs";

describe("competitionFilterPrefs", () => {
  it("faller tillbaka på standardvärden för trasig data", () => {
    expect(sanitizeFilterPrefs(null)).toEqual(DEFAULT_FILTER_PREFS);
    expect(sanitizeFilterPrefs({ sport: "kaos" })).toEqual(DEFAULT_FILTER_PREFS);
  });

  it("behåller giltiga värden", () => {
    expect(
      sanitizeFilterPrefs({ sport: "hoopers", county: "Skåne", onlyOpen: true, matchOn: true }),
    ).toEqual({
      sport: "hoopers",
      county: "Skåne",
      onlyOpen: true,
      onlyFavorites: false,
      matchOn: true,
    });
  });

  it("sparar och läser tillbaka filtren", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
      dispatchEvent: () => true,
      CustomEvent: class {},

    });
    writeFilterPrefs({ ...DEFAULT_FILTER_PREFS, sport: "agility", matchOn: true });
    expect(readFilterPrefs()).toMatchObject({ sport: "agility", matchOn: true });
    vi.unstubAllGlobals();
  });
});

