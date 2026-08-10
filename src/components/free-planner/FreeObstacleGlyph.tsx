import { cn } from "@/lib/utils";

export type FreeObstacleGlyphType =
  | "jump"
  | "spread"
  | "tunnel"
  | "weave"
  | "dogwalk"
  | "aframe"
  | "seesaw"
  | "longjump"
  | "wall"
  | "tyre"
  | "start"
  | "finish"
  | "hoop"
  | "barrel"
  | "fence"
  | "zone";

interface Props {
  type: FreeObstacleGlyphType;
  size?: number;
  className?: string;
}

/**
 * Top-down-inspirerade SVG-symboler för banritning.
 * Symbolerna är avsedda för planritning; de fysiska måtten valideras separat
 * mot FCI-standarderna i fciAgilityStandards.ts.
 */
export function FreeObstacleGlyph({ type, size = 34, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 40 40",
    className: cn("shrink-0 overflow-visible", className),
    "aria-hidden": true as const,
    focusable: false as const,
  };
  const stroke = "hsl(var(--foreground))";
  const primary = "hsl(var(--primary))";
  const muted = "hsl(var(--muted-foreground))";

  switch (type) {
    case "jump":
      return (
        <svg {...common}>
          <line x1="7" y1="9" x2="7" y2="31" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="33" y1="9" x2="33" y2="31" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="8" y1="20" x2="32" y2="20" stroke={primary} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="3" y1="11" x2="10" y2="11" stroke={muted} strokeWidth="1.4" />
          <line x1="30" y1="29" x2="37" y2="29" stroke={muted} strokeWidth="1.4" />
        </svg>
      );
    case "spread":
      return (
        <svg {...common}>
          <line x1="6" y1="8" x2="6" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="14" y1="8" x2="14" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="26" y1="8" x2="26" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="34" y1="8" x2="34" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="7" y1="18" x2="13" y2="18" stroke={primary} strokeWidth="3" />
          <line x1="27" y1="22" x2="33" y2="22" stroke={primary} strokeWidth="3" />
        </svg>
      );
    case "tunnel":
      return (
        <svg {...common}>
          <path d="M5 30 C5 10 15 6 24 9 C33 12 35 20 34 31" fill="none" stroke={primary} strokeWidth="5" strokeLinecap="round" />
          <path d="M6 30 C6 12 15 9 23 11 C30 13 32 20 32 30" fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 3" />
        </svg>
      );
    case "weave":
      return (
        <svg {...common}>
          {[5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38].map((x) => (
            <circle key={x} cx={x} cy="20" r="1.7" fill={stroke} />
          ))}
          <path d="M5 16 C9 24 13 16 17 24 C21 16 25 24 29 16 C33 24 35 17 38 22" fill="none" stroke={primary} strokeWidth="1.6" strokeDasharray="2 2" />
        </svg>
      );
    case "dogwalk":
      return (
        <svg {...common}>
          <rect x="3" y="16" width="34" height="8" rx="1" fill="none" stroke={stroke} strokeWidth="1.8" />
          <rect x="3" y="16" width="9" height="8" fill={primary} fillOpacity="0.65" />
          <rect x="28" y="16" width="9" height="8" fill={primary} fillOpacity="0.65" />
          <line x1="13" y1="20" x2="27" y2="20" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );
    case "aframe":
      return (
        <svg {...common}>
          <path d="M4 30 L20 7 L36 30" fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
          <path d="M4 30 L10 21" stroke={primary} strokeWidth="5" />
          <path d="M30 21 L36 30" stroke={primary} strokeWidth="5" />
        </svg>
      );
    case "seesaw":
      return (
        <svg {...common}>
          <rect x="4" y="17" width="32" height="6" rx="1" fill="none" stroke={stroke} strokeWidth="1.8" />
          <rect x="4" y="17" width="8" height="6" fill={primary} fillOpacity="0.65" />
          <rect x="28" y="17" width="8" height="6" fill={primary} fillOpacity="0.65" />
          <path d="M17 27 L20 22 L23 27 Z" fill={stroke} />
        </svg>
      );
    case "longjump":
      return (
        <svg {...common}>
          {[8, 14, 21, 29].map((x, index) => (
            <rect key={x} x={x} y={12 + index} width="3.5" height={16 - index * 2} rx="0.8" fill={primary} />
          ))}
          <circle cx="5" cy="8" r="1.8" fill={stroke} />
          <circle cx="35" cy="8" r="1.8" fill={stroke} />
          <circle cx="5" cy="32" r="1.8" fill={stroke} />
          <circle cx="35" cy="32" r="1.8" fill={stroke} />
        </svg>
      );
    case "wall":
      return (
        <svg {...common}>
          <rect x="6" y="13" width="28" height="14" rx="1.5" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M6 20 H34 M13 13 V20 M26 20 V27" stroke={primary} strokeWidth="1.7" />
          <rect x="3" y="9" width="4" height="22" rx="1" fill={stroke} />
          <rect x="33" y="9" width="4" height="22" rx="1" fill={stroke} />
        </svg>
      );
    case "tyre":
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="8" fill="none" stroke={primary} strokeWidth="4" />
          <line x1="7" y1="7" x2="7" y2="33" stroke={stroke} strokeWidth="2" />
          <line x1="33" y1="7" x2="33" y2="33" stroke={stroke} strokeWidth="2" />
          <line x1="7" y1="12" x2="12" y2="16" stroke={muted} strokeWidth="1.4" />
          <line x1="33" y1="12" x2="28" y2="16" stroke={muted} strokeWidth="1.4" />
        </svg>
      );
    case "start":
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="14" fill={primary} />
          <path d="M16 12 L29 20 L16 28 Z" fill="hsl(var(--primary-foreground))" />
        </svg>
      );
    case "finish":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="28" height="28" fill="none" stroke={stroke} strokeWidth="2" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) =>
              (r + c) % 2 === 0 ? <rect key={`${r}-${c}`} x={6 + c * 7} y={6 + r * 7} width="7" height="7" fill={stroke} /> : null,
            ),
          )}
        </svg>
      );
    case "hoop":
      return (
        <svg {...common}>
          <path d="M8 29 V17 C8 7 32 7 32 17 V29" fill="none" stroke={primary} strokeWidth="3" />
          <line x1="5" y1="29" x2="11" y2="29" stroke={stroke} strokeWidth="2" />
          <line x1="29" y1="29" x2="35" y2="29" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "barrel":
      return (
        <svg {...common}>
          <ellipse cx="20" cy="11" rx="10" ry="4" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M10 11 V28 C10 31 30 31 30 28 V11" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="10" y1="20" x2="30" y2="20" stroke={primary} strokeWidth="1.5" />
        </svg>
      );
    case "fence":
      return (
        <svg {...common}>
          <line x1="4" y1="22" x2="36" y2="22" stroke={stroke} strokeWidth="2" />
          {[8, 16, 24, 32].map((x) => <line key={x} x1={x} y1="10" x2={x} y2="30" stroke={stroke} strokeWidth="2" />)}
        </svg>
      );
    case "zone":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="28" height="28" rx="4" fill={primary} fillOpacity="0.12" stroke={primary} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      );
  }
}
