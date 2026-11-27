/**
 * Banplanerarens lager: Hinder, Förarplan och Övningar.
 *
 *  - `LayerTabs` växlar lager (sidopanel på dator, docka i mobilen).
 *  - `HandlerPlanPanel` — verktyg för förarlinje, sudd och markeringar plus
 *    förarplanens statistik (förarens väg, korsningar, antal byten).
 *  - `ExercisesPanel` — övningar på samma uppställning.
 */
import { useState } from "react";
import {
  Copy, Eraser, Eye, EyeOff, ListOrdered, PenLine, Plus, Route, Trash2,
} from "lucide-react";
import type { CourseExercise, MarkupStats } from "@/features/course-planner-v2/courseExtras";
import { CueGlyph } from "./MarkupLayer";
import {
  HANDLER_TOOLS, LAYERS, isToolActive, type HandlerToolKey, type MarkupTool, type PlannerLayer,
} from "./layerTools";

export function LayerTabs({
  layer, onChange, compact, badges,
}: {
  layer: PlannerLayer;
  onChange: (layer: PlannerLayer) => void;
  compact?: boolean;
  /** Litet tal per lager (t.ex. antal övningar). */
  badges?: Partial<Record<PlannerLayer, number>>;
}) {
  return (
    <div
      role="group"
      aria-label="Lager"
      className={`grid shrink-0 grid-cols-3 gap-1 rounded-2xl border-2 border-ink/15 bg-white p-1 ${compact ? "" : "shadow-hard-sm"}`}
    >
      {LAYERS.map(({ key, label, short, Icon, hint }) => {
        const active = layer === key;
        const badge = badges?.[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            title={hint}
            className={`relative flex items-center justify-center rounded-xl font-bold transition-colors ${
              compact ? "h-9 flex-row gap-1.5 px-1 text-[11px]" : "h-14 flex-col gap-0.5 px-1 text-[11px]"
            } ${active ? "bg-ink text-paper" : "text-ink/75 hover:bg-cream hover:text-ink"}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="max-w-full truncate">{compact ? short : label}</span>
            {badge ? (
              <span
                className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] ${compact ? "" : "absolute right-1.5 top-1.5"} ${active ? "bg-tang text-ink" : "bg-ink/10"}`}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const toolBtn = (active: boolean) =>
  `flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-center transition-all ${
    active ? "border-ink bg-tang shadow-hard-sm" : "border-ink/10 bg-white hover:border-ink"
  }`;

export function HandlerToolIcon({ toolKey, className = "h-8 w-8" }: { toolKey: HandlerToolKey; className?: string }) {
  if (toolKey === "pen") return <PenLine className={`${className} p-1 text-[#1D4ED8]`} aria-hidden />;
  if (toolKey === "eraser") return <Eraser className={`${className} p-1 text-ink/70`} aria-hidden />;
  return (
    <svg viewBox="-1.1 -1.1 2.2 2.2" className={className} aria-hidden>
      <CueGlyph kind={toolKey} text="Text" detail={toolKey === "note" ? 0.75 : 1.3} />
    </svg>
  );
}

export function HandlerPlanPanel({
  tool, onTool, visible, onToggleVisible, stats, dogLengthM, contextLabel, onClear, canClear,
}: {
  tool: MarkupTool;
  onTool: (tool: MarkupTool) => void;
  visible: boolean;
  onToggleVisible: () => void;
  stats: MarkupStats;
  dogLengthM: number;
  /** "Huvudbanan" eller övningens namn — förarplanen hör till aktiv sekvens. */
  contextLabel: string;
  onClear: () => void;
  canClear: boolean;
}) {
  return (
    <div className="flex-1 space-y-4" data-panel="handler">
      <div className="rounded-xl bg-cream px-3 py-2 text-xs font-semibold leading-relaxed text-ink/75">
        Förarplan för <span className="font-black text-ink">{contextLabel}</span>. Rita förarens väg och markera byten — korsningar med hundens linje visas automatiskt.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {HANDLER_TOOLS.map((t) => {
          const active = isToolActive(tool, t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onTool(active ? null : t.tool)}
              aria-pressed={active}
              title={t.description}
              aria-label={`${t.label} — ${t.description}`}
              className={toolBtn(active)}
            >
              <HandlerToolIcon toolKey={t.key} />
              <span className="text-[11px] font-bold leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center" aria-label="Förarplanens statistik">
        <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-ink/10">
          <div className="text-[9px] font-black uppercase tracking-wider text-ink/70">Förarens väg</div>
          <div className="text-sm font-black tabular-nums">{stats.handlerLengthM > 0 ? `${stats.handlerLengthM.toFixed(0)} m` : "–"}</div>
          {dogLengthM > 0 && <div className="text-[9px] font-semibold text-ink/70">hunden {dogLengthM.toFixed(0)} m</div>}
        </div>
        <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-ink/10">
          <div className="text-[9px] font-black uppercase tracking-wider text-ink/70">Korsar hunden</div>
          <div className="text-sm font-black tabular-nums" data-crossing-count={stats.crossings.length}>{stats.crossings.length}</div>
        </div>
        <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-ink/10">
          <div className="text-[9px] font-black uppercase tracking-wider text-ink/70">Byten</div>
          <div className="text-sm font-black tabular-nums">{stats.crossCues}</div>
        </div>
      </div>
      {stats.crossings.length > 0 && stats.crossCues === 0 && (
        <p className="rounded-xl border-2 border-tang bg-tang/10 px-3 py-2 text-xs font-semibold leading-relaxed text-ink/80">
          Förarlinjen korsar hundens linje {stats.crossings.length === 1 ? "en gång" : `${stats.crossings.length} gånger`} men inget byte är markerat. Var byter du sida?
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleVisible}
          aria-pressed={visible}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-ink/15 bg-white px-3 text-xs font-bold transition-colors hover:border-ink"
        >
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {visible ? "Förarplan visas" : "Förarplan dold"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-ink/15 bg-white px-3 text-xs font-bold transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Rensa förarplanen
        </button>
      </div>
    </div>
  );
}

function ExerciseNameInput({ exercise, onRename }: { exercise: CourseExercise; onRename: (name: string) => void }) {
  const [text, setText] = useState(exercise.name);
  const [editing, setEditing] = useState(false);
  return (
    <input
      value={editing ? text : exercise.name}
      onFocus={(e) => { setText(exercise.name); setEditing(true); e.target.select(); }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setEditing(false); if (text.trim() && text.trim() !== exercise.name) onRename(text); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setText(exercise.name); (e.target as HTMLInputElement).blur(); }
      }}
      aria-label={`Namn på ${exercise.name}`}
      maxLength={60}
      className="h-8 w-full min-w-0 rounded-lg border-2 border-transparent bg-transparent px-1.5 text-sm font-black outline-none hover:border-ink/15 focus:border-ink focus:bg-white"
    />
  );
}

export interface ExerciseRowInfo {
  steps: number;
  lengthM: number;
}

export function ExercisesPanel({
  exercises, activeId, editing, mainInfo, info, onSelect, onAdd, onRename, onDuplicate, onDelete, onEdit, maxReached,
}: {
  exercises: CourseExercise[];
  activeId: string | null;
  editing: boolean;
  mainInfo: ExerciseRowInfo;
  info: Map<string, ExerciseRowInfo>;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  maxReached: boolean;
}) {
  const row = (active: boolean) =>
    `rounded-2xl border-2 p-2 transition-colors ${active ? "border-ink bg-tang/20 shadow-hard-sm" : "border-ink/10 bg-white"}`;
  return (
    <div className="flex-1 space-y-3" data-panel="exercises">
      <div className="rounded-xl bg-cream px-3 py-2 text-xs font-semibold leading-relaxed text-ink/75">
        Bygg flera övningar på samma uppställning — tre nivåer av samma tema utan att flytta ett enda hinder. Ett hinder får tas flera gånger.
      </div>

      <button type="button" onClick={() => onSelect(null)} className={`${row(activeId === null)} block w-full text-left`} aria-pressed={activeId === null}>
        <span className="block text-sm font-black">Huvudbanan</span>
        <span className="block text-[11px] font-semibold text-ink/70">{mainInfo.steps} hinder · ~{mainInfo.lengthM.toFixed(0)} m</span>
      </button>

      <ul className="space-y-2">
        {exercises.map((ex) => {
          const active = ex.id === activeId;
          const i = info.get(ex.id) ?? { steps: 0, lengthM: 0 };
          return (
            <li key={ex.id} className={row(active)} data-exercise={ex.name}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(ex.id)}
                  aria-pressed={active}
                  aria-label={`Visa ${ex.name}`}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[11px] font-black ${active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper"}`}
                >
                  <Route className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <ExerciseNameInput exercise={ex} onRename={(name) => onRename(ex.id, name)} />
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 pl-9">
                <span className="text-[11px] font-semibold text-ink/70">
                  {i.steps === 0 ? "Inga steg ännu" : `${i.steps} steg · ~${i.lengthM.toFixed(0)} m`}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(ex.id)}
                    className={`grid h-8 w-8 place-items-center rounded-lg border-2 ${active && editing ? "border-ink bg-tang" : "border-ink/15 bg-white hover:border-ink"}`}
                    aria-label={`Bygg sekvensen för ${ex.name}`}
                    title="Bygg sekvensen — tryck hindren i ordning"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(ex.id)}
                    disabled={maxReached}
                    className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink/15 bg-white hover:border-ink disabled:opacity-30"
                    aria-label={`Duplicera ${ex.name}`}
                    title="Duplicera övningen"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(ex.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink/15 bg-white hover:border-ember hover:text-ember"
                    aria-label={`Ta bort ${ex.name}`}
                    title="Ta bort övningen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        disabled={maxReached}
        className="pressable shadow-hard-sm inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-forest text-sm font-bold text-paper disabled:opacity-40"
      >
        <Plus className="h-4 w-4" /> Ny övning
      </button>
      {maxReached && <p className="text-[11px] font-semibold text-ink/70">Max 12 övningar per bana.</p>}
    </div>
  );
}
