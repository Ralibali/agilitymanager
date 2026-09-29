import { describe, expect, it } from "vitest";
import {
  emptyResultStore,
  isClean,
  meritProgress,
  nextLevel,
  ordinal,
  removeResult,
  sanitizeResult,
  sanitizeResultStore,
  statsFor,
  upsertResult,
  type RunResult,
} from "./dogResults";

function run(patch: Partial<RunResult> = {}): RunResult {
  return {
    id: "r1",
    dogId: "dp_a",
    date: "2026-09-01",
    competitionName: "Höstagility",
    discipline: "agility",
    level: "Klass 1",
    faults: 0,
    disqualified: false,
    timeSec: 38.5,
    placement: 2,
    starters: 30,
    merit: true,
    updatedAt: 1,
    ...patch,
  };
}

describe("isClean", () => {
  it("kräver noll fel och ingen disk", () => {
    expect(isClean(run())).toBe(true);
    expect(isClean(run({ faults: 5 }))).toBe(false);
    expect(isClean(run({ disqualified: true }))).toBe(false);
    expect(isClean(run({ faults: null }))).toBe(false);
  });
});

describe("sanitizeResult", () => {
  it("avvisar lopp utan id, hund eller giltigt datum", () => {
    expect(sanitizeResult({ ...run(), id: "" })).toBeNull();
    expect(sanitizeResult({ ...run(), dogId: undefined })).toBeNull();
    expect(sanitizeResult({ ...run(), date: "1 sep" })).toBeNull();
    expect(sanitizeResult(null)).toBeNull();
  });

  it("tolkar decimalkomma och kastar orimliga värden", () => {
    const r = sanitizeResult({ ...run(), timeSec: "41,27", faults: -1, placement: 0 });
    expect(r?.timeSec).toBe(41.27);
    expect(r?.faults).toBeNull();
    expect(r?.placement).toBeNull();
  });

  it("faller tillbaka till giltig disciplin och klass", () => {
    const r = sanitizeResult({ ...run(), discipline: "frisbee", level: "Klass 9" });
    expect(r?.discipline).toBe("agility");
    expect(r?.level).toBe("Klass 1");
    const h = sanitizeResult({ ...run(), discipline: "hoopers", level: "Startklass" });
    expect(h?.level).toBe("Startklass");
  });

  it("kapar långa texter", () => {
    const r = sanitizeResult({ ...run(), competitionName: "x".repeat(500), notes: "y".repeat(5000) });
    expect(r?.competitionName).toHaveLength(200);
    expect(r?.notes).toHaveLength(1000);
  });
});

describe("sanitizeResultStore", () => {
  it("rensar bort trasiga lopp och sorterar nyast först", () => {
    const store = sanitizeResultStore({
      results: [run({ id: "a", date: "2026-01-01" }), { junk: true }, run({ id: "b", date: "2026-05-01" })],
      meritTarget: 99,
    });
    expect(store?.results.map((r) => r.id)).toEqual(["b", "a"]);
    expect(store?.meritTarget).toBe(3);
  });

  it("ger null för okänt format", () => {
    expect(sanitizeResultStore("hej")).toBeNull();
    expect(sanitizeResultStore({ results: "nej" })).toBeNull();
  });
});

describe("upsertResult / removeResult", () => {
  it("lägger till, uppdaterar och tar bort lopp", () => {
    let store = upsertResult(emptyResultStore(), run({ id: "a" }), 10);
    store = upsertResult(store, run({ id: "a", faults: 5 }), 20);
    expect(store.results).toHaveLength(1);
    expect(store.results[0]).toMatchObject({ faults: 5, updatedAt: 20 });
    store = removeResult(store, "a");
    expect(store.results).toHaveLength(0);
  });
});

describe("statsFor", () => {
  it("räknar starter, felfria, placeringar och bästa tid per klass", () => {
    const stats = statsFor([
      run({ id: "a", placement: 1, timeSec: 40 }),
      run({ id: "b", placement: 3, timeSec: 36.2, merit: false }),
      run({ id: "c", faults: 5, placement: null, timeSec: 30, merit: false }),
      run({ id: "d", disqualified: true, faults: null, placement: null, merit: false }),
    ]);
    expect(stats).toMatchObject({ starts: 4, clean: 2, cleanRate: 0.5, disqualified: 1, wins: 1, podiums: 2, merits: 1 });
    expect(stats.bestCleanTime["agility|Klass 1"]).toBe(36.2);
  });

  it("hanterar en tom logg", () => {
    expect(statsFor([]).cleanRate).toBeNull();
  });
});

describe("meritProgress", () => {
  it("visar meriter per disciplin och klass mot målet", () => {
    const progress = meritProgress(
      [
        run({ id: "a" }),
        run({ id: "b" }),
        run({ id: "c", merit: false }),
        run({ id: "d", discipline: "hopp", level: "Klass 2" }),
        run({ id: "e", level: "Klass 3" }),
        run({ id: "f", level: "Nollklass" }),
      ],
      2,
    );
    expect(progress).toEqual([
      { discipline: "agility", level: "Klass 1", merits: 2, target: 2, reached: true },
      { discipline: "hopp", level: "Klass 2", merits: 1, target: 2, reached: false },
    ]);
  });
});

describe("nextLevel", () => {
  it("ger nästa klass eller null i högsta klassen", () => {
    expect(nextLevel("agility", "Klass 1")).toBe("Klass 2");
    expect(nextLevel("hoopers", "Startklass")).toBe("Klass 1");
    expect(nextLevel("hopp", "Klass 3")).toBeNull();
  });
});

describe("ordinal", () => {
  it("följer svenska ordningstal", () => {
    expect([1, 2, 3, 4, 11, 12, 21, 22, 101].map(ordinal)).toEqual([
      "1:a", "2:a", "3:e", "4:e", "11:e", "12:e", "21:a", "22:a", "101:a",
    ]);
  });
});
