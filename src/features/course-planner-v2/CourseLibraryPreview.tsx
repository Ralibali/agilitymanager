import { useMemo } from "react";
import { buildDogPath } from "./dogPath";
import { analyzeCourse } from "./courseAnalysis";
import { ObstacleGlyph } from "@/components/ObstacleGlyph";
import { clampArenaM, gridTicks } from "@/lib/courseSafety";
import type { CourseBankEntry } from "./courseBank";
import type { ObstacleLite } from "./validation";

interface Props {
  course: CourseBankEntry;
}

export default function CourseLibraryPreview({ course }: Props) {
  const path = useMemo(() => buildDogPath(course.obstacles), [course]);
  const analysis = useMemo(() => {
    const obstacles: ObstacleLite[] = course.obstacles.map((obstacle, index) => ({
      ...obstacle,
      id: `${course.key}-${index}`,
    }));
    return analyzeCourse(obstacles);
  }, [course]);
  const arenaWidthM = clampArenaM(course.arenaWidthM, 30);
  const arenaHeightM = clampArenaM(course.arenaHeightM, 40);
  const gridX = gridTicks(arenaWidthM, 5);
  const gridY = gridTicks(arenaHeightM, 5);
  const routePoints = path.points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl border border-border bg-muted/20 p-2">
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-wrap justify-end gap-1.5">
        <span className="rounded-full border border-foreground/10 bg-card/95 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-foreground shadow-sm backdrop-blur">
          {analysis.difficultyLabel} · {analysis.difficultyScore}
        </span>
        <span className="rounded-full border border-primary/15 bg-primary/95 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-primary-foreground shadow-sm">
          Flow {analysis.flowScore}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${arenaWidthM} ${arenaHeightM}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Miniatyr av ${course.label}. ${analysis.difficultyLabel} svårighet ${analysis.difficultyScore} av 100, flow ${analysis.flowScore} av 100.`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="text-border" opacity={0.7}>
          {gridX.map((x) => <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={arenaHeightM} stroke="currentColor" strokeWidth={0.08} />)}
          {gridY.map((y) => <line key={`gy-${y}`} x1={0} y1={y} x2={arenaWidthM} y2={y} stroke="currentColor" strokeWidth={0.08} />)}
        </g>

        {routePoints && (
          <polyline
            points={routePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.28}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            opacity={0.6}
          />
        )}

        <g className="text-foreground">
          {course.obstacles.filter((obstacle) => obstacle.number != null).map((obstacle, index) => (
            <g key={`${obstacle.number}-${index}`} transform={`translate(${obstacle.x} ${obstacle.y}) rotate(${obstacle.rotation})`}>
              <ObstacleGlyph
                type={obstacle.type}
                stroke="#161812"
                sw={0.14}
                curveDeg={obstacle.curveDeg}
                curveSide={obstacle.curveSide}
                lengthM={obstacle.lengthM}
              />
            </g>
          ))}
        </g>

        <g className="text-foreground">
          {course.obstacles.filter((obstacle) => obstacle.number != null).map((obstacle, index) => (
            <g key={`n-${obstacle.number}-${index}`} transform={`translate(${obstacle.x + 0.65} ${obstacle.y - 0.65})`}>
              <circle r={0.5} className="fill-card stroke-current" strokeWidth={0.1} />
              <text
                x={0}
                y={0.02}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-current"
                fontSize={0.62}
                fontWeight={700}
              >
                {obstacle.number}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
