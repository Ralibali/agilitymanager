/**
 * AgilityManager – Motion system
 * Single source of truth för alla durations, easings, staggers och viewports.
 * Använd ALLTID dessa tokens. Aldrig hårdkodad duration eller easing.
 */

export const motion = {
  duration: {
    instant: 0.1,
    fast: 0.18,
    base: 0.24,
    smooth: 0.36,
    slow: 0.52,
    languid: 0.8,
  },
  ease: {
    smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
    snap: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
    spring: [0.16, 1, 0.3, 1] as [number, number, number, number],
    out: [0.16, 1, 0.3, 1] as [number, number, number, number],
    in: [0.5, 0, 0.75, 0] as [number, number, number, number],
    anticipate: [0.68, -0.6, 0.32, 1.6] as [number, number, number, number],
  },
  stagger: {
    tight: 0.03,
    base: 0.06,
    loose: 0.12,
    dramatic: 0.2,
  },
  viewport: {
    once: true,
    margin: "-10% 0px" as const,
    amount: 0.2,
  },
} as const;

/** Hjälpare: Standard fade+slide-up variants */
export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
} as const;

/** Standard scale-in (för CTA, kort) */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
} as const;

/** Detect prefers-reduced-motion på klient */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
