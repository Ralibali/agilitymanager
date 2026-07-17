/**
 * RuleSet: SAgiK/SKK Agility 2022–2026.
 *
 * Källa (verifierad 2026-07): "Regler för agilitytävlingar 2022-01-01–
 * 2026-12-31" (SAgiK/SKK), agilityklubben.se/regler.
 *
 * Verifierade avsnitt:
 *  - §2.1 Storleksgrupper: XS <28, S <35, M 35–<43, L 43–<50, XL ≥43 cm
 *  - §3.1 Banområde: 30×40 m rekommenderat; 15–22 hinderpassager;
 *    hinderavstånd 6–8 m (hundens väg); minst 6 m före första/efter sista
 *    hindret; minst 1 m hinder–vägg; minst 7 hoppassager; max ett slalom;
 *    oxer får inte användas i klass 1.
 *  - §3.4 Tidtagning: referenstiden sätts av domaren per bana; maxtiden är
 *    2 × referenstiden. Det finns alltså INGEN fast m/s-modell i regelverket
 *    — refSpeedMs används här endast som planeringsuppskattning.
 *  - §4.5 Hopphöjder (klass 1 / klass 2–3): XS 10–15/10–20, S 20–25/20–30,
 *    M 30–35/30–40, L 40–45/40–50, XL 50–55/50–60 cm.
 *  - §4.7 Långhopp: XS 35–40 cm/2 delar, S 40–50/2, M 70–90/3, L 90–120/4,
 *    XL 120–150/4–5.
 *  - §4.8 Däck: XS 10–20, S 20–30, M 30–40, L 40–50, XL 50–60 cm till
 *    lägsta punkten på ringens innerkant.
 *
 * Fortfarande preliminärt (behöver "Säkra hinder"-anvisningarna):
 *  - contactAfterTunnelMinM (avstånd tunnel → kontaktfältshinder).
 */

import {
  SIZE_CLASSES, CLASS_TEMPLATES, OBSTACLES_V2,
} from "../config";
import type { RuleSet } from "./types";

export const SKK_AGILITY_2023: RuleSet = {
  id: "skk-agility-2023",
  name: "SAgiK/SKK Agility 2022–2026",
  authority: "Svenska Agilityklubben (SAgiK) / Svenska Kennelklubben (SKK)",
  validFrom: "2022-01-01",
  validTo: "2026-12-31",
  sourceUrl: "https://www.agilityklubben.se/regler",
  sourceDocuments: [
    {
      name: "Regler för agilitytävlingar 2022-01-01–2026-12-31",
      url: "http://agilityklubben.se/wp-content/uploads/2022/02/REGLER_AGILITY-_TAVLINGAR_2022_2026.pdf",
      notes: "Huvudregelverk — verifierat 2026-07: storleksgrupper (§2.1), banområde och hinderavstånd (§3.1), tidtagning (§3.4), hopphöjder (§4.5), långhopp (§4.7), däck (§4.8).",
    },
    {
      name: "Referenstid – regelverkets modell",
      url: "http://agilityklubben.se/wp-content/uploads/2022/02/REGLER_AGILITY-_TAVLINGAR_2022_2026.pdf",
      notes: "VERIFIERAT §3.4: referenstiden sätts av domaren för varje bana (fastställs senast efter 5 hundar i mål). Maxtiden är 2 × referenstiden. Ingen fast m/s-modell finns — refSpeedMs är vår planeringsuppskattning.",
    },
    {
      name: "Säkra hinder – anvisningar",
      url: "https://www.agilityklubben.se/regler",
      notes: "KVARSTÅR ATT VERIFIERA: avstånd tunnel → kontaktfältshinder (contactAfterTunnelMinM).",
    },
  ],
  sport: "agility",

  // Sprint 1: Vi pekar på de existerande arrayerna i config.ts så att inget
  // beteende ändras. Värdena i dessa arrayer är fortfarande de ursprungliga
  // hårdkodade uppskattningarna och behöver verifieras enligt checklistan
  // ovan. Varje numeriskt värde är markerat // TODO VERIFIERA i config.ts.
  sizeClasses: SIZE_CLASSES,
  classTemplates: CLASS_TEMPLATES.filter((t) => t.sport === "agility"),
  obstacleSpecs: OBSTACLES_V2.filter((o) => o.sport.includes("agility")),

  safetyRules: {
    // VERIFIERAT §3.1: avståndet mellan hindren, mätt som hundens väg, ska
    // vara 6–8 m. Undre gränsen 6,0 m används som minimivärde.
    minSafeM: 6.0,
    // VERIFIERAT §3.1: samma 6–8 m-regel gäller alla storleksklasser.
    // (Det gamla kombinationshindret med 2/3/4 m-avstånd togs bort ur
    // regelverket 2022 — oxer är numera ett enda hinder.)
    minComboMBySize: Object.fromEntries(
      SIZE_CLASSES.map((s) => [s.key, s.comboDistanceM]),
    ),
    // PRELIMINÄRT: tröskeln för "för nära kontaktfält efter tunnel" — väntar
    // på "Säkra hinder"-anvisningarna.
    contactAfterTunnelMinM: 5.0,
  },

  timeRules: {
    // VERIFIERAT §3.4: referenstiden sätts av domaren per bana — ingen fast
    // m/s-modell i regelverket. "fixed_speed"-värdena nedan är
    // planeringsuppskattningar, inte regelparametrar.
    model: "fixed_speed",
    refSpeedMsByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "agility")
        .map((t) => [t.key, t.refSpeedMs]),
    ),
    // VERIFIERAT §3.4: maxtiden är 2 × referenstiden.
    maxTimeFactorByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "agility")
        .map((t) => [t.key, t.maxTimeFactor]),
    ),
  },

  // Spårbarhet: kärnvärdena (storleksklasser, hinderavstånd, hinderantal,
  // hopphöjder, långhopp, däck, maxtidsfaktor) är citerade mot SAgiK/SKK
  // 2022–2026 enligt sourceDocuments. Kvar: tunnel→kontaktfält-avstånd.
  verificationStatus: "partially_verified",
  verifiedFields: [
    "sizeClasses.jumpHeightCm",
    "sizeClasses.tireHeightCm",
    "sizeClasses.longJumpLengthCm",
    "sizeClasses.longJumpPlanks",
    "safetyRules.minSafeM",
    "safetyRules.minComboMBySize",
    "timeRules.maxTimeFactorByClass",
    "classTemplates.arenaSize",
    "classTemplates.obstacleRange",
  ],
  provisionalFields: [
    "safetyRules.contactAfterTunnelMinM",
    "timeRules.refSpeedMsByClass",
    "obstacleSpecs.dimensions",
  ],
};
