/**
 * Subtil dekorativ illustration för dashboard-hero.
 * SVG-tassar i mjuka v3-färger. Inte interaktiv.
 */
export function HeroPawIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="hpi-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--v3-brand-500))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--v3-brand-500))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="90" r="90" fill="url(#hpi-glow)" />
      {/* large paw */}
      <g
        transform="translate(70 35) rotate(-12)"
        fill="hsl(var(--v3-brand-500))"
        opacity="0.85"
      >
        <ellipse cx="40" cy="60" rx="22" ry="26" />
        <ellipse cx="14" cy="34" rx="9" ry="12" />
        <ellipse cx="32" cy="22" rx="9" ry="13" />
        <ellipse cx="55" cy="22" rx="9" ry="13" />
        <ellipse cx="72" cy="34" rx="9" ry="12" />
      </g>
      {/* small paw */}
      <g
        transform="translate(20 95) rotate(18)"
        fill="hsl(var(--v3-brand-700))"
        opacity="0.5"
      >
        <ellipse cx="22" cy="32" rx="12" ry="14" />
        <ellipse cx="8" cy="18" rx="5" ry="6.5" />
        <ellipse cx="18" cy="12" rx="5" ry="7" />
        <ellipse cx="30" cy="12" rx="5" ry="7" />
        <ellipse cx="40" cy="18" rx="5" ry="6.5" />
      </g>
      {/* sparkle dots */}
      <circle cx="180" cy="40" r="3" fill="hsl(var(--v3-accent-prestation))" opacity="0.6" />
      <circle cx="195" cy="60" r="2" fill="hsl(var(--v3-brand-500))" opacity="0.5" />
      <circle cx="170" cy="120" r="2.5" fill="hsl(var(--v3-accent-prestation))" opacity="0.55" />
    </svg>
  );
}
