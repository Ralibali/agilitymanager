import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["'Outfit'", "sans-serif"],
        body: ["'Figtree'", "sans-serif"],
        sans: ["'Inter'", "'Figtree'", "sans-serif"],
        // v3 – The Addiction Update
        "v3-sans": ["'Epilogue'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        "v3-display": ["'Urbanist'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        "v3-mono": ["'JetBrains Mono'", "ui-monospace", "monospace"],
        // === Brand foundation (laddas men aktiveras explicit) ===
        // OBS: Vi skriver INTE över `display`/`sans`/`serif` med Geist/Inter Variable/
        // Instrument Serif eftersom det skulle ändra utseendet globalt direkt. Använd
        // `font-brand-display`, `font-brand-sans`, `font-brand-serif` när komponenter
        // ska opt:a in i nya brandet.
        "brand-display": ["Geist", "system-ui", "sans-serif"],
        "brand-sans": ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
        "brand-serif": ["'Instrument Serif'", "Georgia", "serif"],
      },
      fontSize: {
        base: ["14px", "1.5"],
        display: ["32px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "500" }],
        h1: ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "500" }],
        h2: ["16px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "500" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        micro: ["11px", { lineHeight: "1.3", letterSpacing: "0.04em", fontWeight: "500" }],
        // v3 typography scale
        "v3-2xs": ["0.6875rem", { lineHeight: "1.4" }],
        "v3-xs": ["0.75rem", { lineHeight: "1.4" }],
        "v3-sm": ["0.875rem", { lineHeight: "1.5" }],
        "v3-base": ["1rem", { lineHeight: "1.55" }],
        "v3-lg": ["1.0625rem", { lineHeight: "1.55" }],
        "v3-xl": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        "v3-2xl": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.015em" }],
        "v3-3xl": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "v3-4xl": ["2.375rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "v3-5xl": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        "v3-6xl": ["4rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* === Fas 1 designsystem === */
        page: "hsl(var(--bg-page))",
        surface: "hsl(var(--bg-surface))",
        subtle: "hsl(var(--bg-subtle))",
        inverse: "hsl(var(--bg-inverse))",
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-tertiary": "hsl(var(--text-tertiary))",
        "text-on-inverse": "hsl(var(--text-on-inverse))",
        "border-subtle": "hsl(var(--ds-border-subtle) / 0.08)",
        "border-default": "hsl(var(--ds-border-default) / 0.15)",
        "border-strong": "hsl(var(--ds-border-strong) / 0.3)",
        brand: {
          50: "hsl(var(--brand-50))",
          100: "hsl(var(--brand-100))",
          500: "hsl(var(--brand-500))",
          600: "hsl(var(--brand-600))",
          900: "hsl(var(--brand-900))",
        },
        amber: {
          50: "hsl(var(--accent-50-new))",
          500: "hsl(var(--accent-500-new))",
          900: "hsl(var(--accent-900-new))",
        },
        semantic: {
          success: "hsl(var(--semantic-success))",
          warning: "hsl(var(--semantic-warning))",
          danger: "hsl(var(--semantic-danger))",
          info: "hsl(var(--semantic-info))",
        },
        // === v3 – The Addiction Update ===
        v3: {
          canvas: {
            DEFAULT: "hsl(var(--v3-canvas))",
            secondary: "hsl(var(--v3-canvas-secondary))",
            elevated: "hsl(var(--v3-canvas-elevated))",
            sunken: "hsl(var(--v3-canvas-sunken))",
          },
          brand: {
            50: "hsl(var(--v3-brand-50))",
            100: "hsl(var(--v3-brand-100))",
            200: "hsl(var(--v3-brand-200))",
            300: "hsl(var(--v3-brand-300))",
            400: "hsl(var(--v3-brand-400))",
            500: "hsl(var(--v3-brand-500))",
            600: "hsl(var(--v3-brand-600))",
            700: "hsl(var(--v3-brand-700))",
            800: "hsl(var(--v3-brand-800))",
            900: "hsl(var(--v3-brand-900))",
          },
          text: {
            primary: "hsl(var(--v3-text-primary))",
            secondary: "hsl(var(--v3-text-secondary))",
            tertiary: "hsl(var(--v3-text-tertiary))",
            inverse: "hsl(var(--v3-text-inverse))",
          },
          accent: {
            tavlings: "hsl(var(--v3-accent-tavlings))",
            traning: "hsl(var(--v3-accent-traning))",
            prestation: "hsl(var(--v3-accent-prestation))",
            halsa: "hsl(var(--v3-accent-halsa))",
            // Mörkare textvarianter för läsbarhet mot accent/10-bakgrund
            "tavlings-text":    "hsl(var(--v3-accent-tavlings-text))",
            "traning-text":     "hsl(var(--v3-accent-traning-text))",
            "prestation-text":  "hsl(var(--v3-accent-prestation-text))",
            "halsa-text":       "hsl(var(--v3-accent-halsa-text))",
          },
          success: "hsl(var(--v3-success))",
          warning: "hsl(var(--v3-warning))",
          error: "hsl(var(--v3-error))",
          info: "hsl(var(--v3-info))",
        },
        // === Brand foundation (CSS-var-baserade så de cascade:ar i dark mode) ===
        // Värden definieras i src/index.css under :root och .dark.
        // Original "Varm Sand" bevaras i light. I dark mappas de till slate+amber-paletten.
        bone: "hsl(var(--bf-bone))",
        "bone-2": "hsl(var(--bf-bone-2))",
        cream: "hsl(var(--bf-cream))",
        forest: "hsl(var(--bf-forest))",
        "forest-soft": "hsl(var(--bf-forest-soft))",
        moss: "hsl(var(--bf-moss))",
        "moss-deep": "hsl(var(--bf-moss-deep))",
        lime: "hsl(var(--bf-lime))",
        coral: "hsl(var(--bf-coral))",
        stone: "hsl(var(--bf-stone))",
        // === Slate-skala (rebrand-paletten, alltid tillgänglig) ===
        slate: {
          50: "hsl(var(--slate-50))",
          100: "hsl(var(--slate-100))",
          200: "hsl(var(--slate-200))",
          300: "hsl(var(--slate-300))",
          400: "hsl(var(--slate-400))",
          500: "hsl(var(--slate-500))",
          600: "hsl(var(--slate-600))",
          700: "hsl(var(--slate-700))",
          800: "hsl(var(--slate-800))",
          900: "hsl(var(--slate-900))",
          950: "hsl(var(--slate-950))",
        },
        cyan: {
          300: "hsl(var(--cyan-300))",
          500: "hsl(var(--cyan-500))",
          600: "hsl(var(--cyan-600))",
        },
        // amber redan definierat ovan (50/500/900). Utöka med fler stops via vars.
        "amber-100": "hsl(var(--amber-100))",
        "amber-300": "hsl(var(--amber-300))",
        "amber-600": "hsl(var(--amber-600))",
        "amber-700": "hsl(var(--amber-700))",
        "coral-400": "hsl(var(--coral-400))",
        "coral-500": "hsl(var(--coral-500))",
        "emerald-500": "hsl(var(--emerald-500))",
      },
      borderRadius: {
        lg: "var(--radius-card)",
        md: "var(--radius-button)",
        sm: "var(--radius-sm)",
        pill: "var(--radius-pill)",
        // Brand foundation: full pill (9999px). Befintlig `pill` (≈40px) lämnas orörd
        // för att inte ändra utseendet på befintliga komponenter.
        "pill-full": "9999px",
        "ds-sm": "var(--r-sm)",
        "ds-md": "var(--r-md)",
        "ds-lg": "var(--r-lg)",
        // v3
        "v3-sm": "0.375rem",
        "v3-base": "0.625rem",
        "v3-lg": "0.875rem",
        "v3-xl": "1.125rem",
        "v3-2xl": "1.5rem",
      },
      boxShadow: {
        "v3-xs": "0 1px 2px rgba(26, 29, 27, 0.04)",
        "v3-sm": "0 2px 4px rgba(26, 29, 27, 0.06), 0 1px 2px rgba(26, 29, 27, 0.04)",
        "v3-base": "0 4px 8px rgba(26, 29, 27, 0.06), 0 2px 4px rgba(26, 29, 27, 0.04)",
        "v3-lg": "0 8px 16px rgba(26, 29, 27, 0.08), 0 4px 8px rgba(26, 29, 27, 0.04)",
        "v3-xl": "0 16px 32px rgba(26, 29, 27, 0.1), 0 8px 16px rgba(26, 29, 27, 0.06)",
        "v3-inner": "inset 0 1px 2px rgba(26, 29, 27, 0.06)",
        "v3-brand": "0 8px 24px rgba(63, 143, 85, 0.25)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "v3-fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "v3-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "v3-sheet-in": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "v3-scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "v3-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "v3-fade-up": "v3-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "v3-fade-in": "v3-fade-in 0.4s ease-out both",
        "v3-sheet-in": "v3-sheet-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        "v3-scale-in": "v3-scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        "v3-shimmer": "v3-shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
