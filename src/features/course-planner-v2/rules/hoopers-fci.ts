/**
 * RuleSet: FCI Hoopers Regulations (internationellt regelverk).
 *
 * Källa (hämtad och verifierad 2026-08-31): "Hoopers Regulations of the
 * Fédération Cynologique Internationale", officiell PDF på fci.be
 * (dokumentkod HOO-REG-en-22638, PDF skapad 2026-04-17). Dokumentet anger
 * inget explicit giltighetsintervall — `validFrom` är därför PDF:ens
 * publicerings-/skapandedatum och `validTo` är null tills FCI publicerar
 * en ersättande version.
 *
 * Verifierade avsnitt (sidhänvisningar i sourceDocuments):
 *  - §2.1 Storlekskategorier: Small ≤ 40 cm, Large > 40 cm i mankhöjd.
 *    OBS: FCI:s gräns skiljer sig från SHoK:s exakt vid 40 cm (SHoK Small
 *    gäller upp till 39,99 cm). Vår interna femklassindelning (XS–XL) är
 *    en agilitymodell och mappas endast approximativt — därför används
 *    Large-värden som standard nedan.
 *  - §2.2 Klasser: H1, H2, H3 (H0 får införas nationellt).
 *  - §3.1 Banan: ringen ska vara minst 800 m², kvadratisk/rektangulär,
 *    kortsidan minst 20 m (undantag kan godkännas av domaren). Första och
 *    sista hindret måste vara en hoop; minst 50 % av hindren måste vara
 *    hoops. Två hinder som inte följer på varandra ska ligga minst 2 m
 *    isär. Avstånd mellan följdhinder mäts center-till-center i rak linje:
 *      H1: 12–18 hinder, 5–8 m,  max HA→längsta hinder 12 m (S) / 15 m (L)
 *      H2: 16–22 hinder, 6–10 m, max 18 m (S) / 20 m (L)
 *      H3: 20–26 hinder, 7–12 m, max 25 m (S) / 30 m (L)
 *  - §3.2 Bankonstruktion: naturlig förarsida ska byta minst en gång i H1
 *    och minst två gånger i H2/H3 (modelleras inte automatiskt ännu).
 *  - §3.3.1/§7.2 Maxtid: 3 minuter (180 s) fast — FCI Hoopers har INGEN
 *    referenstid; resultatet avgörs av felpoäng, inte tid (§8).
 *  - §4 Hinder: hoop, barrel, gate, chute, tunnel (tunnel tillåten t.o.m.
 *    2029-12-31). Mått: hoop bredd 80–100 cm; barrel ⌀45–70 cm; gate
 *    bredd 90–130 cm.
 *  - §5 Handling area (HA): rund eller kvadratisk, 2×2 m eller ⌀2 m.
 *
 * Medvetna avvikelser från SHoK (svenska reglerna): FCI mäter hinderavstånd
 * center-till-center i rak linje (SHoK: hundens tänkta väg), FCI kräver ≥50 %
 * hoops (SHoK: hoops måste ingå, ingen kvot), FCI har fast maxtid 180 s utan
 * referenstid (SHoK: ref 45 s / max 90 s) och FCI:s H3 tillåter upp till 26
 * hinder (SHoK klass 3: max 24).
 */

import {
  SIZE_CLASSES, OBSTACLES_V2,
  type ClassTemplate,
} from "../config";
import type { RuleSet } from "./types";

/**
 * FCI:s klassmallar H1–H3. De ligger här (inte i config.ts CLASS_TEMPLATES)
 * så att de bara exponeras när användaren aktivt valt FCI-regelverket.
 * `refSpeedMs` är en planeringsuppskattning — FCI har ingen referenstid.
 */
const FCI_ALLOWED: ClassTemplate["allowedTypes"] = [
  "hoop", "tunnel", "barrel", "fence", "handler_zone", "start", "finish", "number",
];

export const FCI_HOOPERS_CLASS_TEMPLATES: ClassTemplate[] = [
  // VERIFIERAT §3.1: hinderantal per klass. Banmått 20×40 m = 800 m² (minimiyta).
  { key: "hoopers_fci_h1", sport: "hoopers", label: "FCI Hoopers 1", arenaWidthM: 20, arenaHeightM: 40, obstacleRange: [12, 18], defaultSize: "L", allowedTypes: FCI_ALLOWED, refSpeedMs: 2.0, maxTimeFactor: 2.0, description: "Hinder 5–8 m isär (center–center), max 15 m från handling area" },
  { key: "hoopers_fci_h2", sport: "hoopers", label: "FCI Hoopers 2", arenaWidthM: 20, arenaHeightM: 40, obstacleRange: [16, 22], defaultSize: "L", allowedTypes: FCI_ALLOWED, refSpeedMs: 2.2, maxTimeFactor: 2.0, description: "Hinder 6–10 m isär, max 20 m från handling area" },
  { key: "hoopers_fci_h3", sport: "hoopers", label: "FCI Hoopers 3", arenaWidthM: 20, arenaHeightM: 40, obstacleRange: [20, 26], defaultSize: "L", allowedTypes: FCI_ALLOWED, refSpeedMs: 2.4, maxTimeFactor: 2.0, description: "Hinder 7–12 m isär, max 30 m från handling area — internationell nivå" },
];

export const HOOPERS_FCI_2026: RuleSet = {
  id: "hoopers-fci-2026",
  name: "FCI Hoopers Regulations (2026)",
  authority: "Fédération Cynologique Internationale (FCI)",
  organization: "FCI",
  country: "international",
  version: "HOO-REG-en-22638 (PDF 2026-04-17)",
  // Dokumentet saknar explicit giltighetsperiod — validFrom är PDF:ens
  // skapandedatum, se kommentar överst i filen.
  validFrom: "2026-04-17",
  validTo: null,
  sourceUrl: "https://www.fci.be/en/Hoopers-6914.html",
  sourceDocuments: [
    {
      name: "Hoopers Regulations of the Fédération Cynologique Internationale",
      url: "https://www.fci.be/medias/HOO-REG-en-22638.pdf",
      notes: "Hämtad och verifierad 2026-08-31: storlekskategorier (§2.1), klasser (§2.2), ringstorlek, hoop-krav och avståndstabell (§3.1), bankonstruktion (§3.2), maxtid 180 s (§3.3.1, §7.2), hinder (§4), handling area 2×2 m / ⌀2 m (§5).",
      section: "§2.1–2.2, §3.1–3.3, §4, §5, §7.2, §8",
    },
    {
      name: "FCI Hoopers obstacle guidelines",
      url: "https://www.fci.be/medias/HOO-DIR-OBS-en-22639.pdf",
      notes: "FCI:s hinderritningar/riktlinjer — komplement till §4. Används ännu inte som datakälla för mått.",
    },
  ],
  sport: "hoopers",

  // FCI har två storlekskategorier (≤40 cm / >40 cm). Vår femklassiga
  // agilitymodell återanvänds för kompatibilitet men är endast informativ
  // för hoopers — mappningen Small/Large är approximativ (se filhuvudet).
  sizeClasses: SIZE_CLASSES,
  classTemplates: FCI_HOOPERS_CLASS_TEMPLATES,
  obstacleSpecs: OBSTACLES_V2.filter((o) => o.sport.includes("hoopers")),

  safetyRules: {
    // FCI-avstånden är klassberoende; 5,0 m är lägsta tillåtna (H1).
    minSafeM: 5.0,
    minComboMBySize: Object.fromEntries(
      SIZE_CLASSES.map((s) => [s.key, 5.0]),
    ),
    // Ej tillämpligt — hoopers har inga kontaktfältshinder. Värdet är ett
    // obrukbart arv från SafetyRules-kontraktet och ska aldrig triggas för
    // hoopers (kontrolleras bara i agility-grenen av validation.ts).
    contactAfterTunnelMinM: 3.0,
    // VERIFIERAT §3.1: "Two obstacles that are not consecutive must be
    // separated by at least 2 meters."
    hoopersMinM: 2.0,
    // VERIFIERAT §3.1 (undre gräns per klass, center-till-center):
    // H1 5 m, H2 6 m, H3 7 m.
    hoopersConsecutiveMinMByClass: {
      hoopers_fci_h1: 5.0,
      hoopers_fci_h2: 6.0,
      hoopers_fci_h3: 7.0,
    },
    // VERIFIERAT §3.1: max avstånd från HA:s sida till närmsta delen av det
    // mest avlägsna hindret — Large-värden (Small: 12/18/25 m). Planeraren
    // approximerar med avstånd från HA-markörens centrum till hindercentrum.
    hoopersMaxDistanceFromHandlerZoneMByClass: {
      hoopers_fci_h1: 15,
      hoopers_fci_h2: 20,
      hoopers_fci_h3: 30,
    },
    // VERIFIERAT §3.1: "The first and last obstacle of the course must be a hoop."
    hoopersStartEndHoopRequired: true,
    // VERIFIERAT §3.1: "At least 50% of the obstacles to be completed must
    // be hoops."
    hoopersMinHoopShare: 0.5,
    // VERIFIERAT §3.1: ringen ska vara minst 800 m², kortsidan minst 20 m.
    // Undantag kan godkännas av domaren — därför varning, inte fel.
    arenaMinAreaM2: 800,
    arenaMinShortSideM: 20,
    // FCI anger inget min-avstånd HA→hinder (bara max) — lämnas odefinierat.
  },

  timeRules: {
    // VERIFIERAT §3.3.1 + §7.2 + §8: FCI Hoopers har ingen referenstid —
    // resultatet baseras på felpoäng. Enda tidsregeln är den fasta maxtiden
    // 3 minuter. refSpeedMsByClass lämnas därför tom så att ingen "beräknad
    // referenstid" presenteras som om den vore regelbaserad.
    model: "fixed_speed",
    refSpeedMsByClass: {},
    maxTimeFactorByClass: {},
    fixedMaxCourseTimeS: 180,
  },

  verificationStatus: "partially_verified",
  verifiedAt: "2026-08-31",
  verifiedFields: [
    "safetyRules.hoopersMinM",
    "safetyRules.hoopersConsecutiveMinMByClass",
    "safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass",
    "safetyRules.hoopersStartEndHoopRequired",
    "safetyRules.hoopersMinHoopShare",
    "safetyRules.arenaMinAreaM2",
    "safetyRules.arenaMinShortSideM",
    "timeRules.fixedMaxCourseTimeS",
    "classTemplates.obstacleRange",
  ],
  provisionalFields: [
    // Large-värden används; Small-mappning (12/18/25 m) är inte implementerad.
    "safetyRules.hoopersMaxDistanceFromHandlerZoneMByClass.smallCategory",
    "safetyRules.contactAfterTunnelMinM",
    "sizeClasses",
    "obstacleSpecs.dimensions",
    "validFrom",
  ],
};
