import { describe, it, expect, vi } from "vitest";

/**
 * Kontraktstest för store.ts. Säkerställer att exporterade funktioner
 * och deras signaturer inte förändras av misstag — varje borttagning
 * eller omdöpning av en funktion bryter testet och flaggas i CI.
 */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe("store contract", () => {
  it("exposes the public store API", async () => {
    const { store, getNextDogColor } = await import("@/lib/store");
    const required = [
      "getDogs",
      "addDog",
      "updateDog",
      "deleteDog",
      "getTraining",
      "getTrainingForDog",
      "addTraining",
      "getCompetitions",
      "getCompetitionsForDog",
      "addCompetition",
      "getPlanned",
      "addPlanned",
      "updatePlanned",
    ] as const;
    for (const fn of required) {
      expect(typeof store[fn], `store.${fn} saknas`).toBe("function");
    }
    expect(typeof getNextDogColor).toBe("function");
  });

  it("getDogs returns an array", async () => {
    const { store } = await import("@/lib/store");
    const dogs = await store.getDogs();
    expect(Array.isArray(dogs)).toBe(true);
  });

  it("getNextDogColor returns an HSL color string", async () => {
    const { getNextDogColor } = await import("@/lib/store");
    const color = await getNextDogColor();
    expect(color).toMatch(/^hsl\(/);
  });
});
