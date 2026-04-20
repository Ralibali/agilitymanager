import { ReactNode } from "react";
import { motion } from "framer-motion";
import { motion as M, prefersReducedMotion } from "@/lib/motion";

/**
 * Lättviktig page-transition wrapper för publika rutter.
 * Fade + 8px slide-up från botten. Respekterar prefers-reduced-motion.
 *
 * Används direkt i en <Route element={<PageTransition>...</PageTransition>}>
 * eller manuellt runt en sidas root.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = prefersReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: M.duration.smooth,
        ease: M.ease.out,
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
