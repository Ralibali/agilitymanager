import { describe, expect, it, vi, afterEach } from "vitest";
import {
  parseSession,
  parseTrainingFile,
  serializeTraining,
  saveTraining,
  loadTraining,
  sessionText,
  TRAINING_KEY,
  type TrainingSession,
} from "./trainingPlans";
const session: TrainingSession = {
  id: "one",
  title: "Slalom",
  dog: "Molly",
  date: "2026-09-07",
  goal: "Lugn ingång",
  course: { name: "Bana 1", href: "/banplanerare?template=one" },
  completed: false,
  reflection: "",
  nextStep: "",
  videoUrl: "",
};
afterEach(() => vi.unstubAllGlobals());
describe("training session storage and sharing", () => {
  it("round-trips plans, reflections and linked courses", () => {
    const completed = {
      ...session,
      completed: true,
      reflection: "Bra ingång",
      nextStep: "Öka avståndet",
    };
    expect(parseTrainingFile(serializeTraining([completed]))).toEqual([
      completed,
    ]);
    expect(sessionText(completed)).toContain("Nästa steg: Öka avståndet");
  });
  it.each(["2026-02-30", "", "tomorrow"])(
    "rejects invalid calendar date %s",
    (date) => expect(parseSession({ ...session, date })).toBeNull()
  );
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
  ])("rejects unsafe video URL %s", (videoUrl) =>
    expect(parseSession({ ...session, videoUrl })).toBeNull()
  );
  it("rejects external or unrelated course links", () => {
    for (const href of [
      "//example.com",
      "/banplanerare?redirect=https://example.com",
      "https://example.com/banplanerare?bana=a",
    ])
      expect(
        parseSession({ ...session, course: { name: "Unsafe", href } })
      ).toBeNull();
  });
  it("rejects malformed, duplicate and oversized plans without silently dropping entries", () => {
    expect(() => parseTrainingFile("{bad")).toThrow();
    expect(() =>
      parseTrainingFile(serializeTraining([session, session]))
    ).toThrow();
    expect(() =>
      parseTrainingFile(
        serializeTraining(
          Array.from({ length: 101 }, (_, i) => ({ ...session, id: String(i) }))
        )
      )
    ).toThrow();
    expect(() =>
      parseTrainingFile(serializeTraining([{ ...session, goal: "" }]))
    ).toThrow();
  });
  it("preserves the saved copy when persistence fails", () => {
    let stored = serializeTraining([session]);
    vi.stubGlobal("localStorage", {
      getItem: () => stored,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() => saveTraining([{ ...session, completed: true }])).toThrow(
      "Kunde inte spara"
    );
    expect(loadTraining()[0].completed).toBe(false);
    stored = "{bad";
    expect(loadTraining).toThrow();
  });
  it("persists only validated data under its own key", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    saveTraining([session]);
    expect(setItem).toHaveBeenCalledWith(
      TRAINING_KEY,
      serializeTraining([session])
    );
  });
});
