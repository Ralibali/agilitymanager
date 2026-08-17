import { useMemo } from "react";
import { buildDogPath } from "./dogPath";
import { analyzeCourse } from "./courseAnalysis";
import { getObstacleDefV2 } from "./config";
import type { CourseBankEntry } from "./courseBank";
import type { ObstacleLite } from "./validation";

interface Props {
  course: CourseBankEntry;
}

function obstacleShape(type: string, widthM: number, depthM: number) {
  if (type === "tunnel") {
    return <rect x={-widthM / 2} y={-depthM / 2} width={widthM} height={depthM} rx={depthM / 2} className="fill-none stroke-current" strokeWidth={0.22} />;
  }
  if (type === "weave_8" || type === "weave_10" || type === "weave_12") {
    return <line x1={0} y1={-depthM / 2} x2={0} y2={depthM / 2} className="stroke-current" strokeWidth={0.22} strokeDasharray="0.35 0.28" />;
  }
  if (type === "aframe" || type === "dogwalk" || type === "seesaw") {
    return <rect x={-widthM / 2} y={-depthM / 2} width={widthM} height={depthM} rx={0.12} className="fill-current opacity-35 stroke-current" strokeWidth={0.12} />;
  }
  if (type === "tire") {
    return <circle r={Math.max(0.35, widthM * 0.24)} className="fill-none stroke-current" strokeWidth={0.2} />;
  }
  if (type === "longjump" || type === "combo") {
    return <rect x={-widthM / 2} y={-Math.max(0.18, depthM / 2)} width={widthM} height={Math.max(0.36, depthM)} className="fill-none stroke-current" strokeWidth={0.18} />;
  }
  if (type === "hoop") {
    return <path d="M -0.5 0 Q 0 -0.8 0.5 0" className="fill-none stroke-current" strokeWidth={0.2} />;
  }
  if (type === "barrel") {
    return <circle r={Math.max(0.3, widthM / 2)} className="fill-none stroke-current" strokeWidth={0.18} />;
  }
  return <line x1={-widthM / 2} y1={0} x2={widthM / 2} y2={0} className="stroke-current" strokeWidth={0.2} />;
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
  const gridX = Array.from({ length: Math.floor(course.arenaWidthM / 5) + 1 }, (_, i) => i * 5);
  const gridY = Array.from({ length: Math.floor(course.arenaHeightM / 5) + 1 }, (_, i) => i * 5);
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
        viewBox={`0 0 ${course.arenaWidthM} ${course.arenaHeightM}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Miniatyr av ${course.label}. ${analysis.difficultyLabel} svårighet ${analysis.difficultyScore} av 100, flow ${analysis.flowScore} av 100.`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="text-border" opacity={0.7}>
          {gridX.map((x) => <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={course.arenaHeightM} stroke="currentColor" strokeWidth={0.08} />)}
          {gridY.map((y) => <line key={`gy-${y}`} x1={0} y1={y} x2={course.arenaWidthM} y2={y} stroke="currentColor" strokeWidth={0.08} />)}
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
          {course.obstacles.filter((obstacle) => obstacle.number != null).map((obstacle, index) => {
            const def = getObstacleDefV2(obstacle.type);
            const widthM = def?.sizeM.w ?? 1.2;
            const depthM = def?.sizeM.d ?? 0.2;
            return (
              <g key={`${obstacle.number}-${index}`} transform={`translate(${obstacle.x} ${obstacle.y}) rotate(${obstacle.rotation})`}>
                {obstacleShape(obstacle.type, widthM, depthM)}
              </g>
            );
          })}
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
