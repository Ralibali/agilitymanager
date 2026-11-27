/**
 * Banplaneraren — "Generera bana".
 *
 * Välj sport, regelverk, klass, antal hinder och stil. Generatorn bygger en
 * bana i bakgrunden, kör den genom planerarens regelkontroll och visar en
 * förhandsvisning innan något ändras i editorn. "Slumpa ny" ger en ny bana
 * med samma inställningar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ObstacleGlyph } from "@/components/ObstacleGlyph";
import { gridTicks } from "@/lib/courseSafety";
import type { PlacedObstacle } from "@/lib/course";
import type { ClassTemplateKey, SizeClassKey, Sport } from "@/features/course-planner-v2/config";
import { getDefaultRuleSetIdForSport, getRuleSet, getRuleSetsForSport } from "@/features/course-planner-v2/rules";
import { buildDogPath } from "@/features/course-planner-v2/dogPath";
import {
  GENERATOR_STYLES, defaultObstacleCount, defaultStyleFor,
  type GeneratedCourse, type GeneratorStyle,
} from "@/features/course-planner-v2/generator";
import { runGenerator } from "@/features/course-planner-v2/generatorClient";

export interface GenerateSettings {
  sport: Sport;
  ruleSetId: string;
  classTemplate: ClassTemplateKey;
  arenaWidthM: number;
  arenaHeightM: number;
  sizeClass: SizeClassKey;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport: Sport;
  ruleSetId?: string;
  classTemplate: ClassTemplateKey | null;
  sizeClass: SizeClassKey;
  arenaWidthM: number;
  arenaHeightM: number;
  /** Finns det en bana som ersätts? Styr knapptexten. */
  replacing: boolean;
  onApply: (course: GeneratedCourse, settings: GenerateSettings) => void;
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

const segment = (active: boolean) =>
  `h-9 rounded-full border-2 px-3 text-xs font-bold transition-colors ${
    active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white text-ink/75 hover:border-ink hover:text-ink"
  }`;

function Preview({ obstacles, w, h }: { obstacles: PlacedObstacle[]; w: number; h: number }) {
  const path = useMemo(() => buildDogPath(obstacles.filter((o) => o.number != null)), [obstacles]);
  const points = path.points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox={`-0.5 -0.5 ${w + 1} ${h + 1}`} className="h-full w-full" role="img" aria-label="Förhandsvisning av den genererade banan">
      <rect x="0" y="0" width={w} height={h} fill="#FCFAF4" stroke="#161812" strokeOpacity="0.5" strokeWidth="0.15" />
      {gridTicks(w, 5).map((x) => <line key={`x${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#161812" strokeOpacity="0.08" strokeWidth="0.06" />)}
      {gridTicks(h, 5).map((y) => <line key={`y${y}`} x1={0} y1={y} x2={w} y2={y} stroke="#161812" strokeOpacity="0.08" strokeWidth="0.06" />)}
      {points && <polyline points={points} fill="none" stroke="#FF6900" strokeWidth="0.22" strokeDasharray="0.6 0.4" strokeLinecap="round" />}
      {obstacles.map((ob) => (
        <g key={ob.id} transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rotation})`}>
          <ObstacleGlyph type={ob.type} sw={0.12} curveDeg={ob.curveDeg} curveSide={ob.curveSide} lengthM={ob.lengthM} />
        </g>
      ))}
      {obstacles.filter((o) => o.number != null).map((ob) => (
        <g key={`n${ob.id}`} transform={`translate(${ob.x + 0.95} ${ob.y - 0.95})`}>
          <circle r="0.62" fill="#161812" />
          <text y="0.24" textAnchor="middle" fontSize="0.72" fontWeight="800" fill="#F6F1E7" fontFamily="Archivo, sans-serif">{ob.number}</text>
        </g>
      ))}
    </svg>
  );
}

export function GenerateCourseDialog(props: Props) {
  const { open, onOpenChange, replacing, onApply } = props;
  const [sport, setSport] = useState<Sport>(props.sport);
  const [ruleSetId, setRuleSetId] = useState<string>(props.ruleSetId ?? getDefaultRuleSetIdForSport(props.sport));
  const ruleSet = getRuleSet(ruleSetId) ?? getRuleSet(getDefaultRuleSetIdForSport(sport));
  const templates = useMemo(() => ruleSet?.classTemplates ?? [], [ruleSet]);
  const [classKey, setClassKey] = useState<ClassTemplateKey | null>(props.classTemplate);
  const template = templates.find((t) => t.key === classKey) ?? templates[0];
  const [count, setCount] = useState<number | null>(null);
  const [style, setStyle] = useState<GeneratorStyle | null>(null);
  const [useCurrentArena, setUseCurrentArena] = useState(false);
  const [seed, setSeed] = useState(newSeed);
  /** Senaste svaret och vilken förfrågan det hör till. */
  const [answer, setAnswer] = useState<{ key: string; result: GeneratedCourse | null } | null>(null);
  const runRef = useRef(0);

  // Nytt öppnande: utgå från planerarens nuvarande inställningar.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSport(props.sport);
      const rsId = props.ruleSetId ?? getDefaultRuleSetIdForSport(props.sport);
      setRuleSetId(rsId);
      setClassKey(props.classTemplate);
      setCount(null);
      setStyle(null);
      setUseCurrentArena(false);
      setSeed(newSeed());
      setAnswer(null);
    }
  }

  const effectiveCount = template ? Math.min(Math.max(count ?? defaultObstacleCount(template), template.obstacleRange[0]), template.obstacleRange[1]) : 0;
  const effectiveStyle = style ?? (template ? defaultStyleFor(template.key) : "balanced");
  const templateArena = template ? { w: template.arenaWidthM, h: template.arenaHeightM } : { w: props.arenaWidthM, h: props.arenaHeightM };
  const currentDiffers = template && (props.arenaWidthM !== templateArena.w || props.arenaHeightM !== templateArena.h) && props.sport === sport;
  const arena = useCurrentArena && currentDiffers ? { w: props.arenaWidthM, h: props.arenaHeightM } : templateArena;
  const sizeClass: SizeClassKey = sport === "hoopers"
    ? (props.sizeClass === "XS" || props.sizeClass === "S" ? "S" : "L")
    : props.sizeClass;

  const requestKey = template && ruleSet
    ? [sport, ruleSet.id, template.key, sizeClass, arena.w, arena.h, effectiveCount, effectiveStyle, seed].join("|")
    : "";
  const busy = open && !!requestKey && answer?.key !== requestKey;
  // Visa förra förslaget (dimmat) medan nästa byggs.
  const result = answer?.result ?? null;
  const failed = !busy && !!answer && answer.key === requestKey && !answer.result;

  useEffect(() => {
    if (!open || !template || !ruleSet || !requestKey) return;
    const run = ++runRef.current;
    const timer = setTimeout(() => {
      void runGenerator({
        sport, ruleSetId: ruleSet.id, classTemplate: template.key, sizeClass,
        arenaWidthM: arena.w, arenaHeightM: arena.h, obstacleCount: effectiveCount, style: effectiveStyle, seed,
      }).then((res) => {
        if (run !== runRef.current) return;
        setAnswer({ key: requestKey, result: res });
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [open, requestKey, sport, ruleSet, template, sizeClass, arena.w, arena.h, effectiveCount, effectiveStyle, seed]);

  const switchSport = (s: Sport) => {
    if (s === sport) return;
    setSport(s);
    setRuleSetId(getDefaultRuleSetIdForSport(s));
    setClassKey(null);
    setCount(null);
    setStyle(null);
    setUseCurrentArena(false);
  };

  const pathLength = useMemo(
    () => (result ? buildDogPath(result.obstacles.filter((o) => o.number != null)).total : 0),
    [result],
  );
  const ruleSets = getRuleSetsForSport(sport);
  const clean = result && result.issues.length === 0;

  const apply = () => {
    if (!result || !template || !ruleSet) return;
    onApply(result, {
      sport, ruleSetId: ruleSet.id, classTemplate: template.key,
      arenaWidthM: arena.w, arenaHeightM: arena.h, sizeClass,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto border-2 border-ink bg-paper p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide">
            <Sparkles className="h-6 w-6 text-forest" aria-hidden /> Generera bana
          </DialogTitle>
          <DialogDescription className="text-ink/75">
            En regelriktig bana för vald klass på en sekund. Varje förslag körs genom regelkontrollen innan du ser det — bygg sedan vidare som vanligt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/75">Sport</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={segment(sport === "agility")} aria-pressed={sport === "agility"} onClick={() => switchSport("agility")}>Agility</button>
                <button type="button" className={segment(sport === "hoopers")} aria-pressed={sport === "hoopers"} onClick={() => switchSport("hoopers")}>Hoopers</button>
              </div>
            </div>

            {ruleSets.length > 1 && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/75">Regelverk</p>
                <div className="flex flex-wrap gap-1.5">
                  {ruleSets.map((rs) => (
                    <button
                      key={rs.id}
                      type="button"
                      className={segment(rs.id === ruleSet?.id)}
                      aria-pressed={rs.id === ruleSet?.id}
                      onClick={() => { setRuleSetId(rs.id); setClassKey(null); setCount(null); setStyle(null); }}
                    >
                      {rs.organization ?? rs.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink/75">Klass</span>
              <select
                value={template?.key ?? ""}
                onChange={(e) => { setClassKey(e.target.value as ClassTemplateKey); setCount(null); setStyle(null); }}
                className="h-11 w-full rounded-xl border-2 border-ink/15 bg-white px-3 text-sm font-bold outline-none focus:border-ink"
              >
                {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              {template && <span className="mt-1 block text-xs text-ink/70">{template.description}</span>}
            </label>

            {template && (
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink/75">
                  <span>Antal hinder</span>
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] text-paper tabular-nums">{effectiveCount}</span>
                </span>
                <input
                  type="range"
                  min={template.obstacleRange[0]}
                  max={template.obstacleRange[1]}
                  value={effectiveCount}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-forest"
                  aria-label="Antal hinder"
                />
                <span className="flex justify-between text-[11px] font-semibold text-ink/70">
                  <span>{template.obstacleRange[0]}</span><span>{template.obstacleRange[1]}</span>
                </span>
              </label>
            )}

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/75">Stil</p>
              <div className="grid grid-cols-3 gap-1.5">
                {GENERATOR_STYLES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStyle(s.key)}
                    aria-pressed={effectiveStyle === s.key}
                    title={s.hint}
                    className={`rounded-xl border-2 px-2 py-2 text-left transition-colors ${
                      effectiveStyle === s.key ? "border-ink bg-tang shadow-hard-sm" : "border-ink/15 bg-white hover:border-ink"
                    }`}
                  >
                    <span className="block text-xs font-black">{s.label}</span>
                    <span className="block text-[10px] font-semibold leading-tight text-ink/70">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-cream px-3 py-2 text-xs font-semibold text-ink/75">
              Banyta {arena.w} × {arena.h} m
              {currentDiffers && (
                <label className="mt-1.5 flex items-center gap-2 font-semibold text-ink">
                  <input type="checkbox" checked={useCurrentArena} onChange={(e) => setUseCurrentArena(e.target.checked)} className="h-4 w-4 accent-forest" />
                  Använd min nuvarande yta ({props.arenaWidthM} × {props.arenaHeightM} m)
                </label>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-ink/15 bg-white p-2 sm:aspect-[5/6]">
              {result && <Preview obstacles={result.obstacles} w={arena.w} h={arena.h} />}
              {busy && (
                <div className="absolute inset-0 grid place-items-center bg-paper/70 backdrop-blur-[1px]" role="status" aria-live="polite">
                  <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 py-2 text-sm font-bold shadow-hard-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-forest" /> Bygger och kontrollerar…
                  </span>
                </div>
              )}
              {failed && !busy && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <p className="text-sm font-semibold text-ink/80">
                    Hittade ingen bana som klarar alla regler med de här inställningarna. Slumpa igen, välj färre hinder eller en annan stil.
                  </p>
                </div>
              )}
            </div>

            {result && !busy && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                {clean ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-paper">
                    <ShieldCheck className="h-3.5 w-3.5" /> Regelkontroll utan anmärkningar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tang px-2.5 py-1 text-ink">
                    <AlertTriangle className="h-3.5 w-3.5" /> {result.issues.length} anmärkningar att se över
                  </span>
                )}
                <span className="rounded-full bg-cream px-2.5 py-1">{result.obstacleCount} hinder</span>
                <span className="rounded-full bg-cream px-2.5 py-1">~{pathLength.toFixed(0)} m</span>
                <span className="rounded-full bg-cream px-2.5 py-1">{result.difficultyLabel} · {result.difficultyScore}</span>
                <span className="rounded-full bg-cream px-2.5 py-1">Flow {result.flowScore}</span>
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSeed(newSeed())}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 text-sm font-bold transition-colors hover:bg-cream disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Slumpa ny
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={busy || !result}
                className="pressable shadow-hard-sm inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-ink bg-forest px-5 text-sm font-bold text-paper disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" /> {replacing ? "Ersätt min bana" : "Använd banan"}
              </button>
            </div>
            {replacing && (
              <p className="text-[11px] font-semibold text-ink/70">Banan som är öppen nu ersätts. Du kan ångra med Ctrl+Z.</p>
            )}
            <p className="text-[11px] leading-relaxed text-ink/70">
              Generatorn följer samma maskinellt kontrollerbara regler som regelkontrollen. Svårighet och flow är AgilityManagers planeringsstöd — domarens bedömning på plats gäller alltid.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
