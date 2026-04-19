/**
 * AgilityManager – The Addiction Update
 * Fas 1: Designsystem-tokens (single source of truth).
 *
 * Filosofi: Varm, lugn, självsäker. Inter + Instrument Serif.
 * Aldrig weight 700+. Aldrig hårdkodade färger i komponenter.
 * Tokens speglas i Tailwind (tailwind.config.ts) och CSS-variabler (index.css).
 */

export const tokens = {
  colors: {
    // Canvas – grundlager
    canvas: {
      primary: "#FAFAF7", // varm sand
      secondary: "#F5F4EF", // sektionsbg
      elevated: "#FFFFFF", // kort, modaler
      sunken: "#EFEDE6", // inputs, disabled
    },
    // Brand – varm grön
    brand: {
      50: "#F0F7F1",
      100: "#DCEDE0",
      200: "#B8DCC1",
      300: "#8EC69C",
      400: "#63AC76",
      500: "#3F8F55", // primär
      600: "#2D6E3F",
      700: "#245833",
      800: "#1E4529",
      900: "#183621",
    },
    // Text
    text: {
      primary: "#1A1D1B",
      secondary: "#5B615D",
      tertiary: "#8A8F8B",
      inverse: "#FAFAF7",
    },
    // Semantik
    semantic: {
      success: "#3F8F55",
      warning: "#D97706",
      error: "#DC2626",
      info: "#0891B2",
    },
    // Accent per domän
    accent: {
      tavlings: "#7C3AED", // tävlingar
      traning: "#0891B2", // träning
      prestation: "#D97706", // milestones
      halsa: "#DC2626", // hälsa/skador
    },
  },
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "'Instrument Serif', Georgia, serif",
      mono: "'JetBrains Mono', ui-monospace, monospace",
    },
    scale: {
      "2xs": "0.6875rem",
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.0625rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.375rem",
      "5xl": "3rem",
      "6xl": "4rem",
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
    },
    letterSpacing: {
      tight: "-0.02em",
      normal: "0",
      wide: "0.05em",
    },
  },
  spacing: {
    0: "0",
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
  },
  radius: {
    none: "0",
    sm: "0.375rem",
    base: "0.625rem",
    lg: "0.875rem",
    xl: "1.125rem",
    "2xl": "1.5rem",
    full: "9999px",
  },
  shadow: {
    xs: "0 1px 2px rgba(26, 29, 27, 0.04)",
    sm: "0 2px 4px rgba(26, 29, 27, 0.06), 0 1px 2px rgba(26, 29, 27, 0.04)",
    base: "0 4px 8px rgba(26, 29, 27, 0.06), 0 2px 4px rgba(26, 29, 27, 0.04)",
    lg: "0 8px 16px rgba(26, 29, 27, 0.08), 0 4px 8px rgba(26, 29, 27, 0.04)",
    xl: "0 16px 32px rgba(26, 29, 27, 0.1), 0 8px 16px rgba(26, 29, 27, 0.06)",
    inner: "inset 0 1px 2px rgba(26, 29, 27, 0.06)",
    brand: "0 8px 24px rgba(63, 143, 85, 0.25)",
  },
  motion: {
    duration: {
      instant: "100ms",
      fast: "180ms",
      base: "240ms",
      slow: "360ms",
      slower: "520ms",
    },
    easing: {
      smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      snap: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      exit: "cubic-bezier(0.4, 0, 1, 1)",
      enter: "cubic-bezier(0, 0, 0.2, 1)",
    },
  },
} as const;

export type DesignTokens = typeof tokens;
