/**
 * Banplanerarens baninställningar: sport, regelverk, klassmall, storleksklass,
 * banmått och vad som visas på planen.
 *
 * Samma komponent används i sidopanelen (dator) och i inställningsbladet
 * (surfplatta/mobil), så att alla inställningar finns på alla skärmstorlekar.
 */
import { useEffect, useId, useState } from "react";
import {
  ARENA_PRESETS, SIZE_CLASSES,
  type ClassTemplate, type ClassTemplateKey, type SizeClassKey, type Sport,
} from "@/features/course-planner-v2/config";
import { getRuleSetsForSport, type RuleSet } from "@/features/course-planner-v2/rules";
import { ARENA_MAX_M, ARENA_MIN_M } from "@/lib/courseSafety";

/** Hoopers har två storlekskategorier (SHoK: < 40 / ≥ 40 cm, FCI: ≤ 40 / > 40 cm). */
const HOOPERS_SIZES: Array<{ key: SizeClassKey; label: string; hint: string }> = [
  { key: "S", label: "Small", hint: "upp till 40 cm" },
  { key: "L", label: "Large", hint: "över 40 cm" },
];

const AGILITY_SIZE_HINT: Record<SizeClassKey, string> = {
  XS: "under 28 cm",
  S: "28–35 cm",
  M: "35–43 cm",
  L: "43–50 cm",
  XL: "från 43 cm",
};

export interface PlannerViewToggles {
  showLine: boolean;
  showNumbers: boolean;
  showGrid: boolean;
  showRulers: boolean;
  showDistances: boolean;
}

interface Props {
  sport: Sport;
  ruleSet: RuleSet | undefined;
  classTemplate: ClassTemplateKey | null;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  onSport: (sport: Sport) => void;
  onRuleSet: (ruleSetId: string) => void;
  onClassTemplate: (key: ClassTemplateKey | null) => void;
  onSizeClass: (size: SizeClassKey) => void;
  onArena: (width: number, height: number) => void;
  /** Visningsval — visas bara när de skickas med (bladet i mobil/surfplatta). */
  view?: PlannerViewToggles;
  onToggleView?: (key: keyof PlannerViewToggles) => void;
}

const sectionLabel = "mb-2 text-xs font-bold uppercase tracking-wider text-ink/75";

export function PlannerSettings({
  sport, ruleSet, classTemplate, sizeClass, arenaWidthM, arenaHeightM,
  onSport, onRuleSet, onClassTemplate, onSizeClass, onArena, view, onToggleView,
}: Props) {
  // Komponenten renderas både i sidopanelen och i bladet — unika id:n krävs
  // för att etiketterna ska peka på rätt fält.
  const uid = useId();
  const classId = `${uid}-class`;
  const widthId = `${uid}-w`;
  const heightId = `${uid}-h`;
  const ruleSets = getRuleSetsForSport(sport);
  const templates: ClassTemplate[] = ruleSet?.classTemplates ?? [];
  const template = templates.find((t) => t.key === classTemplate);
  const presets = ARENA_PRESETS.filter((p) => p.sport.includes(sport));
  const sizes = sport === "hoopers"
    ? HOOPERS_SIZES
    : SIZE_CLASSES.map((s) => ({ key: s.key, label: s.label, hint: AGILITY_SIZE_HINT[s.key] }));

  // Egna mått: skrivs in fritt och verkställs vid blur/Enter.
  const [customW, setCustomW] = useState(String(arenaWidthM));
  const [customH, setCustomH] = useState(String(arenaHeightM));
  useEffect(() => { setCustomW(String(arenaWidthM)); }, [arenaWidthM]);
  useEffect(() => { setCustomH(String(arenaHeightM)); }, [arenaHeightM]);
  const commitCustom = () => {
    const nw = Math.round(Number(customW.replace(",", ".")));
    const nh = Math.round(Number(customH.replace(",", ".")));
    if (!Number.isFinite(nw) || !Number.isFinite(nh)) return;
    const cw = Math.min(ARENA_MAX_M, Math.max(ARENA_MIN_M, nw));
    const ch = Math.min(ARENA_MAX_M, Math.max(ARENA_MIN_M, nh));
    if (cw !== arenaWidthM || ch !== arenaHeightM) onArena(cw, ch);
    else {
      setCustomW(String(arenaWidthM));
      setCustomH(String(arenaHeightM));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Sport */}
      <div>
        <p className={sectionLabel}>Sport</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sport">
          {(["agility", "hoopers"] as Sport[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSport(s)}
              aria-pressed={sport === s}
              className={`h-11 rounded-xl border-2 text-sm font-bold transition-all ${
                sport === s ? "border-ink bg-forest text-paper shadow-hard-sm" : "border-ink/15 bg-white text-ink/75 hover:border-ink"
              }`}
            >
              {s === "agility" ? "Agility" : "Hoopers"}
            </button>
          ))}
        </div>
      </div>

      {/* Regelverk */}
      <div>
        <p className={sectionLabel}>Regelverk</p>
        {ruleSets.length > 1 ? (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Regelverk">
            {ruleSets.map((rs) => (
              <button
                key={rs.id}
                type="button"
                onClick={() => onRuleSet(rs.id)}
                aria-pressed={ruleSet?.id === rs.id}
                title={rs.name}
                className={`min-h-11 rounded-xl border-2 px-2 py-1.5 text-xs font-bold leading-tight transition-all ${
                  ruleSet?.id === rs.id ? "border-ink bg-tang text-ink shadow-hard-sm" : "border-ink/15 bg-white text-ink/75 hover:border-ink"
                }`}
              >
                {rs.organization ?? rs.name}
                <span className="block text-[10px] font-semibold text-ink/75">
                  {rs.country === "SE" ? "Svenska regler" : "Internationellt"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink/70">
            {ruleSet?.name ?? "—"}
          </p>
        )}
      </div>

      {/* Klassmall */}
      <div>
        <label htmlFor={classId} className={`block ${sectionLabel}`}>Klassmall</label>
        <select
          id={classId}
          value={classTemplate ?? ""}
          onChange={(e) => onClassTemplate((e.target.value || null) as ClassTemplateKey | null)}
          className="h-11 w-full rounded-xl border-2 border-ink/15 bg-white px-3 text-sm font-semibold outline-none focus:border-ink"
        >
          <option value="">Fri planering (träning)</option>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs leading-relaxed text-ink/75">
          {template
            ? template.description
            : "Välj en klass för att kontrollera banan mot tävlingsreglerna för den klassen."}
        </p>
      </div>

      {/* Storleksklass */}
      <div>
        <p className={sectionLabel}>{sport === "hoopers" ? "Storlekskategori" : "Storleksklass"}</p>
        <div className="flex gap-1.5" role="group" aria-label={sport === "hoopers" ? "Storlekskategori" : "Storleksklass"}>
          {sizes.map((sc) => (
            <button
              key={sc.key}
              type="button"
              onClick={() => onSizeClass(sc.key)}
              aria-pressed={sizeClass === sc.key}
              title={`${sc.label}: mankhöjd ${sc.hint}`}
              className={`h-9 flex-1 rounded-lg border-2 text-xs font-bold transition-all ${
                sizeClass === sc.key ? "border-ink bg-tang text-ink shadow-hard-sm" : "border-ink/15 bg-white text-ink/75 hover:border-ink"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Banstorlek */}
      <div>
        <p className={sectionLabel}>Banstorlek</p>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onArena(p.width, p.height)}
              aria-pressed={arenaWidthM === p.width && arenaHeightM === p.height}
              className={`h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                arenaWidthM === p.width && arenaHeightM === p.height ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white text-ink/75 hover:border-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink/75">
          <label className="sr-only" htmlFor={widthId}>Bredd i meter</label>
          <input
            id={widthId}
            inputMode="numeric"
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => { if (e.key === "Enter") commitCustom(); }}
            className="h-9 w-16 rounded-lg border-2 border-ink/15 bg-white px-2 text-center font-bold text-ink outline-none focus:border-ink"
          />
          <span aria-hidden>×</span>
          <label className="sr-only" htmlFor={heightId}>Längd i meter</label>
          <input
            id={heightId}
            inputMode="numeric"
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => { if (e.key === "Enter") commitCustom(); }}
            className="h-9 w-16 rounded-lg border-2 border-ink/15 bg-white px-2 text-center font-bold text-ink outline-none focus:border-ink"
          />
          <span>m · egna mått</span>
        </div>
      </div>

      {view && onToggleView && (
        <div>
          <p className={sectionLabel}>Visa på planen</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              ["showLine", "Hundens linje"],
              ["showNumbers", "Nummer"],
              ["showDistances", "Avstånd"],
              ["showGrid", "Rutnät"],
              ["showRulers", "Linjaler"],
            ] as Array<[keyof PlannerViewToggles, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onToggleView(key)}
                aria-pressed={view[key]}
                className={`h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                  view[key] ? "border-ink bg-tang text-ink" : "border-ink/15 bg-white text-ink/75 hover:border-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
