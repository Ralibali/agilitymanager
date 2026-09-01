/**
 * Banplaneraren v2 — Regelmotor (registry).
 *
 * Exponerar `getRuleSet`, `getActiveRuleSets` och `DEFAULT_RULESET_ID`
 * så att andra moduler (validation, planeraren, PDF-export) kan slå upp
 * ett versionerat regelverk via id.
 */

import { SKK_AGILITY_2023 } from "./skk-agility-2023";
import { HOOPERS_SHS_2022 } from "./hoopers-shs";
import { HOOPERS_FCI_2026 } from "./hoopers-fci";
import type { RuleSet } from "./types";

export type {
  RuleSet,
  SafetyRules,
  TimeRules,
  SourceDocument,
  RuleSetVerificationStatus,
} from "./types";

export const DEFAULT_RULESET_ID = "skk-agility-2023";
export const DEFAULT_HOOPERS_RULESET_ID = "hoopers-shs-2022";
export const FCI_HOOPERS_RULESET_ID = "hoopers-fci-2026";

const ALL_RULE_SETS: RuleSet[] = [SKK_AGILITY_2023, HOOPERS_SHS_2022, HOOPERS_FCI_2026];

export function getAllRuleSets(): RuleSet[] {
  return ALL_RULE_SETS;
}

export function getRuleSet(id: string): RuleSet | undefined {
  return ALL_RULE_SETS.find((rs) => rs.id === id);
}

/** Alla regelverk för en sport (oavsett giltighetsperiod). */
export function getRuleSetsForSport(sport: "agility" | "hoopers"): RuleSet[] {
  return ALL_RULE_SETS.filter((rs) => rs.sport === sport);
}

/** Returnerar regelverk som är giltiga vid `date` (default: idag). */
export function getActiveRuleSets(date: Date = new Date()): RuleSet[] {
  const iso = date.toISOString().slice(0, 10);
  return ALL_RULE_SETS.filter((rs) => {
    if (rs.validFrom > iso) return false;
    if (rs.validTo && rs.validTo < iso) return false;
    return true;
  });
}

/** Default-regelverk per sport — används som fallback för gamla banor. */
export function getDefaultRuleSetIdForSport(sport: "agility" | "hoopers"): string {
  return sport === "hoopers" ? DEFAULT_HOOPERS_RULESET_ID : DEFAULT_RULESET_ID;
}

/**
 * Är ett enskilt fält (dotted path, t.ex. "safetyRules.minSafeM") citerat mot
 * det officiella källdokumentet? Endast då får UI/validering presentera
 * kontrollen med officiell regel-etikett — annars är det en
 * förhandskontroll/heuristik även om regelverket som helhet är delverifierat.
 */
export function isRuleFieldVerified(rs: RuleSet, fieldPath: string): boolean {
  return rs.verifiedFields.includes(fieldPath);
}

export { SKK_AGILITY_2023, HOOPERS_SHS_2022, HOOPERS_FCI_2026 };
