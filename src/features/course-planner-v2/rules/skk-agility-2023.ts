/**
 * RuleSet: SAgiK/SKK Agility 2022–2026.
 *
 * Källa (manuellt verifierad): https://www.agilityklubben.se/regler
 *
 * ⚠️ VERIFIERINGSARBETE — INTE KLART
 * Flera numeriska värden i denna fil härstammar från den ursprungliga
 * hårdkodade konfigurationen (config.ts) och är uppskattningar snarare än
 * verifierade citat från regelverket. Varje sådant värde är markerat
 * `// TODO VERIFIERA` och måste slås upp i det officiella dokumentet
 * innan vi får hävda att banplaneraren följer regelverket.
 *
 * Checklista (slå upp på agilityklubben.se/regler och dokumentera källa
 * i sourceDocuments + i kommentar bredvid värdet):
 *  1. Agilityregler 2022-01-01–2026-12-31:
 *     - Hopphöjder per storleksklass (XS, S, M, L, XL)
 *     - Däckhöjder per storleksklass
 *     - Långhopp: antal plankor och total längd per storleksklass
 *     - Hindermått (bredd, djup, höjder)
 *     - Antal hinder per klass och nivå (hoppklass 1/2/3, agilityklass 1/2/3, hopplag, nollklass)
 *     - Banstorlek (rekommenderad/max)
 *  2. Referenstider – Information (reviderad 2023):
 *     - Hur referens- och maxtid faktiskt fastställs per klass/storlek.
 *       Om det INTE är en fast m/s utan en tabell eller kategoribaserad
 *       hastighet, anpassa TimeRules.model och refSpeedMsByClass/
 *       maxTimeFactorByClass därefter (eller utöka TimeRules).
 *  3. "Säkra hinder"-anvisningar:
 *     - Minimiavstånd mellan hinder i kombination per storleksklass
 *     - Ansatskrav för däck, långhopp och kontaktfält
 *     - Avstånd kontaktfält efter tunnel
 *     - Avstånd från hinder till banans gräns
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
      name: "Agilityregler 2022-01-01–2026-12-31",
      url: "https://www.agilityklubben.se/regler",
      notes: "Huvudregelverk — TODO VERIFIERA exakta värden för hindermått, hopphöjder, antal hinder per klass och banstorlek.",
    },
    {
      name: "Referenstider – Information (reviderad 2023)",
      url: "https://www.agilityklubben.se/regler",
      notes: "TODO VERIFIERA: hur referens- och maxtid räknas fram. Nuvarande implementation antar fast m/s per klass — det stämmer eventuellt inte med dokumentet.",
    },
    {
      name: "Säkra hinder – anvisningar",
      url: "https://www.agilityklubben.se/regler",
      notes: "TODO VERIFIERA: minimiavstånd, ansatskrav och övriga säkerhetsregler.",
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
    // TODO VERIFIERA: Säkra hinder anger sannolikt mer nyanserade avstånd
    // per hindertyp och storlek. 4 m är en generell uppskattning.
    minSafeM: 4.0,
    // TODO VERIFIERA: kombinationsavstånd per storleksklass.
    minComboMBySize: Object.fromEntries(
      SIZE_CLASSES.map((s) => [s.key, s.comboDistanceM]),
    ),
    // TODO VERIFIERA: tröskeln för "för nära kontaktfält efter tunnel".
    contactAfterTunnelMinM: 5.0,
  },

  timeRules: {
    // TODO VERIFIERA: modellen kan behöva ändras till "table_lookup"
    // beroende på vad Referenstider-dokumentet faktiskt säger.
    model: "fixed_speed",
    refSpeedMsByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "agility")
        .map((t) => [t.key, t.refSpeedMs]),
    ),
    maxTimeFactorByClass: Object.fromEntries(
      CLASS_TEMPLATES.filter((t) => t.sport === "agility")
        .map((t) => [t.key, t.maxTimeFactor]),
    ),
  },
};
