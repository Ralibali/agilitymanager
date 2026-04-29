import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dekorativ "course path" — en streckad linje (agility-bana) med ändpunkts-prickar.
 * Tänkt att absolutpositioneras bakom innehåll. Påverkar inte layout (pointer-events: none).
 *
 * variant:
 *   - 'arc'    mjuk båge
 *   - 'zigzag' agility-zigzag
 *   - 'weave'  S-formad slalom
 *
 * accent:
 *   - 'lime'  båda ändpunkter i lime
 *   - 'coral' båda ändpunkter i coral
 *   - 'both'  start = lime, slut = coral (default)
 */
export type CoursePathVariant = "arc" | "zigzag" | "weave";
export type CoursePathAccent = "lime" | "coral" | "both";

export interface CoursePathProps extends React.SVGAttributes<SVGSVGElement> {
  variant: CoursePathVariant;
  accent?: CoursePathAccent;
  className?: string;
}

const PATHS: Record<CoursePathVariant, { d: string; start: [number, number]; end: [number, number] }> = {
  arc:    { d: "M 5 50 Q 100 5, 195 50",                     start: [5, 50], end: [195, 50] },
  zigzag: { d: "M 5 50 L 50 15 L 100 50 L 150 15 L 195 50", start: [5, 50], end: [195, 50] },
  weave:  { d: "M 5 30 Q 50 5, 100 30 T 195 30",            start: [5, 30], end: [195, 30] },
};

const FOREST = "#0E1F18";
const LIME = "#B5F94A";
const CORAL = "#E76F51";

export function CoursePath({ variant, accent = "both", className, ...rest }: CoursePathProps) {
  const { d, start, end } = PATHS[variant];
  const startFill = accent === "coral" ? CORAL : LIME;
  const endFill = accent === "lime" ? LIME : accent === "coral" ? CORAL : CORAL;

  return (
    <svg
      viewBox="0 0 200 60"
      width="200"
      height="60"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
      {...rest}
    >
      <path
        d={d}
        stroke={FOREST}
        strokeOpacity={0.25}
        strokeWidth={1.5}
        strokeDasharray="2,3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={start[0]} cy={start[1]} r={3} fill={startFill} stroke={FOREST} strokeOpacity={0.6} strokeWidth={1} />
      <circle cx={end[0]}   cy={end[1]}   r={3} fill={endFill}   stroke={FOREST} strokeOpacity={0.6} strokeWidth={1} />
    </svg>
  );
}

export default CoursePath;
