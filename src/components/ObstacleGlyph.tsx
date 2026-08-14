import type { ObstacleType } from "@/lib/course";

/**
 * Ritar ett hinder i SVG, centrerat kring (0,0), i meter-enheter.
 * rotation appliceras av anroparen via <g transform>.
 */
export function ObstacleGlyph({
  type,
  stroke = "#161812",
  sw = 0.09,
}: {
  type: ObstacleType;
  stroke?: string;
  sw?: number;
}) {
  const s = { stroke, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const };
  switch (type) {
    case "jump":
      return (
        <g {...s}>
          <line x1="-1" y1="0" x2="1" y2="0" strokeWidth={sw * 1.6} />
          <line x1="-1" y1="-0.45" x2="-1" y2="0.45" strokeWidth={sw * 2.2} />
          <line x1="1" y1="-0.45" x2="1" y2="0.45" strokeWidth={sw * 2.2} />
        </g>
      );
    case "double":
      return (
        <g {...s}>
          <line x1="-1" y1="-0.18" x2="1" y2="-0.18" strokeWidth={sw * 1.4} />
          <line x1="-1" y1="0.18" x2="1" y2="0.18" strokeWidth={sw * 1.4} />
          <line x1="-1" y1="-0.55" x2="-1" y2="0.55" strokeWidth={sw * 2.2} />
          <line x1="1" y1="-0.55" x2="1" y2="0.55" strokeWidth={sw * 2.2} />
        </g>
      );
    case "tunnel":
      return (
        <g {...s}>
          <path d="M -1.4 0.9 A 1.65 1.65 0 0 1 1.4 0.9" strokeWidth={sw * 3.2} />
          <path d="M -1.4 0.9 A 1.65 1.65 0 0 1 1.4 0.9" stroke="#F6F1E7" strokeWidth={sw * 1.1} strokeDasharray="0.22 0.22" fill="none" />
        </g>
      );
    case "weave":
      return (
        <g {...s} fill={stroke}>
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={-2.75 + i * 0.5} cy={0} r={sw * 1.15} stroke="none" />
          ))}
        </g>
      );
    case "aframe":
      return (
        <g {...s}>
          <rect x="-2.4" y="-0.55" width="4.8" height="1.1" strokeWidth={sw} fill="none" />
          <line x1="0" y1="-0.55" x2="0" y2="0.55" strokeWidth={sw * 1.4} />
        </g>
      );
    case "seesaw":
      return (
        <g {...s}>
          <rect x="-1.82" y="-0.16" width="3.64" height="0.32" strokeWidth={sw} fill="none" />
          <circle cx="0" cy="0" r={sw * 1.5} fill={stroke} stroke="none" />
        </g>
      );
    case "dogwalk":
      return (
        <g {...s}>
          <line x1="-1.82" y1="0" x2="1.82" y2="0" strokeWidth={sw * 1.8} />
          <line x1="-1.82" y1="0" x2="-1.1" y2="0.32" strokeWidth={sw * 1.2} />
          <line x1="1.82" y1="0" x2="1.1" y2="0.32" strokeWidth={sw * 1.2} />
        </g>
      );
    case "longjump":
      return (
        <g {...s}>
          <line x1="-0.9" y1="-0.55" x2="-0.9" y2="0.55" strokeWidth={sw * 1.2} />
          <line x1="-0.3" y1="-0.55" x2="-0.3" y2="0.55" strokeWidth={sw * 1.2} />
          <line x1="0.3" y1="-0.55" x2="0.3" y2="0.55" strokeWidth={sw * 1.2} />
          <line x1="0.9" y1="-0.55" x2="0.9" y2="0.55" strokeWidth={sw * 1.2} />
        </g>
      );
    case "tyre":
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="0.55" strokeWidth={sw * 1.6} />
          <line x1="-0.75" y1="0.62" x2="0.75" y2="0.62" strokeWidth={sw * 1.6} />
        </g>
      );
    case "hoop":
      return (
        <g {...s}>
          <path d="M -0.55 0.4 A 0.62 0.62 0 0 1 0.55 0.4" strokeWidth={sw * 2} />
          <line x1="-0.55" y1="0.4" x2="-0.55" y2="0.62" strokeWidth={sw * 2} />
          <line x1="0.55" y1="0.4" x2="0.55" y2="0.62" strokeWidth={sw * 2} />
        </g>
      );
    case "barrel":
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="0.42" strokeWidth={sw * 1.6} />
          <circle cx="0" cy="0" r="0.14" strokeWidth={sw * 1.2} />
        </g>
      );
  }
}
