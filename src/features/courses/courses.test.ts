import { describe, expect, it } from "vitest";
import { courseDate, parseCourseSessions, registrationSchema, stockholmTimestamp, toDateTimeInput } from "./courses";

describe("course dates in Swedish time", () => {
  it("keeps instructor times in Stockholm during both winter and summer", () => {
    expect(stockholmTimestamp("2027-01-15T18:00")).toBe("2027-01-15T17:00:00.000Z");
    expect(stockholmTimestamp("2027-07-15T18:00")).toBe("2027-07-15T16:00:00.000Z");
    expect(toDateTimeInput("2027-07-15T16:00:00.000Z")).toBe("2027-07-15T18:00");
    expect(courseDate("2027-07-15T16:00:00.000Z")).toContain("18:00");
  });
  it("rejects nonexistent and ambiguous daylight saving times", () => {
    expect(() => stockholmTimestamp("2027-03-28T02:30")).toThrow("sommartid");
    expect(() => stockholmTimestamp("2027-10-31T02:30")).toThrow("vintertid");
    expect(stockholmTimestamp("2027-03-28T03:30")).toBe("2027-03-28T01:30:00.000Z");
  });
  it.each(["2027-02-29T18:00", "2027-04-31T18:00", "", "2027-01-15", "2027-01-15T25:00"])("rejects invalid dates: %s", (date) => {
    expect(() => stockholmTimestamp(date)).toThrow();
  });
  it("sorts sessions and permits adjacent sessions without allowing overlap", () => {
    const first = { starts_at: "2027-07-15T18:00", ends_at: "2027-07-15T19:00" };
    const next = { starts_at: "2027-07-15T19:00", ends_at: "2027-07-15T20:00" };
    expect(parseCourseSessions([next, first])).toEqual([
      { starts_at: "2027-07-15T16:00:00.000Z", ends_at: "2027-07-15T17:00:00.000Z" },
      { starts_at: "2027-07-15T17:00:00.000Z", ends_at: "2027-07-15T18:00:00.000Z" },
    ]);
    expect(() => parseCourseSessions([first, { ...next, starts_at: "2027-07-15T18:59" }])).toThrow("överlappa");
    expect(() => parseCourseSessions([{ ...first, ends_at: first.starts_at }])).toThrow("efter");
    expect(() => parseCourseSessions([])).toThrow("1–30");
    expect(() => parseCourseSessions([{ starts_at: "2027-07-15T18:00", ends_at: "2027-07-23T18:00" }])).toThrow("sju dagar");
  });
});

describe("anonymised course registration", () => {
  it("still renders a roster after an attendee erases their contact and dog details", () => {
    const registration = registrationSchema.parse({
      id: "00000000-0000-4000-8000-000000000020", course_id: "00000000-0000-4000-8000-000000000010",
      profile_id: null, participant_name: "Borttagen deltagare", participant_email: "", phone: "", dog: {},
      status: "cancelled", payment_status: "refunded", price_sek: 750, payment_instructions: "Betala till instruktören.",
      refund_due: false, revision: 4, created_at: "2026-10-15T12:00:00Z", waitlist_position: null,
    });
    expect(registration.profile_id).toBeNull();
    expect(registration.dog.name).toBe("");
    expect(registration.payment_status).toBe("refunded");
  });
});
