/**
 * RuleSet: Svenska Hooperssällskapets regelverk (SHoK), gällande från 2022.
 *
 * Källa: https://www.hooperssallskapet.se (TODO VERIFIERA direktlänk
 * till PDF-regelverket).
 *
 * ⚠️ VERIFIERINGSARBETE — INTE KLART
 * Samma princip som för SKK_AGILITY_2023: alla numeriska värden härrör
 * från den tidigare hårdkodade konfigurationen och måste verifieras mot
 * SHoK:s officiella dokument. Checklista:
 *  - Klasstruktur (hoopers klass 1–4): antal hinder, banstorlek,
 *    tillåtna hindertyper.
 *  - Referenshastigheter och maxtidsfaktorer.
 *  - Min-avstånd mellan hinder (idag hårdkodat till 3.0 m i validation.ts).
 *  - Krav på dirigeringsområde (förarens zon) och min-avstånd därifrån.
 */

import {
  SIZE_CLASSES, CLASS_TEMPLATES, OBSTACLES_V2,
} from "../config";
import type { RuleSet } from "./types";

export const HOOPERS_SHS_2022: RuleSet = {
  id: "hoopers-shs-2022",
  name: "SHoK Hoopers 2022→",
  authority: "Svenska Hooperssällskapet (SHoK)",
  validFrom: "2022-01-01",
  validTo: null,
  sourceUrl: "https://www.hooperssallskapet.se",
  sourceDocuments: [
    {
      name: "SHoK Regelverk Hoopers",
      url: "https://www.hooperssallskapet.se",
      notes: "TODO VERIFIERA: klassindelning, hindermått, min-avstånd och dirigeringsregler.",
    },
  ],
  sport: "hoopers",

  sizeClasses: SIZE_CLASSES,
  classTemplates: CLASS_TEMPLATES.filter((t) => t.sport === "hoopers"),
  obstacleSpecs: OBSTACLES_V2.filter((o) => o.sport.includes("hoopers")),

  safetyRules: {
    // TODO VERIFIERA: SHoK-värden för minimiavstånd.
    minSafeM: 3.0,
    minComboMBySize: Object.fromEntries(
      SIZE_CLASSES.map((s) => [s.key, 3.0]),
    ),
    contactAfterTunnelMinM: 3.0,
    hoopersMinM: 3.0, // TODO VERIFIERA — idag hårdkodat i validation.ts
    hoopersHandlerZoneMinM: 3.0, // TODO VERIFIERA — idag hårdkodat i validation.ts
  },

  timeRules: {
    model: "fixed_speed", // TODO VERIFIERA
    refSpeedMsByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "hoopers")
        .map((t) => [t.key, t.refSpeedMs]),
    ),
    maxTimeFactorByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "hoopers")
        .map((t) => [t.key, t.maxTimeFactor]),
    ),
  },
};
