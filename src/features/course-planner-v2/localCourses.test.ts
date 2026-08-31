import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteLocalCourse,
  getLocalCourse,
  listLocalCourses,
  saveLocalCourse,
} from "./localCourses";

const KEY = "am_planner_local_courses";

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

describe("localCourses", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returnerar tom lista vid trasig lagring", () => {
    stubStorage({ [KEY]: "{ inte json" });
    expect(listLocalCourses()).toEqual([]);
  });

  it("returnerar tom lista när localStorage saknas helt", () => {
    // Ingen stub — localStorage är odefinierat i testmiljön.
    expect(listLocalCourses()).toEqual([]);
  });

  it("filtrerar bort ogiltiga poster vid inläsning", () => {
    stubStorage({
      [KEY]: JSON.stringify([
        { id: "ok", name: "Bra", sport: "agility", obstacleCount: 5, updatedAt: "2026-01-01", data: {} },
        { name: "saknar id", data: {} },
        { id: "x", data: null },
        "skräp",
        null,
      ]),
    });
    const list = listLocalCourses();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("ok");
  });

  it("saniterar namn med styrtecken och klipper långa namn", () => {
    stubStorage({
      [KEY]: JSON.stringify([
        { id: "a", name: "Bana\r\n\t" + "x".repeat(300), sport: "agility", obstacleCount: 1, updatedAt: "", data: {} },
      ]),
    });
    const [c] = listLocalCourses();
    // eslint-disable-next-line no-control-regex
    expect(c.name).not.toMatch(/[\u0000-\u001F]/);
    expect(c.name.length).toBeLessThanOrEqual(120);
    expect(c.name.startsWith("Bana")).toBe(true);
  });

  it("spara → lista → hämta → ta bort (roundtrip)", () => {
    const store = stubStorage();
    const id = saveLocalCourse({ name: "Min bana", sport: "agility", obstacleCount: 3, data: { obstacles: [] } });
    expect(id).toBeTruthy();
    expect(store.has(KEY)).toBe(true);

    const list = listLocalCourses();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Min bana");

    expect(getLocalCourse(id)?.id).toBe(id);
    expect(getLocalCourse("finns-inte")).toBeNull();

    deleteLocalCourse(id);
    expect(listLocalCourses()).toEqual([]);
  });

  it("uppdaterar befintlig bana vid samma id", () => {
    stubStorage();
    const id = saveLocalCourse({ name: "V1", sport: "agility", obstacleCount: 1, data: {} });
    saveLocalCourse({ id, name: "V2", sport: "agility", obstacleCount: 2, data: {} });
    const list = listLocalCourses();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("V2");
    expect(list[0].obstacleCount).toBe(2);
  });

  it("ger namnlösa banor ett standardnamn och ogiltiga räkningar noll", () => {
    stubStorage();
    saveLocalCourse({ name: "   ", sport: "agility", obstacleCount: Number.NaN, data: {} });
    const [c] = listLocalCourses();
    expect(c.name).toBe("Namnlös bana");
    expect(c.obstacleCount).toBe(0);
  });
});
