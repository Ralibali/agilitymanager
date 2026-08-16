import { ObstacleGlyph } from "@/components/ObstacleGlyph";
import type { PlacedObstacle } from "@/lib/course";

export interface PreviewCourseData {
  arenaWidthM?: number;
  arenaHeightM?: number;
  obstacles?: PlacedObstacle[];
}

/** Skrivskyddad miniatyr/visning av en bana. */
export function CoursePreviewSvg({
  data,
  className = "h-[60vh] w-full",
  label = "Banskiss",
}: {
  data: PreviewCourseData;
  className?: string;
  label?: string;
}) {
  const w = data.arenaWidthM ?? 30;
  const h = data.arenaHeightM ?? 40;
  const obstacles = data.obstacles ?? [];
  const gridX = Array.from({ length: Math.floor(w / 5) + 1 }, (_, i) => i * 5);
  const gridY = Array.from({ length: Math.floor(h / 5) + 1 }, (_, i) => i * 5);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={w} height={h} className="fill-muted/30" />
      <g className="text-border" opacity={0.8}>
        {gridX.map((x) => (
          <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={h} stroke="currentColor" strokeWidth={0.06} />
        ))}
        {gridY.map((y) => (
          <line key={`gy-${y}`} x1={0} y1={y} x2={w} y2={y} stroke="currentColor" strokeWidth={0.06} />
        ))}
      </g>

      {obstacles.map((ob, i) => (
        <g key={ob.id ?? i} transform={`translate(${ob.x} ${ob.y}) rotate(${ob.rotation ?? 0})`}>
          <ObstacleGlyph type={ob.type} stroke="currentColor" />
        </g>
      ))}

      <g className="text-foreground">
        {obstacles
          .filter((ob) => ob.number != null)
          .map((ob, i) => (
            <g key={`n-${i}`} transform={`translate(${ob.x + 0.8} ${ob.y - 0.8})`}>
              <circle r={0.55} className="fill-card stroke-current" strokeWidth={0.09} />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                y={0.02}
                fontSize={0.66}
                fontWeight={700}
                className="fill-current"
              >
                {ob.number}
              </text>
            </g>
          ))}
      </g>
    </svg>
  );
}

export default CoursePreviewSvg;
