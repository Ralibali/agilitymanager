/**
 * Tester för RuleSet-registret och regelverkens metadata/spårbarhet.
 *
 * Siffrorna som testas här är citerade mot officiella källdokument —
 * se sourceDocuments i respektive regelverk och rapporten
 * agilitymanager_rules_hoopers_report.md för URL:er och åtkomstdatum.
 */
import { describe, expect, it } from "vitest";
import {
  getAllRuleSets,
  getRuleSet,
  getActiveRuleSets,
  getDefaultRuleSetIdForSport,
  getRuleSetsForSport,
  isRuleFieldVerified,
  SKK_AGILITY_2023,
  HOOPERS_SHS_2022,
  HOOPERS_FCI_2026,
  FCI_HOOPERS_RULESET_ID,
} from "./index";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("RuleSet registry", () => {
  it("innehåller SKK agility, SHoK hoopers och FCI hoopers", () => {
    const ids = getAllRuleSets().map((rs) => rs.id);
    expect(ids).toContain("skk-agility-2023");
    expect(ids).toContain("hoopers-shs-2022");
    expect(ids).toContain(FCI_HOOPERS_RULESET_ID);
  });

  it("default per sport pekar på nationella regelverk (inte FCI)", () => {
    expect(getDefaultRuleSetIdForSport("agility")).toBe("skk-agility-2023");
    expect(getDefaultRuleSetIdForSport("hoopers")).toBe("hoopers-shs-2022");
    expect(getRuleSet("nonsens-id")).toBeUndefined();
  });

  it("getRuleSetsForSport returnerar båda hoopersverken men bara ett agilityverk", () => {
    expect(getRuleSetsForSport("hoopers").map((rs) => rs.id).sort())
      .toEqual(["hoopers-fci-2026", "hoopers-shs-2022"]);
    expect(getRuleSetsForSport("agility")).toHaveLength(1);
  });

  it("getActiveRuleSets respekterar giltighetsperioder", () => {
    // SHoK 2025-11-01–2028-10-31 är aktiv under 2026 men inte efter 2028.
    const active2026 = getActiveRuleSets(new Date("2026-06-01")).map((rs) => rs.id);
    expect(active2026).toContain("hoopers-shs-2022");
    expect(active2026).toContain("skk-agility-2023");
    const active2029 = getActiveRuleSets(new Date("2029-01-01")).map((rs) => rs.id);
    expect(active2029).not.toContain("hoopers-shs-2022");
    expect(active2029).not.toContain("skk-agility-2023");
    // FCI-dokumentet saknar slutdatum och är fortfarande aktivt.
    expect(active2029).toContain(FCI_HOOPERS_RULESET_ID);
  });
});

describe("RuleSet metadata — explicit och spårbar", () => {
  for (const rs of getAllRuleSets()) {
    describe(rs.id, () => {
      it("har alla kärnmetadata fält ifyllda", () => {
        expect(rs.name.length).toBeGreaterThan(0);
        expect(rs.authority.length).toBeGreaterThan(0);
        expect(rs.organization?.length).toBeGreaterThan(0);
        expect(rs.country?.length).toBeGreaterThan(0);
        expect(rs.version?.length).toBeGreaterThan(0);
        expect(["agility", "hoopers"]).toContain(rs.sport);
        expect(rs.validFrom).toMatch(ISO_DATE);
        if (rs.validTo != null) expect(rs.validTo).toMatch(ISO_DATE);
        expect(rs.validTo == null || rs.validTo >= rs.validFrom).toBe(true);
      });

      it("har minst ett källdokument med URL", () => {
        expect(rs.sourceDocuments.length).toBeGreaterThan(0);
        for (const doc of rs.sourceDocuments) {
          expect(doc.url).toMatch(/^https?:\/\//);
          expect(doc.name.length).toBeGreaterThan(0);
        }
      });

      it("har verifieringsstatus och explicita verified/provisional-listor", () => {
        expect(["verified", "partially_verified", "provisional"]).toContain(rs.verificationStatus);
        expect(Array.isArray(rs.verifiedFields)).toBe(true);
        expect(Array.isArray(rs.provisionalFields)).toBe(true);
        // Ett icke fullt verifierat regelverk måste deklarera vad som saknas.
        if (rs.verificationStatus !== "verified") {
          expect(rs.provisionalFields.length).toBeGreaterThan(0);
        }
        // verified och provisional får inte överlappa.
        for (const f of rs.verifiedFields) {
          expect(rs.provisionalFields).not.toContain(f);
        }
      });
    });
  }
});

describe("SHoK Hoopers 2025-11-01–2028-10-31 (svenskahoopersklubben.se)", () => {
  it("har verifierad giltighetsperiod från dokumentets förstasida", () => {
    expect(HOOPERS_SHS_2022.validFrom).toBe("2025-11-01");
    expect(HOOPERS_SHS_2022.validTo).toBe("2028-10-31");
    expect(HOOPERS_SHS_2022.country).toBe("SE");
  });

  it("§2.3: hinderavstånd per klass (5–7 / 6–8 / 6–9 / 6–9 m)", () => {
    const m = HOOPERS_SHS_2022.safetyRules.hoopersConsecutiveMinMByClass;
    expect(m).toMatchObject({ hoopers_1: 5.0, hoopers_2: 6.0, hoopers_3: 6.0, hoopers_4: 6.0 });
  });

  it("§2.3: max avstånd dirigeringsområde → mest avlägsna hinder (13/15/20/25 m)", () => {
    const m = HOOPERS_SHS_2022.safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass;
    expect(m).toMatchObject({ hoopers_1: 13, hoopers_2: 15, hoopers_3: 20, hoopers_4: 25 });
  });

  it("§4.4: 2,5 m för hinder utanför tänkta vägen; start/slut med hoop", () => {
    expect(HOOPERS_SHS_2022.safetyRules.hoopersMinM).toBe(2.5);
    expect(HOOPERS_SHS_2022.safetyRules.hoopersStartEndHoopRequired).toBe(true);
  });

  it("§4.3: maxtid 90 s = 2 × referenstid 45 s (faktor 2.0)", () => {
    for (const v of Object.values(HOOPERS_SHS_2022.timeRules.maxTimeFactorByClass)) {
      expect(v).toBe(2.0);
    }
  });
});

describe("FCI Hoopers Regulations (HOO-REG-en-22638, fci.be)", () => {
  it("är ett internationellt regelverk med dokumenterad osäkerhet om giltighetsdatum", () => {
    expect(HOOPERS_FCI_2026.country).toBe("international");
    expect(HOOPERS_FCI_2026.organization).toBe("FCI");
    expect(HOOPERS_FCI_2026.validTo).toBeNull();
    // validFrom är PDF:ens skapandedatum, inte ett regelverkets giltighetsdatum.
    expect(HOOPERS_FCI_2026.provisionalFields).toContain("validFrom");
  });

  it("§3.1: hinderantal per klass H1 12–18, H2 16–22, H3 20–26", () => {
    const ranges = Object.fromEntries(
      HOOPERS_FCI_2026.classTemplates.map((t) => [t.key, t.obstacleRange]),
    );
    expect(ranges).toEqual({
      hoopers_fci_h1: [12, 18],
      hoopers_fci_h2: [16, 22],
      hoopers_fci_h3: [20, 26],
    });
  });

  it("§3.1: min hinderavstånd per klass 5/6/7 m (center–center)", () => {
    expect(HOOPERS_FCI_2026.safetyRules.hoopersConsecutiveMinMByClass)
      .toEqual({ hoopers_fci_h1: 5.0, hoopers_fci_h2: 6.0, hoopers_fci_h3: 7.0 });
  });

  it("§3.1: ≥50 % hoops, ring ≥800 m² med kortsida ≥20 m, ej-följdhinder ≥2 m", () => {
    const s = HOOPERS_FCI_2026.safetyRules;
    expect(s.hoopersMinHoopShare).toBe(0.5);
    expect(s.arenaMinAreaM2).toBe(800);
    expect(s.arenaMinShortSideM).toBe(20);
    expect(s.hoopersMinM).toBe(2.0);
    expect(s.hoopersStartEndHoopRequired).toBe(true);
  });

  it("§3.1: max avstånd HA → mest avlägsna hinder, Large (15/20/30 m)", () => {
    expect(HOOPERS_FCI_2026.safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass)
      .toEqual({ hoopers_fci_h1: 15, hoopers_fci_h2: 20, hoopers_fci_h3: 30 });
  });

  it("§3.3.1/§7.2: fast maxtid 180 s, ingen referenstid", () => {
    expect(HOOPERS_FCI_2026.timeRules.fixedMaxCourseTimeS).toBe(180);
    expect(Object.keys(HOOPERS_FCI_2026.timeRules.refSpeedMsByClass)).toHaveLength(0);
  });
});

describe("isRuleFieldVerified — styr officiell etikett", () => {
  it("verifierade fält får officiell etikett, provisional fält inte", () => {
    expect(isRuleFieldVerified(HOOPERS_SHS_2022, "safetyRules.hoopersConsecutiveMinMByClass")).toBe(true);
    expect(isRuleFieldVerified(HOOPERS_SHS_2022, "safetyRules.hoopersHandlerZoneMinM")).toBe(false);
    expect(isRuleFieldVerified(SKK_AGILITY_2023, "safetyRules.contactAfterTunnelMinM")).toBe(false);
    expect(isRuleFieldVerified(HOOPERS_FCI_2026, "timeRules.fixedMaxCourseTimeS")).toBe(true);
  });
});
