import { describe, it, expect } from "vitest";
import {
  recommendDailyPlan,
  pickPrimaryFocus,
  shouldSuggestLighterVariant,
  swapRecommendation,
  buildFirstInsight,
  defaultFocus,
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
});

describe("recommendDailyPlan", () => {
  it("returnerar ett komplett pass för agility default", () => {
    const rec = recommendDailyPlan({ sport: "Agility", focus: [] });
    expect(rec.focusKey).toBe("weaves");
    expect(rec.focusLabel).toBe(FOCUS_LABELS.weaves);
    expect(rec.minutes).toBeGreaterThanOrEqual(6);
    expect(rec.minutes).toBeLessThanOrEqual(20);
    expect(rec.steps).toHaveLength(3);
    expect(rec.equipment.length).toBeGreaterThan(0);
    expect(rec.why.length).toBeGreaterThan(20);
    expect(rec.alternative.title.length).toBeGreaterThan(3);
  });

  it("respekterar hoopers-fokus", () => {
    const rec = recommendDailyPlan({ sport: "Hoopers", focus: ["tunnels"] });
    expect(rec.focusKey).toBe("tunnels");
    expect(rec.focusLabel).toBe(FOCUS_LABELS.tunnels);
  });

  it("växlar till lättare variant efter tungt pass", () => {
    const heavy: RecInput = {
      sport: "Agility",
      focus: ["weaves"],
      recentSessions: [{ date: "2026-07-01", duration_min: 60, overall_mood: 2 }],
    };
    const rec = recommendDailyPlan(heavy);
    expect(rec.id).toContain("lite");
    expect(rec.why).toMatch(/tungt|lättare/i);
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
      expect(rec.focusKey).toBe(f);
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
      expect(rec.focusKey).toBe(f);
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

describe("buildFirstInsight", () => {
  it("stark mood → positiv insikt med hundens namn", () => {
    const text = buildFirstInsight({ dogName: "Bella", mood: 5, focusLabel: "Slalom" });
    expect(text).toMatch(/Bella/);
    expect(text).toMatch(/slalom/i);
  });

  it("låg mood → tips om lättare pass", () => {
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
