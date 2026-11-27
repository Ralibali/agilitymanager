/**
 * Förarplanen i SVG: förarlinje med riktningspilar, markeringar
 * (förarposition, framför-/bakom-/blindbyte, belöning, anteckning) och
 * punkterna där föraren korsar hundens linje.
 *
 * Ritas i banans meterkoordinater inuti planerarens <svg>. Inget här är
 * markerat `data-ui`, så förarplanen följer med i PNG-exporten — utom
 * markeringsringen runt vald markering.
 */
import type React from "react";
import {
  getCueDef, smoothStrokePoints, strokeToSvgD, wrapNoteText,
  type CourseCue, type CourseMarkup, type CueKind, type Vec2,
} from "@/features/course-planner-v2/courseExtras";

export const HANDLER_COLOR = "#1D4ED8";
const CROSSING_COLOR = "#BE123C";

/** Små pilar längs linjen som visar förarens riktning. */
function chevronsAlong(points: Vec2[], everyM: number): Array<{ x: number; y: number; angle: number }> {
  const out: Array<{ x: number; y: number; angle: number }> = [];
  let acc = 0;
  let next = everyM * 0.6;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (seg > 0 && acc + seg >= next) {
      const t = (next - acc) / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
      next += everyM;
    }
    acc += seg;
  }
  return out;
}

export function CueGlyph({ kind, text, detail }: { kind: CueKind; text?: string; detail: number }) {
  const r = 0.62 * detail;
  const def = getCueDef(kind);
  const label = (fs: number, fill: string) => (
    <text y={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight="900" fill={fill} fontFamily="Archivo, sans-serif">
      {def.short}
    </text>
  );
  switch (kind) {
    case "handler":
      return (
        <g>
          <circle r={r} fill={HANDLER_COLOR} stroke="#F6F1E7" strokeWidth={0.09 * detail} />
          <circle cy={-0.2 * detail} r={0.16 * detail} fill="#F6F1E7" />
          <path d={`M ${-0.3 * detail} ${0.36 * detail} Q 0 ${-0.06 * detail} ${0.3 * detail} ${0.36 * detail}`} fill="#F6F1E7" />
        </g>
      );
    case "front_cross":
      return (
        <g>
          <circle r={r} fill={HANDLER_COLOR} stroke="#F6F1E7" strokeWidth={0.09 * detail} />
          {label(0.5 * detail, "#F6F1E7")}
        </g>
      );
    case "rear_cross":
      return (
        <g>
          <circle r={r} fill="#FFFFFF" stroke={HANDLER_COLOR} strokeWidth={0.12 * detail} />
          {label(0.5 * detail, HANDLER_COLOR)}
        </g>
      );
    case "blind_cross":
      return (
        <g>
          <circle r={r} fill="#0F172A" stroke={HANDLER_COLOR} strokeWidth={0.12 * detail} strokeDasharray={`${0.16 * detail} ${0.1 * detail}`} />
          {label(0.5 * detail, "#F6F1E7")}
        </g>
      );
    case "reward": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const rad = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r * 1.05 : r * 0.45;
        return `${Math.cos(rad) * rr},${Math.sin(rad) * rr}`;
      }).join(" ");
      return <polygon points={pts} fill="#F5B301" stroke="#161812" strokeWidth={0.07 * detail} strokeLinejoin="round" />;
    }
    case "note": {
      const lines = wrapNoteText(text ?? "", 22, 4);
      const fs = 0.46 * detail;
      const width = Math.max(2.2 * detail, Math.max(...lines.map((l) => l.length), 4) * fs * 0.56 + 0.6 * detail);
      const height = lines.length * fs * 1.25 + 0.45 * detail;
      return (
        <g>
          <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={0.18 * detail} fill="#FFF3B0" stroke="#161812" strokeOpacity="0.55" strokeWidth={0.05 * detail} />
          {lines.map((line, i) => (
            <text
              key={i}
              x={-width / 2 + 0.3 * detail}
              y={-height / 2 + 0.22 * detail + fs * (i + 0.95) * 1.25 - fs * 0.25}
              fontSize={fs}
              fontWeight="700"
              fill="#161812"
              fontFamily="Archivo, sans-serif"
            >
              {line}
            </text>
          ))}
        </g>
      );
    }
  }
}

export interface MarkupLayerProps {
  markup: CourseMarkup | undefined;
  detail: number;
  /** Punkter där förarlinjen korsar hundens linje. */
  crossings: Vec2[];
  selectedCueId: string | null;
  /** Markeringar kan väljas och dras (förarplanslagret är aktivt). */
  interactive: boolean;
  onCuePointerDown?: (e: React.PointerEvent, cue: CourseCue) => void;
  onCueDoubleClick?: (cue: CourseCue) => void;
  /** Tonas ned när förarplanen inte redigeras. */
  dimmed?: boolean;
}

export function MarkupStrokes({ markup, detail, dimmed }: Pick<MarkupLayerProps, "markup" | "detail" | "dimmed">) {
  if (!markup || markup.strokes.length === 0) return null;
  const sw = 0.17 * detail;
  return (
    <g pointerEvents="none" opacity={dimmed ? 0.55 : 0.95} data-markup-strokes>
      {markup.strokes.map((s) => {
        const smooth = smoothStrokePoints(s.points);
        const chevrons = chevronsAlong(smooth, 3.2);
        const start = s.points[0];
        return (
          <g key={s.id} data-handler-stroke={s.id}>
            <path d={strokeToSvgD(s.points)} fill="none" stroke="#F6F1E7" strokeWidth={sw * 2.2} strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            <path d={strokeToSvgD(s.points)} fill="none" stroke={HANDLER_COLOR} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={start.x} cy={start.y} r={sw * 1.6} fill={HANDLER_COLOR} />
            {chevrons.map((c, i) => (
              <path
                key={i}
                transform={`translate(${c.x} ${c.y}) rotate(${c.angle})`}
                d={`M ${-0.28 * detail} ${-0.26 * detail} L ${0.12 * detail} 0 L ${-0.28 * detail} ${0.26 * detail}`}
                fill="none"
                stroke={HANDLER_COLOR}
                strokeWidth={sw * 0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

export function MarkupCues({
  markup, detail, crossings, selectedCueId, interactive, onCuePointerDown, onCueDoubleClick, dimmed,
}: MarkupLayerProps) {
  return (
    <g opacity={dimmed ? 0.7 : 1} data-markup-cues>
      {crossings.map((p, i) => (
        <g key={`x${i}`} transform={`translate(${p.x} ${p.y})`} pointerEvents="none" data-crossing>
          <title>Föraren korsar hundens linje här</title>
          <circle r={0.36 * detail} fill="#FFFFFF" stroke={CROSSING_COLOR} strokeWidth={0.09 * detail} />
          <path d={`M ${-0.17 * detail} ${-0.17 * detail} L ${0.17 * detail} ${0.17 * detail} M ${0.17 * detail} ${-0.17 * detail} L ${-0.17 * detail} ${0.17 * detail}`} stroke={CROSSING_COLOR} strokeWidth={0.09 * detail} strokeLinecap="round" />
        </g>
      ))}
      {(markup?.cues ?? []).map((cue) => {
        const def = getCueDef(cue.kind);
        const selected = cue.id === selectedCueId;
        return (
          <g
            key={cue.id}
            transform={`translate(${cue.x} ${cue.y})`}
            data-cue={cue.kind}
            data-cue-id={cue.id}
            pointerEvents={interactive ? undefined : "none"}
            className={interactive ? "cursor-grab active:cursor-grabbing" : undefined}
            onPointerDown={interactive && onCuePointerDown ? (e) => onCuePointerDown(e, cue) : undefined}
            onDoubleClick={interactive && onCueDoubleClick ? () => onCueDoubleClick(cue) : undefined}
          >
            <title>{cue.kind === "note" ? cue.text : `${def.label} — ${def.description}`}</title>
            {interactive && <circle r={0.95 * detail} fill="transparent" />}
            {selected && (
              <circle r={0.95 * detail} fill="none" stroke="#E24C00" strokeWidth={0.08 * detail} strokeDasharray={`${0.2 * detail} ${0.14 * detail}`} data-ui />
            )}
            <CueGlyph kind={cue.kind} text={cue.text} detail={detail} />
          </g>
        );
      })}
    </g>
  );
}
