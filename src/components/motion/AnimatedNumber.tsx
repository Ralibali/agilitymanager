import { useEffect, useRef, useState } from "react";
import { motion as motionTokens } from "@/lib/motion";

/**
 * Animerar en talrullning mellan föregående och nytt värde.
 * Trigger: vid varje value-ändring (i motsats till CountUp som bara
 * triggar vid mount/inView). Respekterar prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  duration = motionTokens.duration.slow,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const ms = duration * 1000;
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString("sv-SE")}</span>;
}
