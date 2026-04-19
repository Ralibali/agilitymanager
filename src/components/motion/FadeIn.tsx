import { motion as fmMotion, type HTMLMotionProps } from "framer-motion";
import { motion } from "@/lib/motion";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition"> {
  children: ReactNode;
  /** Delay i sekunder */
  delay?: number;
  /** Riktning för slide. Default "up" */
  direction?: Direction;
  /** Pixlar för slide-distans. Default 8 */
  distance?: number;
  /** Duration-token. Default "smooth" (360ms) */
  duration?: keyof typeof motion.duration;
  /** Easing-token. Default "out" */
  ease?: keyof typeof motion.ease;
  /** Aktivera scroll-trigger istället för on-mount. Default false */
  whileInView?: boolean;
  /** Spela bara en gång. Default true */
  once?: boolean;
}

const offsetFor = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
    default:
      return {};
  }
};

/**
 * Återanvändbar fade+slide-komponent.
 * SSR-säker: Innehåll renderas alltid; bara opacity/transform animeras klient-side.
 */
export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  distance = 8,
  duration = "smooth",
  ease = "out",
  whileInView = false,
  once = true,
  style,
  ...rest
}: FadeInProps) {
  const offset = offsetFor(direction, distance);

  const animProps = whileInView
    ? {
        initial: { opacity: 0, ...offset },
        whileInView: { opacity: 1, x: 0, y: 0 },
        viewport: { once, margin: motion.viewport.margin, amount: motion.viewport.amount },
      }
    : {
        initial: { opacity: 0, ...offset },
        animate: { opacity: 1, x: 0, y: 0 },
      };

  return (
    <fmMotion.div
      {...animProps}
      transition={{
        duration: motion.duration[duration],
        delay,
        ease: motion.ease[ease],
      }}
      style={{ willChange: "opacity, transform", ...style }}
      {...rest}
    >
      {children}
    </fmMotion.div>
  );
}
