import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Milestone = {
  id: string;
  emoji: string;
  title: string;
  meta: string;
  date: string | null; // ISO eller null för icke-datumbaserade
  achieved: boolean;
};

/**
 * v3 Milstolpar – hämtar all-time data per hund och beräknar bedrifter.
 * Speglar V2:s "Milstolpar"-tab i Stats.
 */
export function useV3Milestones(dogId: string | null) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dogId) {
      setMilestones([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const [{ data: comps }, { data: sessions }] = await Promise.all([
        supabase
          .from("competition_results")
          .select("date, event_name, discipline, faults, passed, disqualified, placement, course_length_m")
          .eq("dog_id", dogId)
          .order("date", { ascending: true }),
        supabase
          .from("training_sessions")
          .select("date")
          .eq("dog_id", dogId),
      ]);

      if (cancelled) return;

      const list: Milestone[] = [];
      const c = comps ?? [];
      const s = sessions ?? [];

      // Första nollrundan
      const firstClean = c.find((x) => x.passed && (x.faults ?? 0) === 0 && !x.disqualified);
      if (firstClean) {
        list.push({
          id: "first-clean",
          emoji: "🎯",
          title: "Första nollrundan",
          meta: `${firstClean.event_name} · ${firstClean.discipline}`,
          date: firstClean.date,
          achieved: true,
        });
      }

      // Första segern
      const firstWin = c.find((x) => x.placement === 1);
      if (firstWin) {
        list.push({
          id: "first-win",
          emoji: "🏆",
          title: "Första segern",
          meta: `${firstWin.event_name} · ${firstWin.discipline}`,
          date: firstWin.date,
          achieved: true,
        });
      }

      // Första pallplatsen
      const firstPodium = c.find((x) => x.placement != null && x.placement >= 1 && x.placement <= 3);
      if (firstPodium && firstPodium !== firstWin) {
        list.push({
          id: "first-podium",
          emoji: "🥇",
          title: "Första pallplatsen",
          meta: `${firstPodium.event_name} · plats ${firstPodium.placement}`,
          date: firstPodium.date,
          achieved: true,
        });
      }

      // Nollrundor-thresholds
      const cleanRuns = c.filter((x) => x.passed && (x.faults ?? 0) === 0 && !x.disqualified);
      [10, 25, 50, 100].forEach((t) => {
        if (cleanRuns.length >= t) {
          list.push({
            id: `clean-${t}`,
            emoji: t >= 50 ? "💎" : "✨",
            title: `${t} nollrundor`,
            meta: "Konsekvens lönar sig",
            date: cleanRuns[t - 1]?.date ?? null,
            achieved: true,
          });
        }
      });

      // Träningspass-thresholds
      [10, 50, 100, 250, 500].forEach((t) => {
        if (s.length >= t) {
          list.push({
            id: `train-${t}`,
            emoji: t >= 250 ? "🔥" : "💪",
            title: `${t} träningspass`,
            meta: "Disciplin = utveckling",
            date: null,
            achieved: true,
          });
        }
      });

      // Total banlängd
      const totalKm =
        c.filter((x) => x.course_length_m).reduce((acc, x) => acc + Number(x.course_length_m), 0) / 1000;
      if (totalKm >= 1) {
        list.push({
          id: "total-km",
          emoji: "📏",
          title: `${totalKm.toFixed(1)} km i tävling`,
          meta: "Total banlängd",
          date: null,
          achieved: true,
        });
      }

      // Starter-thresholds
      [1, 10, 25, 50, 100].forEach((t) => {
        if (c.length >= t) {
          list.push({
            id: `starts-${t}`,
            emoji: t === 1 ? "🚀" : "⭐",
            title: t === 1 ? "Första starten" : `${t} starter`,
            meta: t === 1 ? "Resan börjar" : "Erfarenhet byggs",
            date: t === 1 ? c[0]?.date ?? null : null,
            achieved: true,
          });
        }
      });

      setMilestones(list);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [dogId]);

  return { milestones, loading };
}
