import { useRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { motion as fmMotion } from "framer-motion";
import { motion, prefersReducedMotion } from "@/lib/motion";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  children: ReactNode;
  /** Hur mycket knappen rör sig mot musen (px). Default 6 */
  strength?: number;
  /** Aktiveringsradie (px). Default 100 */
  radius?: number;
}

/**
 * Magnetic button: rör sig subtilt mot musen vid hover på desktop.
 * Inaktiveras vid prefers-reduced-motion och pekskärm.
 */
export function MagneticButton({ children, strength = 6, radius = 100, style, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion()) return;
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      setPos({ x: 0, y: 0 });
      return;
    }
    const factor = (1 - dist / radius) * strength;
    setPos({
      x: (dx / radius) * factor,
      y: (dy / radius) * factor,
    });
  };

  const handleLeave = () => setPos({ x: 0, y: 0 });

  return (
    <fmMotion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 18,
        mass: 0.6,
      }}
      style={{ willChange: "transform", ...style }}
      {...rest}
    >
      {children}
    </fmMotion.button>
  );
}
