import { describe, expect, it } from "vitest";
import { filterPublicCourses, isPubliclyVisible } from "./courseVisibility";

describe("courseVisibility — publik/privat-filtrering", () => {
  it("räknar bara explicit is_public === true som publik", () => {
    expect(isPubliclyVisible({ is_public: true })).toBe(true);
    expect(isPubliclyVisible({ is_public: false })).toBe(false);
    expect(isPubliclyVisible({ is_public: null })).toBe(false);
    expect(isPubliclyVisible({})).toBe(false);
    expect(isPubliclyVisible(null)).toBe(false);
    expect(isPubliclyVisible(undefined)).toBe(false);
  });

  it("filtrerar bort privata och odefinierade rader", () => {
    const rows = [
      { id: "pub", is_public: true },
      { id: "priv", is_public: false },
      { id: "null", is_public: null },
      { id: "saknas" },
    ];
    const visible = filterPublicCourses(rows);
    expect(visible.map((r) => r.id)).toEqual(["pub"]);
  });

  it("tål null/undefined-listor", () => {
    expect(filterPublicCourses(null)).toEqual([]);
    expect(filterPublicCourses(undefined)).toEqual([]);
  });

  it("bevarar övriga fält på synliga rader", () => {
    const rows = [{ id: "a", name: "Bana", is_public: true }];
    expect(filterPublicCourses(rows)[0]).toMatchObject({ id: "a", name: "Bana" });
  });
});
