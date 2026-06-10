/**
 * Banplaneraren v2 — Regelmotor (Prompt A).
 *
 * RuleSet är en versionerad, källhänvisad samling av allt regelinnehåll
 * som banplaneraren använder: hindermått, klasstrukturer, säkerhetsavstånd
 * och tidsmodeller. Tanken är att vi inte längre hårdkodar regler i kod,
 * utan refererar till ett RuleSet via id. När SAgiK reviderar sitt
 * regelverk (nuvarande version löper 2022–2026) lägger vi till ett nytt
 * RuleSet bredvid det gamla utan att röra koden.
 *
 * VIKTIGT: Numeriska värden i de konkreta RuleSet-implementationerna ska
 * markeras med // TODO VERIFIERA tills de bekräftats mot det officiella
 * dokumentet (se kommentar överst i skk-agility-2023.ts).
 */

import type {
  ClassTemplate, ObstacleDefV2, SizeClassDef, Sport, SizeClassKey,
} from "../config";

/** Ett enskilt källdokument som ligger till grund för regelvärdena. */
export interface SourceDocument {
  /** T.ex. "Agilityregler 2022-01-01–2026-12-31". */
  name: string;
  /** Direktlänk till PDF eller webbsida. */
  url: string;
  /** Frivillig kommentar om vad som hämtas härifrån. */
  notes?: string;
}

/** Säkerhetsregler — minimiavstånd, ansatskrav m.m. enligt "Säkra hinder". */
export interface SafetyRules {
  /** Generellt min-avstånd mellan hinder i nummerföljd (m). */
  minSafeM: number;
  /** Min-avstånd i kombination per storleksklass (m). */
  minComboMBySize: Partial<Record<SizeClassKey, number>>;
  /** Min-avstånd mellan kontaktfält efter tunnel innan det räknas som risk (m). */
  contactAfterTunnelMinM: number;
  /** Hoopers — min-avstånd mellan på varandra följande hinder (m). */
  hoopersMinM?: number;
  /** Hoopers — min-avstånd från dirigeringsområdet till närmsta hinder (m). */
  hoopersHandlerZoneMinM?: number;
}

/** Tidsmodell — hur referenstid och maxtid räknas fram. */
export interface TimeRules {
  /**
   * Modell för referenstid. "fixed_speed" = lengthM / refSpeedMs per klass.
   * I framtiden kan vi behöva "table_lookup" eller "class_specific".
   */
  model: "fixed_speed" | "class_specific";
  /** Referenshastighet per klassmall (m/s). */
  refSpeedMsByClass: Record<string, number>;
  /** Maxtid = referenstid × faktor. */
  maxTimeFactorByClass: Record<string, number>;
}

/** Ett versionerat regelverk. */
export interface RuleSet {
  /** Unikt id, t.ex. "skk-agility-2023". */
  id: string;
  /** Visningsnamn, t.ex. "SAgiK/SKK Agility 2022–2026". */
  name: string;
  /** Utgivare. */
  authority: string;
  /** ISO-datum (YYYY-MM-DD), inklusive. */
  validFrom: string;
  /** ISO-datum (YYYY-MM-DD), inklusive. null = pågående. */
  validTo: string | null;
  /** Huvudsida hos utgivaren (t.ex. agilityklubben.se/regler). */
  sourceUrl: string;
  /** Lista av faktiska dokument som värdena är hämtade ifrån. */
  sourceDocuments: SourceDocument[];
  /** Sport detta regelverk gäller för. */
  sport: Sport;
  /** Storleksklasser med hopphöjder, däckhöjder, kombinationsavstånd m.m. */
  sizeClasses: SizeClassDef[];
  /** Klassmallar (hoppklass, agilityklass, nollklass m.fl.). */
  classTemplates: ClassTemplate[];
  /** Hinderspecifikationer (typ, mått, kategori). */
  obstacleSpecs: ObstacleDefV2[];
  /** Säkerhetsregler enligt "Säkra hinder"-anvisningar. */
  safetyRules: SafetyRules;
  /** Tidsregler för referens- och maxtid. */
  timeRules: TimeRules;
}
