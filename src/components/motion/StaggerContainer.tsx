import { motion as fmMotion, type HTMLMotionProps } from "framer-motion";
import { motion } from "@/lib/motion";
import type { ReactNode } from "react";

interface StaggerContainerProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition" | "variants"> {
  children: ReactNode;
  /** Sekunder mellan varje barn. Default motion.stagger.base (60ms) */
  staggerDelay?: number;
  /** Initial delay innan staggern börjar */
  initialDelay?: number;
  /** Triggra på scroll istället för on-mount. Default true */
  whileInView?: boolean;
  /** Spela bara en gång. Default true */
  once?: boolean;
}

/**
 * Container som staggrar fade-in av sina barn.
 * Använd tillsammans med <StaggerItem> för att få timad reveal-sekvens.
 */
export function StaggerContainer({
  children,
  staggerDelay = motion.stagger.base,
  initialDelay = 0,
  whileInView = true,
  once = true,
  ...rest
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

  const animProps = whileInView
    ? {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once, margin: motion.viewport.margin, amount: motion.viewport.amount },
      }
    : {
        initial: "hidden",
        animate: "visible",
      };

  return (
    <fmMotion.div variants={variants} {...animProps} {...rest}>
      {children}
    </fmMotion.div>
  );
}

interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "variants" | "transition"> {
  children: ReactNode;
  /** Pixlar att slida från botten. Default 12 */
  distance?: number;
  /** Duration-token */
  duration?: keyof typeof motion.duration;
}

export function StaggerItem({
  children,
  distance = 12,
  duration = "smooth",
  style,
  ...rest
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
      style={{ willChange: "opacity, transform", ...style }}
      {...rest}
    >
      {children}
    </fmMotion.div>
  );
}
