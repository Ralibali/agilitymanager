import { describe, it, expect } from "vitest";
import {
  courseSportToLogSport,
  mapObstacleTypesToFormOptions,
  defaultDurationForCourse,
} from "./courseToLogDefaults";

describe("courseToLogDefaults", () => {
  it("courseSportToLogSport maps agility/hoopers", () => {
    expect(courseSportToLogSport("agility")).toBe("Agility");
    expect(courseSportToLogSport("hoopers")).toBe("Hoopers");
  });

  it("agility mapping is unique, Svensk och begränsad", () => {
    const labels = mapObstacleTypesToFormOptions("agility", [
      "jump", "jump", "tunnel", "weave_12", "aframe", "dogwalk", "table", "longjump", "start", "finish", "number",
    ]);
    expect(labels).toEqual(["Hopp", "Tunnel", "Slalom", "A-ram", "Gångbro", "Bordstopp"]);
  });

  it("hoopers mapping ignorerar agilityhinder", () => {
    const labels = mapObstacleTypesToFormOptions("hoopers", [
      "hoop", "tunnel", "barrel", "fence", "aframe", "start", "finish",
    ]);
    expect(labels).toEqual(["Hoop", "Tunnel", "Tunna", "Staket"]);
  });

  it("okända/onumrerade typer försvinner tyst", () => {
    const labels = mapObstacleTypesToFormOptions("agility", ["start", "finish", "number", "handler_zone"]);
    expect(labels).toEqual([]);
  });

  it("respekterar maxCount", () => {
    const labels = mapObstacleTypesToFormOptions(
      "agility",
      ["jump", "tunnel", "weave_12", "aframe", "dogwalk", "table"],
      2,
    );
    expect(labels).toHaveLength(2);
  });

  it("default duration is bounded and heuristic", () => {
    expect(defaultDurationForCourse(0)).toBe(15);
    expect(defaultDurationForCourse(10)).toBe(20);
    expect(defaultDurationForCourse(20)).toBe(25);
  });
});
