/**
 * Hook som hanterar tid + animation för 2D-uppspelningen av en bana.
 * Ligger i en egen fil (utan komponenter) för att fast refresh ska fungera.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCoursePath, type CoursePathInput } from "@/features/course-planner-v2/pathSampling";

export const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;
export type Speed = typeof SPEEDS[number];
export const BASE_M_PER_S = 4; // 1× = 4 m/s, endast visualisering

export function useCoursePlayback(course: CoursePathInput, active: boolean) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const path = useMemo(() => buildCoursePath(course), [course]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // Nollställ när uppspelningen stängs — justering under render i stället
  // för en effekt (undviker cascaderande renders).
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setT(0);
      setPlaying(false);
      // lastRef nollställs av raf-effektens cleanup nedan.
    }
  }

  // Tangentbordet ägs av PlannerPage. Tidigare fanns en extra Space-listener
  // här också, vilket kunde toggla play/pause två gånger på samma tangenttryck.

  useEffect(() => {
    if (!active || !playing || path.total === 0) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = (ts - lastRef.current) / 1000;
      lastRef.current = ts;
      const dT = (BASE_M_PER_S * speed * dt) / path.total;
      setT((prev) => {
        const nextT = prev + dT;
        if (nextT >= 1) {
          setPlaying(false);
          return 1;
        }
        return nextT;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [active, playing, speed, path.total]);

  return { t, setT, playing, setPlaying, speed, setSpeed };
}
