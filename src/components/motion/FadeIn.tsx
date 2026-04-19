import { motion as fmMotion } from "framer-motion";
import { motion } from "@/lib/motion";
import type { CSSProperties, ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  distance?: number;
  duration?: keyof typeof motion.duration;
  ease?: keyof typeof motion.ease;
  /** Aktivera scroll-trigger istället för on-mount */
  scroll?: boolean;
  once?: boolean;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article" | "header" | "footer" | "li" | "ul";
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
 * Återanvändbar fade+slide-komponent. SSR-säker.
 */
export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  distance = 8,
  duration = "smooth",
  ease = "out",
  scroll = false,
  once = true,
  className,
  style,
  as = "div",
}: FadeInProps) {
  const offset = offsetFor(direction, distance);
  const Comp = (fmMotion as unknown as Record<string, typeof fmMotion.div>)[as] ?? fmMotion.div;

  const transition = {
    duration: motion.duration[duration],
    delay,
    ease: motion.ease[ease],
  };

  if (scroll) {
    return (
      <Comp
        initial={{ opacity: 0, ...offset }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once, margin: motion.viewport.margin, amount: motion.viewport.amount }}
        transition={transition}
        className={className}
        style={{ willChange: "opacity, transform", ...style }}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={transition}
      className={className}
      style={{ willChange: "opacity, transform", ...style }}
    >
      {children}
    </Comp>
  );
}
