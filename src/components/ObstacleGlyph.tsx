import { getObstacleDefV2, type ObstacleTypeV2 } from "@/features/course-planner-v2/config";

/**
 * Ritar ett hinder i SVG, centrerat kring (0,0), i meter-enheter.
 * Följer v2-konventionen: lång axel = y för slalom/balans, x för hopp/tunnlar.
 * rotation appliceras av anroparen via <g transform>.
 */
export function ObstacleGlyph({
  type,
  stroke = "#161812",
  sw = 0.09,
  curveDeg = 0,
  curveSide = "right",
}: {
  type: ObstacleTypeV2;
  stroke?: string;
  sw?: number;
  curveDeg?: number;
  curveSide?: "left" | "right";
}) {
  const def = getObstacleDefV2(type);
  const w = def?.sizeM.w ?? 1;
  const d = def?.sizeM.d ?? 1;
  const s = {
    stroke,
    strokeWidth: sw,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "jump":
      return (
        <g {...s}>
          <line x1={-w / 2} y1="0" x2={w / 2} y2="0" strokeWidth={sw * 1.5} />
          <line x1={-w / 2} y1={-0.45} x2={-w / 2} y2={0.45} strokeWidth={sw * 2.4} />
          <line x1={w / 2} y1={-0.45} x2={w / 2} y2={0.45} strokeWidth={sw * 2.4} />
        </g>
      );
    case "wall":
      return (
        <g {...s}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} strokeWidth={sw} fill={`${stroke}22`} />
          <line x1={-w / 2 + 0.15} y1={d / 2 - 0.1} x2={-w / 2 + 0.45} y2={-d / 2 + 0.1} strokeWidth={sw * 0.8} />
          <line x1={-w / 2 + 0.55} y1={d / 2 - 0.1} x2={-w / 2 + 0.85} y2={-d / 2 + 0.1} strokeWidth={sw * 0.8} />
          <line x1={-w / 2 + 0.95} y1={d / 2 - 0.1} x2={-w / 2 + 1.25} y2={-d / 2 + 0.1} strokeWidth={sw * 0.8} />
        </g>
      );
    case "combo":
      return (
        <g {...s}>
          <line x1={-w / 2} y1={-d / 4} x2={w / 2} y2={-d / 4} strokeWidth={sw * 1.3} />
          <line x1={-w / 2} y1={d / 4} x2={w / 2} y2={d / 4} strokeWidth={sw * 1.3} />
          <line x1={-w / 2} y1={-0.55} x2={-w / 2} y2={0.55} strokeWidth={sw * 2.2} />
          <line x1={w / 2} y1={-0.55} x2={w / 2} y2={0.55} strokeWidth={sw * 2.2} />
        </g>
      );
    case "longjump": {
      const planks = 4;
      return (
        <g {...s}>
          {Array.from({ length: planks }).map((_, i) => (
            <line
              key={i}
              x1={-w / 2}
              y1={-d / 2 + (i + 0.5) * (d / planks)}
              x2={w / 2}
              y2={-d / 2 + (i + 0.5) * (d / planks)}
              strokeWidth={sw * 1.2}
            />
          ))}
          <line x1={-w / 2} y1={-d / 2 - 0.3} x2={-w / 2} y2={-d / 2} strokeWidth={sw * 1.8} />
          <line x1={w / 2} y1={-d / 2 - 0.3} x2={w / 2} y2={-d / 2} strokeWidth={sw * 1.8} />
        </g>
      );
    }
    case "tire":
      return (
        <g {...s}>
          <circle r={Math.min(w, d) / 2 - 0.05} strokeWidth={sw * 1.4} />
          <circle r={Math.min(w, d) / 2 - 0.28} strokeWidth={sw * 1.8} />
          <line x1={-w / 2} y1={d / 2 + 0.15} x2={w / 2} y2={d / 2 + 0.15} strokeWidth={sw * 1.6} />
        </g>
      );
    case "tunnel": {
      const bend = Math.max(0, Math.min(90, curveDeg));
      if (bend < 1) {
        return (
          <g {...s}>
            <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={d / 2} ry={d / 2} strokeWidth={sw * 1.4} fill={`${stroke}14`} />
            <circle cx={-w / 2 + d / 2} cy="0" r={Math.max(0.02, d / 2 - sw * 1.6)} strokeWidth={sw * 0.8} strokeDasharray="0.16 0.16" />
            <circle cx={w / 2 - d / 2} cy="0" r={Math.max(0.02, d / 2 - sw * 1.6)} strokeWidth={sw * 0.8} strokeDasharray="0.16 0.16" />

          </g>
        );
      }
      const side = curveSide === "left" ? -1 : 1;
      const r = d / 2;
      const offset = Math.tan(((bend * Math.PI) / 180) / 2) * (w / 2);
      const x0 = -w / 2;
      const x1 = w / 2;
      const cy = side * offset;
      const top = `M ${x0} ${-r} Q 0 ${cy - r} ${x1} ${-r}`;
      const bot = `M ${x0} ${r} Q 0 ${cy + r} ${x1} ${r}`;
      const fill = `M ${x0} ${-r} Q 0 ${cy - r} ${x1} ${-r} L ${x1} ${r} Q 0 ${cy + r} ${x0} ${r} Z`;
      return (
        <g {...s}>
          <path d={fill} fill={`${stroke}14`} stroke="none" />
          <path d={top} strokeWidth={sw * 1.4} />
          <path d={bot} strokeWidth={sw * 1.4} />
          <circle cx={x0} cy="0" r={r * 0.85} strokeWidth={sw * 0.7} strokeDasharray="0.16 0.16" opacity="0.6" />
          <circle cx={x1} cy="0" r={r * 0.85} strokeWidth={sw * 0.7} strokeDasharray="0.16 0.16" opacity="0.6" />
        </g>
      );
    }
    case "weave_8":
    case "weave_10":
    case "weave_12": {
      const count = type === "weave_8" ? 8 : type === "weave_10" ? 10 : 12;
      return (
        <g fill={stroke} stroke="none">
          {Array.from({ length: count }).map((_, i) => (
            <circle key={i} cx="0" cy={-d / 2 + (i + 0.5) * (d / count)} r={sw * 1.2} />
          ))}
          <line x1="0" y1={-d / 2} x2="0" y2={d / 2} stroke={stroke} strokeWidth={sw * 0.5} strokeDasharray="0.2 0.3" opacity="0.5" />
        </g>
      );
    }
    case "aframe":
      return (
        <g {...s}>
          <polygon points={`${-w / 2},${d / 2} ${w / 2},${d / 2} 0,${-d / 2}`} strokeWidth={sw} fill={`${stroke}14`} />
          <line x1="0" y1={-d / 2} x2="0" y2={d / 2} strokeWidth={sw * 0.8} strokeDasharray="0.12 0.12" />
          <rect x={-w / 2} y={d / 2 - 0.42} width={w} height="0.42" fill={stroke} opacity="0.35" stroke="none" />
        </g>
      );
    case "dogwalk":
      return (
        <g {...s}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} strokeWidth={sw} fill="none" />
          <rect x={-w / 2} y={-d / 2} width={w} height="0.6" fill={stroke} opacity="0.35" stroke="none" />
          <rect x={-w / 2} y={d / 2 - 0.6} width={w} height="0.6" fill={stroke} opacity="0.35" stroke="none" />
          <line x1={-w / 2} y1="0" x2={w / 2} y2="0" strokeWidth={sw * 0.7} />
        </g>
      );
    case "seesaw":
      return (
        <g {...s}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} strokeWidth={sw} fill="none" />
          <polygon points={`${-0.28},0 ${0.28},0 0,${0.4}`} fill={stroke} stroke="none" />
        </g>
      );
    case "table":
      return (
        <g {...s}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx="0.08" strokeWidth={sw * 1.2} fill={`${stroke}14`} />
          <rect x={-w / 2 + 0.18} y={-d / 2 + 0.18} width={w - 0.36} height={d - 0.36} rx="0.05" strokeWidth={sw * 0.7} strokeDasharray="0.14 0.14" />
        </g>
      );
    case "start":
      return (
        <g {...s}>
          <line x1={-w / 2} y1="0" x2={w / 2} y2="0" strokeWidth={sw * 1.6} />
          <polygon points={`0,${-0.02} ${w / 2 - 0.08},${-d / 2 - 0.55} ${-w / 2 + 0.08},${-d / 2 - 0.55}`} fill={stroke} opacity="0.85" stroke="none" />
        </g>
      );
    case "finish":
      return (
        <g {...s}>
          <line x1={-w / 2} y1="0" x2={w / 2} y2="0" strokeWidth={sw * 1.6} />
          <polygon points={`${-w / 2},${d / 2 + 0.55} ${-w / 4},${d / 2 + 0.1} ${0},${d / 2 + 0.55} ${w / 4},${d / 2 + 0.1} ${w / 2},${d / 2 + 0.55}`} fill={stroke} opacity="0.85" stroke="none" />
        </g>
      );
    case "number":
      return <circle r="0.28" fill={stroke} />;
    case "hoop":
      return (
        <g {...s}>
          <ellipse rx={w / 2} ry={Math.max(d / 2, 0.32)} strokeWidth={sw * 1.8} />
          <ellipse rx={w / 2 - 0.16} ry={Math.max(d / 2, 0.32) - 0.16} strokeWidth={sw * 0.7} strokeDasharray="0.14 0.14" opacity="0.6" />
        </g>
      );
    case "barrel":
      return (
        <g {...s}>
          <circle r={Math.min(w, d) / 2} strokeWidth={sw * 1.4} fill={`${stroke}14`} />
          <circle r={Math.min(w, d) / 2 - 0.18} strokeWidth={sw * 0.8} strokeDasharray="0.15 0.15" />
        </g>
      );
    case "fence":
      return (
        <g {...s}>
          <line x1={-w / 2} y1="0" x2={w / 2} y2="0" strokeWidth={sw * 2.6} />
          {[-0.4, 0, 0.4].map((off) => (
            <line key={off} x1={off * w} y1={-0.22} x2={off * w} y2={0.22} strokeWidth={sw * 1.2} />
          ))}
        </g>
      );
    case "handler_zone":
      return (
        <g {...s}>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} strokeWidth={sw} strokeDasharray="0.35 0.25" fill={`${stroke}0d`} />
          <path d={`M ${-0.5} ${-0.2} l 0.25 0.5 l 0.25 -0.5 M 0 ${0.3} v 0.35`} strokeWidth={sw * 1.1} />
        </g>
      );
    default:
      return <rect x={-w / 2} y={-d / 2} width={w} height={d} {...s} />;
  }
}
