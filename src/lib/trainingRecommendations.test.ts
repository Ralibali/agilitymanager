import { describe, it, expect } from "vitest";
import {
  recommendDailyPlan,
  pickPrimaryFocus,
  shouldSuggestLighterVariant,
  swapRecommendation,
  buildFirstInsight,
  defaultFocus,
  normalizeFocus,
  FOCUS_LABELS,
  type RecInput,
} from "./trainingRecommendations";

describe("pickPrimaryFocus", () => {
  it("returnerar default-fokus när inget valts", () => {
    expect(pickPrimaryFocus({ sport: "Agility", focus: [] })).toBe("weaves");
    expect(pickPrimaryFocus({ sport: "Hoopers", focus: [] })).toBe("directing");
  });

  it("returnerar valt fokus när det är ett", () => {
    expect(pickPrimaryFocus({ sport: "Agility", focus: ["contacts"] })).toBe("contacts");
  });

  it("filtrerar bort inkompatibla fokus (agility-fokus i hoopers)", () => {
    expect(pickPrimaryFocus({ sport: "Hoopers", focus: ["weaves"] })).toBe("directing");
  });

  it("roterar mellan flera val via variant", () => {
    const a = pickPrimaryFocus({ sport: "Agility", focus: ["weaves", "contacts"], variant: 0 });
    const b = pickPrimaryFocus({ sport: "Agility", focus: ["weaves", "contacts"], variant: 1 });
    expect(a).toBe("weaves");
    expect(b).toBe("contacts");
  });
});

describe("shouldSuggestLighterVariant", () => {
  it("false utan senaste session", () => {
    expect(shouldSuggestLighterVariant({ sport: "Agility", focus: [] })).toBe(false);
  });

  it("true när senaste mood ≤ 2", () => {
    expect(
      shouldSuggestLighterVariant({
        sport: "Agility",
        focus: [],
        recentSessions: [{ date: "2026-07-01", duration_min: 30, overall_mood: 2 }],
      }),
    ).toBe(true);
  });

  it("true när senaste pass var väldigt långt (≥60 min)", () => {
    expect(
      shouldSuggestLighterVariant({
        sport: "Agility",
        focus: [],
        recentSessions: [{ date: "2026-07-01", duration_min: 75, overall_mood: 4 }],
      }),
    ).toBe(true);
  });

  it("false vid normal session", () => {
    expect(
      shouldSuggestLighterVariant({
        sport: "Agility",
        focus: [],
        recentSessions: [{ date: "2026-07-01", duration_min: 30, overall_mood: 4 }],
      }),
    ).toBe(false);
  });

  it("hanterar tom recentSessions-array", () => {
    expect(
      shouldSuggestLighterVariant({ sport: "Agility", focus: [], recentSessions: [] }),
    ).toBe(false);
  });
});

describe("recommendDailyPlan", () => {
  it("returnerar ett komplett pass för agility default", () => {
    const rec = recommendDailyPlan({ sport: "Agility", focus: [] });
    expect(rec.focus).toBe("weaves");
    expect(rec.focusKey).toBe("weaves");
    expect(rec.focusLabel).toBe(FOCUS_LABELS.weaves);
    expect(rec.durationMinutes).toBeGreaterThanOrEqual(6);
    expect(rec.durationMinutes).toBeLessThanOrEqual(20);
    expect(rec.minutes).toBe(rec.durationMinutes);
    expect(rec.steps).toHaveLength(3);
    expect(rec.equipment.length).toBeGreaterThan(0);
    expect(rec.reason.length).toBeGreaterThan(20);
    expect(rec.easierAlternative.steps).toHaveLength(3);
    expect(rec.easierAlternative.equipment.length).toBeGreaterThan(0);
    expect(rec.easierAlternative.logDefaults.durationMinutes).toBeGreaterThan(0);
    expect(rec.logDefaults.type.length).toBeGreaterThan(0);
    expect(rec.logDefaults.focusLabel).toBe(FOCUS_LABELS.weaves);
  });

  it("innehåller inga tvärsäkra faktapåståenden i motiveringen", () => {
    const rec = recommendDailyPlan({ sport: "Agility", focus: ["weaves"] });
    expect(rec.reason).not.toMatch(/enskilt vanligaste/i);
  });

  it("respekterar hoopers-fokus", () => {
    const rec = recommendDailyPlan({ sport: "Hoopers", focus: ["tunnels"] });
    expect(rec.focus).toBe("tunnels");
    expect(rec.focusLabel).toBe(FOCUS_LABELS.tunnels);
  });

  it("växlar till lättare variant efter tungt pass — och använder alternativets egna steg", () => {
    const heavy: RecInput = {
      sport: "Agility",
      focus: ["weaves"],
      recentSessions: [{ date: "2026-07-01", duration_min: 60, overall_mood: 2 }],
    };
    const normal = recommendDailyPlan({ sport: "Agility", focus: ["weaves"] });
    const rec = recommendDailyPlan(heavy);
    expect(rec.id).toContain("lite");
    expect(rec.reason).toMatch(/tungt|lättare/i);
    // Använder alternativets egna steg, INTE huvudpassets
    expect(rec.steps).not.toEqual(normal.steps);
    expect(rec.steps).toEqual(rec.easierAlternative.steps);
    expect(rec.equipment).toEqual(rec.easierAlternative.equipment);
  });

  it("är deterministisk för samma input", () => {
    const a = recommendDailyPlan({ sport: "Agility", focus: ["contacts"], variant: 1 });
    const b = recommendDailyPlan({ sport: "Agility", focus: ["contacts"], variant: 1 });
    expect(a).toEqual(b);
  });

  it("täcker alla agility-fokus utan att kasta", () => {
    const focuses: RecInput["focus"] = [
      "weaves",
      "contacts",
      "starts",
      "handling_turns",
      "speed_confidence",
      "competition_nerves",
    ];
    for (const f of focuses) {
      const rec = recommendDailyPlan({ sport: "Agility", focus: [f] });
      expect(rec.focus).toBe(f);
      expect(rec.steps).toHaveLength(3);
      expect(rec.easierAlternative.steps).toHaveLength(3);
    }
  });

  it("täcker alla hoopers-fokus utan att kasta", () => {
    const focuses: RecInput["focus"] = [
      "directing",
      "distance",
      "lines_flow",
      "tunnels",
      "independence",
    ];
    for (const f of focuses) {
      const rec = recommendDailyPlan({ sport: "Hoopers", focus: [f] });
      expect(rec.focus).toBe(f);
    }
  });
});

describe("swapRecommendation", () => {
  it("returnerar en annan variant/fokus när variant ökar", () => {
    const input: RecInput = { sport: "Agility", focus: ["weaves", "contacts"], variant: 0 };
    const a = recommendDailyPlan(input);
    const b = swapRecommendation(a, input);
    expect(b.id).not.toBe(a.id);
  });
});

describe("normalizeFocus", () => {
  it("mappar svenska etiketter", () => {
    expect(normalizeFocus("Slalom")).toBe("weaves");
    expect(normalizeFocus("dirigering")).toBe("directing");
    expect(normalizeFocus("Tunnlar")).toBe("tunnels");
  });
  it("mappar engelska nycklar", () => {
    expect(normalizeFocus("handling_turns")).toBe("handling_turns");
    expect(normalizeFocus("tunnels")).toBe("tunnels");
  });
  it("returnerar null för okänt värde", () => {
    expect(normalizeFocus("random_stuff")).toBeNull();
    expect(normalizeFocus("")).toBeNull();
    expect(normalizeFocus(null)).toBeNull();
    expect(normalizeFocus(undefined)).toBeNull();
  });
  it("filtrerar mot sport när angivet", () => {
    expect(normalizeFocus("slalom", "Hoopers")).toBeNull();
    expect(normalizeFocus("slalom", "Agility")).toBe("weaves");
  });
});

describe("buildFirstInsight", () => {
  it("stark mood → positiv insikt med hundens namn", () => {
    const text = buildFirstInsight({ dogName: "Bella", mood: 5, focusLabel: "Slalom" });
    expect(text).toMatch(/Bella/);
    expect(text).toMatch(/slalom/i);
  });

  it("stark mood + notes_good citeras", () => {
    const text = buildFirstInsight({ dogName: "Bella", mood: 5, notesGood: "Snabb slalom" });
    expect(text).toMatch(/Snabb slalom/);
  });

  it("låg mood + notes_improve används", () => {
    const text = buildFirstInsight({ dogName: "Bella", mood: 1, notesImprove: "Ingång slalom" });
    expect(text).toMatch(/Ingång slalom/);
  });

  it("låg mood utan notes → generisk vägledning", () => {
    const text = buildFirstInsight({ dogName: "Bella", mood: 1 });
    expect(text).toMatch(/enklare|kortare|självförtroendet/i);
  });

  it("faller tillbaka på 'träningen' när inget fokus finns", () => {
    const text = buildFirstInsight({ dogName: "", mood: 3 });
    expect(text).toMatch(/träningen|hund/i);
  });
});

describe("defaultFocus", () => {
  it("agility → weaves, hoopers → directing", () => {
    expect(defaultFocus("Agility")).toBe("weaves");
    expect(defaultFocus("Hoopers")).toBe("directing");
  });
});
