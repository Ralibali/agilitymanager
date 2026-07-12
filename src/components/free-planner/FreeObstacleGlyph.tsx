import { cn } from "@/lib/utils";

export type FreeObstacleGlyphType =
  | "jump"
  | "tunnel"
  | "weave"
  | "aframe"
  | "seesaw"
  | "longjump"
  | "wall"
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
 * Minimal SVG-glyf per hinderstyp. Håller sig till design tokens
 * (currentColor / hsl(var(--primary))) så den fungerar i alla teman.
 */
export function FreeObstacleGlyph({ type, size = 28, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className: cn("shrink-0", className),
    "aria-hidden": true as const,
    focusable: false as const,
  };
  const stroke = "hsl(var(--foreground))";
  const primary = "hsl(var(--primary))";

  switch (type) {
    case "jump":
      return (
        <svg {...common}>
          <line x1="6" y1="24" x2="6" y2="10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="26" y1="24" x2="26" y2="10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="4" y="15" width="24" height="3" rx="1.5" fill={primary} />
        </svg>
      );
    case "tunnel":
      return (
        <svg {...common}>
          <path d="M4 22 Q4 8 16 8 Q28 8 28 22" fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round" />
          <line x1="4" y1="22" x2="28" y2="22" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
        </svg>
      );
    case "weave":
      return (
        <svg {...common}>
          {[6, 12, 18, 24].map((x) => (
            <line key={x} x1={x} y1="6" x2={x} y2="26" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          ))}
          <path d="M6 10 Q12 16 18 10 Q24 22 24 22" fill="none" stroke={primary} strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );
    case "aframe":
      return (
        <svg {...common}>
          <path d="M4 26 L16 6 L28 26 Z" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M4 26 L16 6" stroke={primary} strokeWidth="2" />
        </svg>
      );
    case "seesaw":
      return (
        <svg {...common}>
          <line x1="4" y1="20" x2="28" y2="14" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M14 22 L16 26 L18 22 Z" fill={primary} />
        </svg>
      );
    case "longjump":
      return (
        <svg {...common}>
          <rect x="4" y="16" width="6" height="3" fill={primary} />
          <rect x="13" y="15" width="6" height="4" fill={primary} />
          <rect x="22" y="14" width="6" height="5" fill={primary} />
        </svg>
      );
    case "wall":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="22" height="14" rx="1.5" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="5" y1="17" x2="27" y2="17" stroke={stroke} strokeWidth="1.5" />
          <line x1="16" y1="10" x2="16" y2="17" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "start":
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="12" fill={primary} />
          <path d="M13 10 L22 16 L13 22 Z" fill="hsl(var(--primary-foreground))" />
        </svg>
      );
    case "finish":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="24" height="24" fill="none" stroke={stroke} strokeWidth="2" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) =>
              (r + c) % 2 === 0 ? <rect key={`${r}-${c}`} x={4 + c * 6} y={4 + r * 6} width="6" height="6" fill={stroke} /> : null,
            ),
          )}
        </svg>
      );
    case "hoop":
      return (
        <svg {...common}>
          <ellipse cx="16" cy="16" rx="11" ry="11" fill="none" stroke={primary} strokeWidth="3" />
          <line x1="16" y1="27" x2="16" y2="30" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "barrel":
      return (
        <svg {...common}>
          <ellipse cx="16" cy="9" rx="10" ry="3" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M6 9 L6 23 Q6 26 16 26 Q26 26 26 23 L26 9" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="6" y1="16" x2="26" y2="16" stroke={primary} strokeWidth="1.5" />
        </svg>
      );
    case "fence":
      return (
        <svg {...common}>
          <line x1="4" y1="20" x2="28" y2="20" stroke={stroke} strokeWidth="2" />
          {[8, 14, 20, 26].map((x) => (
            <line key={x} x1={x} y1="10" x2={x} y2="24" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>
      );
    case "zone":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="22" height="22" rx="3" fill={primary} fillOpacity="0.15" stroke={primary} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      );
  }
}
