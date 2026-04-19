import { motion as fmMotion } from "framer-motion";
import { motion } from "@/lib/motion";
import type { CSSProperties, ReactNode } from "react";

interface StaggerContainerProps {
  children: ReactNode;
  /** Sekunder mellan varje barn. Default motion.stagger.base (60ms) */
  staggerDelay?: number;
  /** Initial delay innan staggern börjar */
  initialDelay?: number;
  /** Triggra på scroll istället för on-mount. Default true */
  scroll?: boolean;
  /** Spela bara en gång. Default true */
  once?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Container som staggrar fade-in av sina barn.
 * Använd tillsammans med <StaggerItem>.
 */
export function StaggerContainer({
  children,
  staggerDelay = motion.stagger.base,
  initialDelay = 0,
  scroll = true,
  once = true,
  className,
  style,
}: StaggerContainerProps) {
  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  if (scroll) {
    return (
      <fmMotion.div
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: motion.viewport.margin, amount: motion.viewport.amount }}
        className={className}
        style={style}
      >
        {children}
      </fmMotion.div>
    );
  }

  return (
    <fmMotion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </fmMotion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  distance?: number;
  duration?: keyof typeof motion.duration;
  className?: string;
  style?: CSSProperties;
}

export function StaggerItem({
  children,
  distance = 12,
  duration = "smooth",
  className,
  style,
}: StaggerItemProps) {
  const variants = {
    hidden: { opacity: 0, y: distance },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <fmMotion.div
      variants={variants}
      transition={{
        duration: motion.duration[duration],
        ease: motion.ease.out,
      }}
      className={className}
      style={{ willChange: "opacity, transform", ...style }}
    >
      {children}
    </fmMotion.div>
  );
}
