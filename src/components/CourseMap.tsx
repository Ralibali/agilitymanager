import { useId } from "react";
import type { Course } from "@/lib/course";
import { smoothPath } from "@/lib/course";
import { ObstacleGlyph } from "./ObstacleGlyph";

interface CourseMapProps {
  course: Course;
  variant?: "light" | "dark";
  showLine?: boolean;
  showNumbers?: boolean;
  animate?: boolean;
  className?: string;
}

/**
 * Statisk bankarta (SVG) — används i hero, banbibliotek och som förhandsvisning.
 */
export function CourseMap({
  course,
  variant = "light",
  showLine = true,
  showNumbers = true,
  animate = false,
  className = "",
}: CourseMapProps) {
  const [w, h] = course.field;
  const uidP = useId().replace(/:/g, "");
  const pathId = `runline-${uidP}`;
  const dark = variant === "dark";
  const lineColor = dark ? "#FF6900" : "#006937";
  const stroke = dark ? "#F6F1E7" : "#161812";
  const pts = course.obstacles.map((ob) => ({ x: ob.x, y: ob.y }));
  const d = smoothPath(pts);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label={`Bankarta: ${course.name}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* plan + metergrid */}
      <rect x="0" y="0" width={w} height={h} fill={dark ? "#0A3D24" : "#FCFAF4"} />
      {Array.from({ length: Math.floor(w) + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i} y1="0" x2={i} y2={h} stroke={stroke} strokeOpacity={dark ? 0.10 : 0.07} strokeWidth={i % 5 === 0 ? 0.06 : 0.028} />
      ))}
      {Array.from({ length: Math.floor(h) + 1 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i} x2={w} y2={i} stroke={stroke} strokeOpacity={dark ? 0.10 : 0.07} strokeWidth={i % 5 === 0 ? 0.06 : 0.028} />
      ))}
      <rect x="0.18" y="0.18" width={w - 0.36} height={h - 0.36} fill="none" stroke={stroke} strokeOpacity={0.55} strokeWidth={0.12} />

      {/* banlinje */}
      {showLine && d && (
        <>
          <path
            id={pathId}
            d={d}
            fill="none"
            stroke={lineColor}
            strokeWidth={0.22}
            strokeDasharray="0.65 0.5"
            strokeLinecap="round"
            opacity={0.9}
            style={
              animate
                ? { strokeDasharray: 1400, strokeDashoffset: 1400, animation: "dash-run 4.5s cubic-bezier(0.45,0,0.3,1) 0.9s forwards" }
                : undefined
            }
          />
          {animate && (
            <circle r="0.55" fill="#FF6900" stroke={dark ? "#0A3D24" : "#FCFAF4"} strokeWidth="0.16">
              <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          )}
        </>
      )}

      {/* hinder */}
      {course.obstacles.map((ob, i) => (
        <g key={ob.id} transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rotation})`}>
          <ObstacleGlyph type={ob.type} stroke={stroke} sw={0.09} curveDeg={ob.curveDeg} curveSide={ob.curveSide} />
          {showNumbers && (
            <g transform={`rotate(${-ob.rotation})`}>
              <circle cx="1.05" cy="-1.05" r="0.62" fill={dark ? "#FF6900" : "#161812"} />
              <text
                x="1.05"
                y="-0.78"
                textAnchor="middle"
                fontSize="0.78"
                fontWeight="800"
                fill={dark ? "#161812" : "#F6F1E7"}
                fontFamily="Archivo, sans-serif"
              >
                {i + 1}
              </text>
            </g>
          )}
        </g>
      ))}

      {/* måttstock */}
      <g fontFamily="Archivo, sans-serif" fill={stroke} opacity={0.5}>
        <text x={0.7} y={h - 0.7} fontSize="0.9" fontWeight="600">
          {w} × {h} m
        </text>
      </g>
    </svg>
  );
}
