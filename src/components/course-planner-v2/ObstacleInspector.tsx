/**
 * Banplaneraren v2 — egenskapspanel för markerade hinder.
 *
 * Ett hinder: exakt X/Y/vinkel, plats i banordningen och tunnelböjning.
 * Flera hinder: justera och fördela mittpunkter.
 *
 * Fälten ändrar banan först när värdet bekräftas (Enter eller när fältet
 * lämnas), så att varje ändring blir ETT ångra-steg.
 */
import { useState } from "react";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical,
  AlignVerticalDistributeCenter, ChevronDown, ChevronUp, Lock, Minus, Plus, SlidersHorizontal,
} from "lucide-react";
import { TUNNEL_LENGTH_MAX_M, TUNNEL_LENGTH_MIN_M, tunnelLengthM } from "@/features/course-planner-v2/obstacleSize";
import type { PlacedObstacle } from "@/lib/course";
import type { AlignMode } from "@/features/course-planner-v2/editorOps";

function parseNum(raw: string): number | null {
  const v = Number(raw.trim().replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(v) ? v : null;
}

const fmt = (v: number, decimals: number) =>
  (Math.round(v * 10 ** decimals) / 10 ** decimals).toString().replace(".", ",");

function NumField({
  label, value, decimals, suffix, onCommit, disabled, min, max, hideLabel,
}: {
  label: string;
  hideLabel?: boolean;
  value: number;
  decimals: number;
  suffix: string;
  onCommit: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  // Medan fältet redigeras visas användarens text; annars alltid aktuellt värde
  // (t.ex. efter dragning eller ångra).
  const [text, setText] = useState(fmt(value, decimals));
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : fmt(value, decimals);

  const commit = () => {
    const v = parseNum(text);
    if (v === null) {
      setText(fmt(value, decimals));
      return;
    }
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
    if (Math.abs(bounded - value) > 1e-9) onCommit(bounded);
    setText(fmt(bounded, decimals));
  };

  return (
    <label className="block min-w-0">
      <span className={hideLabel ? "sr-only" : "mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/75"}>{label}</span>
      <span className="flex h-9 items-center rounded-lg border-2 border-ink/15 bg-white pr-1.5 focus-within:border-ink">
        <input
          inputMode="decimal"
          value={shown}
          disabled={disabled}
          aria-label={`${label} (${suffix})`}
          onFocus={(e) => { setText(fmt(value, decimals)); setEditing(true); e.target.select(); }}
          onBlur={() => { setEditing(false); commit(); }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Escape") { setText(fmt(value, decimals)); (e.target as HTMLInputElement).blur(); }
          }}
          className="h-full w-full min-w-0 bg-transparent px-2 text-sm font-bold tabular-nums outline-none disabled:opacity-40"
        />
        <span className="shrink-0 text-[11px] font-bold text-ink/75">{suffix}</span>
      </span>
    </label>
  );
}

const ALIGN_BUTTONS: Array<{ mode: AlignMode; label: string; Icon: typeof AlignStartVertical }> = [
  { mode: "left", label: "Justera vänster", Icon: AlignStartVertical },
  { mode: "hcenter", label: "Centrera vågrätt", Icon: AlignCenterVertical },
  { mode: "right", label: "Justera höger", Icon: AlignEndVertical },
  { mode: "top", label: "Justera överkant", Icon: AlignStartHorizontal },
  { mode: "vcenter", label: "Centrera lodrätt", Icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Justera nederkant", Icon: AlignEndHorizontal },
];

const iconBtn =
  "grid h-9 place-items-center rounded-lg border-2 border-ink/15 bg-white text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30";

export interface ObstacleInspectorProps {
  className?: string;
  /** Hopfälld = bara rubrikraden visas (standard i mobilen). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ett markerat hinder. */
  obstacle?: PlacedObstacle | null;
  obstacleLabel?: string;
  number?: number | null;
  competingCount: number;
  arena: { width: number; height: number };
  onPosition: (pos: { x?: number; y?: number }) => void;
  onRotation: (deg: number) => void;
  onNumber: (n: number) => void;
  onTunnelCurve: (patch: Partial<{ curveDeg: number; curveSide: "left" | "right"; lengthM: number }>) => void;
  /** Flera markerade hinder. */
  multiCount: number;
  multiLockedCount: number;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: "x" | "y") => void;
}

export function ObstacleInspector(props: ObstacleInspectorProps) {
  const {
    className = "", open, onOpenChange, obstacle, obstacleLabel, number, competingCount, arena,
    onPosition, onRotation, onNumber, onTunnelCurve, multiCount, multiLockedCount, onAlign, onDistribute,
  } = props;
  const multi = multiCount > 1;
  const locked = !!obstacle?.locked;
  const movable = multiCount - multiLockedCount;

  // Tunnelböjningen är det man oftast justerar — den visas även när panelen
  // är hopfälld (standard i mobilen).
  const tunnelLength = obstacle && obstacle.type === "tunnel" ? tunnelLengthM(obstacle) : 0;
  // Längden visas i utfällt läge; hopfällt (standard i mobilen) hålls panelen
  // låg så att den inte täcker planen.
  const tunnelControls = obstacle && obstacle.type === "tunnel" ? (
    <div>
      {open && (
        <>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink/75">
            Tunnellängd · {tunnelLength.toFixed(1).replace(".", ",")} m
          </p>
          <input
            type="range"
            min={TUNNEL_LENGTH_MIN_M}
            max={TUNNEL_LENGTH_MAX_M}
            step={0.5}
            value={Math.round(tunnelLength * 2) / 2}
            disabled={locked}
            aria-label="Tunnelns längd i meter"
            onChange={(e) => onTunnelCurve({ lengthM: Number(e.target.value) })}
            className="mb-2 w-full accent-forest"
          />
        </>
      )}
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink/75">
        Tunnelböjning · {obstacle.curveDeg ?? 0}°
      </p>
      <input
        type="range"
        min={0}
        max={180}
        step={5}
        value={obstacle.curveDeg ?? 0}
        disabled={locked}
        aria-label="Tunnelböjning i grader"
        onChange={(e) => onTunnelCurve({ curveDeg: Number(e.target.value) })}
        className="w-full accent-forest"
      />
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            type="button"
            disabled={locked}
            onClick={() => onTunnelCurve({ curveSide: side })}
            aria-pressed={(obstacle.curveSide ?? "right") === side}
            className={`h-8 rounded-lg border-2 text-xs font-bold disabled:opacity-40 ${
              (obstacle.curveSide ?? "right") === side
                ? "border-ink bg-forest text-paper"
                : "border-ink/15 bg-white text-ink/75"
            }`}
          >
            {side === "left" ? "Böj vänster" : "Böj höger"}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <section
      aria-label="Egenskaper för markerade hinder"
      data-ui
      className={`rounded-2xl border-2 border-ink bg-paper shadow-hard ${open ? "p-3" : "px-3 py-1.5"} ${className}`}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={open ? "Dölj egenskaper" : "Visa egenskaper"}
        className={`flex w-full items-center justify-between gap-2 text-left ${open ? "mb-2.5" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/75">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {multi
              ? `${multiCount} hinder markerade`
              : `${number != null ? `#${number} ` : ""}${obstacleLabel ?? "Hinder"}`}
          </span>
          {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-ember" aria-label="Låst" />}
          {!open && (
            <span className="shrink-0 font-semibold normal-case tracking-normal text-ink/75">
              · {multi ? "justera" : "mått & ordning"}
            </span>
          )}
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink/15" aria-hidden>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {open && !multi && obstacle && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            <NumField label="X" suffix="m" decimals={2} value={obstacle.x} disabled={locked}
              min={0.5} max={arena.width - 0.5} onCommit={(x) => onPosition({ x })} />
            <NumField label="Y" suffix="m" decimals={2} value={obstacle.y} disabled={locked}
              min={0.5} max={arena.height - 0.5} onCommit={(y) => onPosition({ y })} />
            <NumField label="Vinkel" suffix="°" decimals={0} value={((obstacle.rotation % 360) + 360) % 360} disabled={locked}
              onCommit={onRotation} />
          </div>

          {number != null && (
    <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink/75">
                Plats i banordningen
              </span>
              <div className="flex items-center gap-1.5">
                <button type="button" className={`${iconBtn} w-9`} disabled={number <= 1}
                  onClick={() => onNumber(number - 1)} aria-label="Tidigare i banordningen">
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-16">
                  <NumField label="Nummer" hideLabel suffix="#" decimals={0} value={number} min={1} max={competingCount}
                    onCommit={(n) => onNumber(Math.round(n))} />
                </div>
                <button type="button" className={`${iconBtn} w-9`} disabled={number >= competingCount}
                  onClick={() => onNumber(number + 1)} aria-label="Senare i banordningen">
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-ink/75">av {competingCount}</span>
              </div>
            </div>
          )}

          {obstacle.type === "tunnel" && tunnelControls}

          {locked && (
            <p className="rounded-lg bg-cream px-2.5 py-1.5 text-xs font-semibold text-ink/75">
              Hindret är låst. Lås upp (L) för att flytta eller vrida det.
            </p>
          )}
        </div>
      )}

      {!open && !multi && tunnelControls && <div className="mb-1.5 mt-2">{tunnelControls}</div>}

      {open && multi && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink/75">Justera mittpunkter</p>
            <div className="grid grid-cols-6 gap-1">
              {ALIGN_BUTTONS.map(({ mode, label, Icon }) => (
                <button key={mode} type="button" className={iconBtn} disabled={movable < 2}
                  onClick={() => onAlign(mode)} title={label} aria-label={label}>
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink/75">Fördela jämnt</p>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" className={`${iconBtn} gap-1.5 px-2 text-xs font-bold`} disabled={movable < 3}
                onClick={() => onDistribute("x")} aria-label="Fördela vågrätt">
                <span className="flex items-center gap-1.5"><AlignHorizontalDistributeCenter className="h-4 w-4" /> Vågrätt</span>
              </button>
              <button type="button" className={`${iconBtn} gap-1.5 px-2 text-xs font-bold`} disabled={movable < 3}
                onClick={() => onDistribute("y")} aria-label="Fördela lodrätt">
                <span className="flex items-center gap-1.5"><AlignVerticalDistributeCenter className="h-4 w-4" /> Lodrätt</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] font-semibold leading-snug text-ink/75">
            Dra ett markerat hinder för att flytta hela gruppen. Piltangenter flyttar 0,25 m (Shift = 1 m).
            {multiLockedCount > 0 && ` ${multiLockedCount} låsta hinder ligger still.`}
          </p>
        </div>
      )}
    </section>
  );
}
