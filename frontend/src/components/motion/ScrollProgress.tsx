import { motion as fmotion, useScroll, useSpring } from "framer-motion";

/**
 * Tunn progress-bar fixerad högst upp som speglar scroll-position
 * på dokumentet. Spring-smoothing för naturlig rörelse.
 * Respekterar prefers-reduced-motion via global CSS-guard.
 */
export function ScrollProgress({
  className = "",
}: {
  className?: string;
}) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 24,
    mass: 0.4,
    restDelta: 0.001,
  });

  return (
    <fmotion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className={
        "fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-primary " +
        className
      }
    />
  );
}
