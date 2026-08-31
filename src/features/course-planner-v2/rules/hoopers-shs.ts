/**
 * RuleSet: Svenska Hoopersklubbens regelverk (SHoK), 2025-11-01–2028-10-31.
 *
 * Källa (verifierad 2026-07, omkontrollerad 2026-08-31): "Regler för
 * hooperstävlingar" (SHoK), gäller 2025-11-01 t.o.m. 2028-10-31,
 * svenskahoopersklubben.se.
 *
 * Verifierade avsnitt:
 *  - §1.6 Hunden ska vara 15 månader (agility: 18 månader).
 *  - §2.1 Storleksgrupper: Small upp till 39,99 cm, Large från 40,00 cm
 *    (två grupper — agilitys fem storleksklasser gäller EJ hoopers;
 *    sizeClass-valet är därför mest informativt i hooperläge).
 *  - §2.3 Tävlingsklasser: startklass 10–15 hinder (5–7 m mellan hinder,
 *    max 13 m från DO), klass 1: 13–20 (6–8 m, max 15 m), klass 2: 17–22
 *    (6–9 m, max 20 m), klass 3: 20–24 (6–9 m, max 25 m). Avstånd mäts
 *    "hundens tänkta väg" — inte center-till-center som hos FCI.
 *  - §4.3 Tidtagning: referenstiden är 45 sekunder i ALLA klasser;
 *    maxtid 90 sekunder. Det finns ingen m/s-modell — refSpeedMs är
 *    planeringsuppskattning.
 *  - §4.4 Banområde: 30×30 m rekommenderat; banan måste alltid börja och
 *    sluta med en hoop; hoops måste alltid ingå; hinder som inte ligger i
 *    hundens tänkta väg ska ha minst 2,5 m avstånd till den tänkta vägen.
 *  - §4.5 Dirigeringsområde: startklass ⌀4 m / 4×4 m, klass 1 ⌀3 m / 3×3 m,
 *    klass 2–3 ⌀2 m / 2×2 m (storleken styrs av domaren, modelleras ej).
 */

import {
  SIZE_CLASSES, CLASS_TEMPLATES, OBSTACLES_V2,
} from "../config";
import type { RuleSet } from "./types";

export const HOOPERS_SHS_2022: RuleSet = {
  id: "hoopers-shs-2022",
  name: "SHoK Hoopers 2025-11-01–2028-10-31",
  authority: "Svenska Hoopersklubben (SHoK)",
  organization: "SHoK",
  country: "SE",
  version: "2025-11-01–2028-10-31",
  validFrom: "2025-11-01",
  // VERIFIERAT mot dokumentets förstasida: "Gäller från och med 2025-11-01
  // till och med 2028-10-31".
  validTo: "2028-10-31",
  sourceUrl: "https://www.svenskahoopersklubben.se",
  sourceDocuments: [
    {
      name: "Regler för hooperstävlingar (SHoK) 2025-11-01–2028-10-31",
      url: "https://www.svenskahoopersklubben.se/wp-content/uploads/2025/08/SHOK-REGLER-2025-11-01.pdf",
      notes: "Verifierat 2026-07, omkontrollerat 2026-08-31: storleksgrupper (§2.1), klasser, hinderavstånd och maxavstånd från DO (§2.3), referenstid 45 s/maxtid 90 s (§4.3), banområde 30×30 m, start/slut-hoop och 2,5 m-regeln (§4.4).",
      section: "§1.6, §2.1, §2.3, §4.3–4.5",
    },
  ],
  sport: "hoopers",

  sizeClasses: SIZE_CLASSES,
  classTemplates: CLASS_TEMPLATES.filter((t) => t.sport === "hoopers"),
  obstacleSpecs: OBSTACLES_V2.filter((o) => o.sport.includes("hoopers")),

  safetyRules: {
    // VERIFIERAT §2.3: hinderavstånd 5–7 m (startklass) respektive 6–8/6–9 m
    // (klass 1–3), mätt hundens tänkta väg → 5,0 m som absolut minimigräns.
    minSafeM: 5.0,
    minComboMBySize: Object.fromEntries(
      SIZE_CLASSES.map((s) => [s.key, 5.0]),
    ),
    contactAfterTunnelMinM: 3.0,
    // VERIFIERAT §4.4: hinder som inte ligger i hundens tänkta väg måste ha
    // minst 2,5 m avstånd (gäller alltså hinder utanför nummerföljden —
    // inte minimiavståndet mellan följdhinder).
    hoopersMinM: 2.5,
    // VERIFIERAT §2.3: undre gränsen per klass (5–7 / 6–8 / 6–9 / 6–9 m),
    // mätt hundens tänkta väg. Planeraren approximerar med centrumavstånd,
    // se validation.ts.
    hoopersConsecutiveMinMByClass: {
      hoopers_1: 5.0,
      hoopers_2: 6.0,
      hoopers_3: 6.0,
      hoopers_4: 6.0,
    },
    // VERIFIERAT §2.3: max avstånd från dirigeringsområdet till utsidan av
    // det mest avlägsna hindret (13/15/20/25 m). För klass 1–2 gäller
    // maxavståndet endast om BO/UL inte används.
    hoopersMaxDistanceFromHandlerZoneMByClass: {
      hoopers_1: 13,
      hoopers_2: 15,
      hoopers_3: 20,
      hoopers_4: 25,
    },
    // VERIFIERAT §4.4: "Banan måste alltid börja och sluta med en hoop."
    hoopersStartEndHoopRequired: true,
    // PRELIMINÄRT: krav kring dirigeringsområdet är MAXAVSTÅND (13–25 m beroende
    // på klass), inte minimiavstånd — behöver modelleras om. Värdet nedan är
    // en behållen uppskattning tills dess.
    hoopersHandlerZoneMinM: 3.0,
  },

  timeRules: {
    // VERIFIERAT §4.3: referenstiden är 45 s i alla klasser och maxtiden 90 s —
    // en fast tid, ingen hastighetsmodell. refSpeedMs är en
    // planeringsuppskattning av banlängd/tid, inte en regelparameter.
    model: "fixed_speed",
    refSpeedMsByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "hoopers")
        .map((t) => [t.key, t.refSpeedMs]),
    ),
    // VERIFIERAT §4.3: 90/45 = faktor 2,0.
    maxTimeFactorByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "hoopers")
        .map((t) => [t.key, t.maxTimeFactor]),
    ),
  },

  verificationStatus: "partially_verified",
  verifiedAt: "2026-08-31",
  verifiedFields: [
    "safetyRules.minSafeM",
    "safetyRules.minComboMBySize",
    "safetyRules.hoopersMinM",
    "safetyRules.hoopersConsecutiveMinMByClass",
    "safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass",
    "safetyRules.hoopersStartEndHoopRequired",
    "timeRules.maxTimeFactorByClass",
    "classTemplates.obstacleRange",
    "classTemplates.arenaSize",
    "validTo",
  ],
  provisionalFields: [
    "safetyRules.contactAfterTunnelMinM",
    "safetyRules.hoopersHandlerZoneMinM",
    "timeRules.refSpeedMsByClass",
    "obstacleSpecs.dimensions",
  ],
};
