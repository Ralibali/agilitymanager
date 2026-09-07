/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  appendHistory,
  courseSchema,
  parseVideoTime,
  progressFor,
  safeVideo,
  videoTime,
} from "./coaching";
describe("private coaching", () => {
  it.each([
    "javascript:alert(1)",
    "http://youtube.com/watch?v=x",
    "https://user:pass@youtube.com/x",
    "https://bad host/x",
  ])("rejects unsafe video link %s", (link) =>
    expect(safeVideo(link)).toBe(false),
  );
  it("allows normal HTTPS video links without fetching or embedding them", () => {
    expect(safeVideo("https://www.youtube.com/watch?v=abc&t=84")).toBe(true);
    expect(safeVideo("")).toBe(true);
  });
  it("validates timestamps including the last allowed minute", () => {
    expect(parseVideoTime("1:24")).toBe(84);
    expect(videoTime(84)).toBe("1:24");
    expect(parseVideoTime("360:00")).toBe(21600);
    expect(parseVideoTime("")).toBeNull();
    for (const s of ["1:60", "-1:00", "1.24", "360:01", "999:00"])
      expect(() => parseVideoTime(s)).toThrow();
  });
  it("keeps a course reference inside the planner and bounds stored course links", () => {
    expect(
      courseSchema.safeParse({
        name: "Övning",
        href: "/banplanerare?template=agility_1",
      }).success,
    ).toBe(true);
    expect(
      courseSchema.safeParse({
        name: "Sparad",
        href: "/banplanerare?bana=Ab_c-d",
      }).success,
    ).toBe(true);
    for (const href of [
      "//evil.test/banplanerare?bana=a",
      "/banplanerare?template=a&redirect=x",
      "/banplanerare?bana=" + "a".repeat(100001),
    ])
      expect(courseSchema.safeParse({ name: "x", href }).success).toBe(false);
  });
  it("uses server progress across all history, not only the currently loaded page", () => {
    const p = {
      student_id: "student",
      assignment_id: "assignment",
      latest_id: "latest",
      completed: true,
      reviewed: false,
    };
    expect(progressFor("student", "assignment", [])).toBe("Ingen rapport");
    expect(progressFor("student", "assignment", [p])).toContain(
      "väntar på återkoppling",
    );
    expect(
      progressFor("student", "assignment", [{ ...p, reviewed: true }]),
    ).toBe("Senaste rapporten har återkoppling");
    expect(progressFor("other", "assignment", [p])).toBe("Ingen rapport");
  });
  it("deduplicates reports across retried pagination and keeps newer local state", () =>
    expect(
      appendHistory(
        [{ id: "a", value: 2 }],
        [
          { id: "a", value: 1 },
          { id: "b", value: 3 },
        ],
      ),
    ).toEqual([
      { id: "a", value: 2 },
      { id: "b", value: 3 },
    ]));
  it("enforces ownership, link revocation, immutable reports and history pagination in Postgres", () => {
    const out = execFileSync(
      process.execPath,
      ["scripts/verify-coaching-db.mjs"],
      { encoding: "utf8" },
    );
    expect(out).toContain("PASS: 65 coaching database checks.");
  }, 30000);
});
