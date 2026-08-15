/**
 * RuleSet: Svenska Hoopersklubbens regelverk (SHoK), gällande 2025-11-01→.
 *
 * Källa (verifierad 2026-07): "Regler för hooperstävlingar" (SHoK),
 * svenskahoopersklubben.se.
 *
 * Verifierade avsnitt:
 *  - §2.1 Storleksgrupper: Small <40 cm, Large ≥40 cm (två grupper —
 *    agilitys fem storleksklasser gäller EJ hoopers; sizeClass-valet är
 *    därför mest informativt i hooperläge).
 *  - §2.3 Klasser: startklass 10–15 hinder (5–7 m mellan hinder),
 *    klass 1: 13–20 (6–8 m), klass 2: 17–22 (6–9 m), klass 3: 20–24 (6–9 m).
 *  - §4 Referenstid: 45 sekunder i ALLA klasser; maxtid 90 sekunder.
 *    Det finns ingen m/s-modell — refSpeedMs är planeringsuppskattning.
 *  - §4.4 Banområde: 30×30 m rekommenderat; banan börjar och slutar alltid
 *    med en hoop; hinder utanför hundens tänkta väg ska ligga minst 2,5 m
 *    från den tänkta vägen.
 *  - §1.6 Hunden ska vara 15 månader (agility: 18 månader).
 */

import {
  SIZE_CLASSES, CLASS_TEMPLATES, OBSTACLES_V2,
} from "../config";
import type { RuleSet } from "./types";

export const HOOPERS_SHS_2022: RuleSet = {
  id: "hoopers-shs-2022",
  name: "SHoK Hoopers 2025-11-01→",
  authority: "Svenska Hoopersklubben (SHoK)",
  validFrom: "2025-11-01",
  validTo: null,
  sourceUrl: "https://www.svenskahoopersklubben.se",
  sourceDocuments: [
    {
      name: "Regler för hooperstävlingar (SHoK) 2025-11-01",
      url: "https://www.svenskahoopersklubben.se/wp-content/uploads/2025/08/SHOK-REGLER-2025-11-01.pdf",
      notes: "Verifierat 2026-07: storleksgrupper (§2.1), klasser och hinderavstånd (§2.3), referenstid 45 s/maxtid 90 s (§4), banområde 30×30 m och 2,5 m-regeln (§4.4).",
    },
  ],
  sport: "hoopers",

  sizeClasses: SIZE_CLASSES,
  classTemplates: CLASS_TEMPLATES.filter((t) => t.sport === "hoopers"),
  obstacleSpecs: OBSTACLES_V2.filter((o) => o.sport.includes("hoopers")),

  safetyRules: {
    // VERIFIERAT §2.3: hinderavstånd 5–7 m (startklass) respektive 6–8/6–9 m
    // (klass 1–3) → 5,0 m som absolut minimigräns.
    minSafeM: 5.0,
    minComboMBySize: Object.fromEntries(
      SIZE_CLASSES.map((s) => [s.key, 5.0]),
    ),
    contactAfterTunnelMinM: 3.0,
    // VERIFIERAT §4.4: hinder utanför hundens tänkta väg ska ligga minst
    // 2,5 m från den tänkta vägen.
    hoopersMinM: 2.5,
    // PRELIMINÄRT: krav kring dirigeringsområdet är MAXAVSTÅND (13–25 m beroende
    // på klass), inte minimiavstånd — behöver modelleras om. Värdet nedan är
    // en behållen uppskattning tills dess.
    hoopersHandlerZoneMinM: 3.0,
  },

  timeRules: {
    // VERIFIERAT §4: referenstiden är 45 s i alla klasser och maxtiden 90 s —
    // en fast tid, ingen hastighetsmodell. refSpeedMs är en
    // planeringsuppskattning av banlängd/tid, inte en regelparameter.
    model: "fixed_speed",
    refSpeedMsByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "hoopers")
        .map((t) => [t.key, t.refSpeedMs]),
    ),
    // VERIFIERAT §4: 90/45 = faktor 2,0.
    maxTimeFactorByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "hoopers")
        .map((t) => [t.key, t.maxTimeFactor]),
    ),
  },

  verificationStatus: "partially_verified",
  verifiedFields: [
    "safetyRules.minSafeM",
    "safetyRules.minComboMBySize",
    "safetyRules.hoopersMinM",
    "timeRules.maxTimeFactorByClass",
    "classTemplates.obstacleRange",
    "classTemplates.arenaSize",
  ],
  provisionalFields: [
    "safetyRules.contactAfterTunnelMinM",
    "safetyRules.hoopersHandlerZoneMinM",
    "timeRules.refSpeedMsByClass",
    "obstacleSpecs.dimensions",
  ],
};
