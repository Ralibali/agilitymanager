import { describe, expect, it } from "vitest";
import { legacyCoursePath } from "./legacyCourseRedirect";

describe("legacyCoursePath", () => {
  it("öppnar banor som finns kvar i planeraren", () => {
    expect(legacyCoursePath("sv_hopp_1_flow_01")).toBe("/banplanerare?template=sv_hopp_1_flow_01");
  });

  it("leder borttagna banor till banbiblioteket", () => {
    expect(legacyCoursePath("klass-2-agility-linjeval")).toBe("/banor");
    expect(legacyCoursePath(undefined)).toBe("/banor");
  });
});
