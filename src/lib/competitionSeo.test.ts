import { describe, expect, it } from "vitest";
import { competitionSeo } from "./competitionSeo";
import { cleanCompetitionName, type UnifiedCompetition } from "./competitionData";

const NOW = new Date("2026-09-30T12:00:00Z");

function comp(patch: Partial<UnifiedCompetition>): UnifiedCompetition {
  return {
    key: "a-1", id: "1", sport: "agility", name: "Siljan Open", club: "Nedansiljans BK",
    location: "Rättvik", county: "Dalarnas", dateStart: "2026-10-30", dateEnd: null,
    registrationCloses: "2026-10-15", classes: [], judges: [], status: null, sourceUrl: null,
    path: "/tavlingar/1/nedansiljans-bk-rattvik-2026-10-30", ...patch,
  };
}

describe("cleanCompetitionName", () => {
  it("tar bort dekorativa tecken men behåller svenska namn", () => {
    expect(cleanCompetitionName("勇冀 Siljan Open 冀勇")).toBe("Siljan Open");
    expect(cleanCompetitionName("🐾 Höstagility 2026! 🐾")).toBe("Höstagility 2026!");
    expect(cleanCompetitionName("Up and Run´s med hopp om sommaren")).toBe("Up and Run´s med hopp om sommaren");
    expect(cleanCompetitionName("SM-kval (Ag3) – Malmö")).toBe("SM-kval (Ag3) – Malmö");
    expect(cleanCompetitionName("***")).toBe("");
  });
});

describe("competitionSeo", () => {
  it("sätter tävlingens namn först, sedan sport, ort och datum", () => {
    expect(competitionSeo(comp({}), NOW).title).toBe("Siljan Open – agilitytävling i Rättvik, 30 okt. 2026");
    expect(competitionSeo(comp({ sport: "hoopers" }), NOW).title).toContain("hooperstävling i Rättvik");
  });

  it("kortar långa titlar vid ett ordslut", () => {
    const { title } = competitionSeo(comp({ name: "Mycket lång tävling ".repeat(6).trim() }), NOW);
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title.endsWith("…")).toBe(true);
  });

  it("visar anmälningsstatus eller att tävlingen är genomförd", () => {
    expect(competitionSeo(comp({}), NOW).description).toContain("Sista anmälningsdag 15 okt. 2026.");
    expect(competitionSeo(comp({ registrationCloses: "2026-09-01" }), NOW).description).toContain("Anmälan är stängd.");
    const past = competitionSeo(comp({ dateStart: "2026-08-30" }), NOW).description;
    expect(past).toContain("Tävlingen är genomförd.");
    expect(past).not.toContain("anmälan");
    expect(competitionSeo(comp({}), NOW).description.length).toBeLessThanOrEqual(158);
  });
});
