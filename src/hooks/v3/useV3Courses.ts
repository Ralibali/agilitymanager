import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface V3Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  long_description: string;
  price_sek: number;
  discounted_price_sek: number | null;
  instructor_name: string;
  instructor_bio: string;
  partner_name: string;
  partner_url: string;
  image_url: string | null;
  trailer_url: string | null;
  category: string;
}

export interface V3SavedCourse {
  id: string;
  name: string;
  description: string;
  updated_at: string;
  canvas_width: number;
  canvas_height: number;
}

export interface V3DogSummary {
  sport: "Agility" | "Hoopers" | "Båda";
  competition_level: "Nollklass" | "K1" | "K2" | "K3";
  hoopers_level: "Startklass" | "Klass 1" | "Klass 2" | "Klass 3";
  is_active_competition_dog: boolean;
}

interface State {
  courses: V3Course[];
  saved: V3SavedCourse[];
  purchases: Set<string>;
  dogs: V3DogSummary[];
  loading: boolean;
}

const initial: State = {
  courses: [],
  saved: [],
  purchases: new Set(),
  dogs: [],
  loading: true,
};

/**
 * v3-hook: hämtar kursarkiv, sparade banor, köp och en kompakt hund-summering
 * (för rekommendationer). Allt parallellt så att skelettet bara visas en gång.
 */
export function useV3Courses() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(initial);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));

    const [coursesRes, savedRes, purchasesRes, dogsRes] = await Promise.all([
      supabase
        .from("courses")
        .select(
          "id, title, slug, description, long_description, price_sek, discounted_price_sek, instructor_name, instructor_bio, partner_name, partner_url, image_url, trailer_url, category",
        )
        .eq("published", true)
        .order("created_at", { ascending: false }),
      user
        ? supabase
            .from("saved_courses")
            .select("id, name, description, updated_at, canvas_width, canvas_height")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] as V3SavedCourse[], error: null }),
      user
        ? supabase
            .from("course_purchases")
            .select("course_id, status")
            .eq("user_id", user.id)
            .eq("status", "completed")
        : Promise.resolve({ data: [] as { course_id: string; status: string }[], error: null }),
      user
        ? supabase
            .from("dogs")
            .select("sport, competition_level, hoopers_level, is_active_competition_dog")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as V3DogSummary[], error: null }),
    ]);

    setState({
      loading: false,
      courses: (coursesRes.data ?? []) as V3Course[],
      saved: (savedRes.data ?? []) as V3SavedCourse[],
      purchases: new Set(((purchasesRes.data ?? []) as { course_id: string }[]).map((p) => p.course_id)),
      dogs: (dogsRes.data ?? []) as V3DogSummary[],
    });
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteSaved = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("saved_courses").delete().eq("id", id);
      if (error) throw error;
      setState((s) => ({ ...s, saved: s.saved.filter((c) => c.id !== id) }));
    },
    [],
  );

  return { ...state, reload: load, deleteSaved };
}

/**
 * Bygger en kort, läsbar rekommendationslista baserat på hundarnas
 * sport och nivå. Maxar 3 träffar och hoppar över redan köpta kurser.
 */
export function useV3CourseRecommendations(courses: V3Course[], dogs: V3DogSummary[], purchases: Set<string>) {
  return useMemo(() => {
    if (!courses.length || !dogs.length) return { items: [] as V3Course[], reason: "" };

    const sportWeight: Record<"Agility" | "Hoopers", number> = { Agility: 0, Hoopers: 0 };
    let beginner = 0;
    let advanced = 0;

    for (const d of dogs) {
      const w = d.is_active_competition_dog ? 2 : 1;
      if (d.sport === "Agility" || d.sport === "Båda") sportWeight.Agility += w;
      if (d.sport === "Hoopers" || d.sport === "Båda") sportWeight.Hoopers += w;
      if (d.sport === "Hoopers") {
        if (d.hoopers_level === "Startklass" || d.hoopers_level === "Klass 1") beginner++;
        else advanced++;
      } else if (d.competition_level === "Nollklass" || d.competition_level === "K1") {
        beginner++;
      } else {
        advanced++;
      }
    }

    const preferred =
      sportWeight.Hoopers > sportWeight.Agility
        ? "hoopers"
        : sportWeight.Agility > sportWeight.Hoopers
          ? "agility"
          : null;
    const beginnerHeavy = beginner >= advanced;

    const scored = courses
      .filter((c) => !purchases.has(c.id))
      .map((c) => {
        let score = 0;
        const cat = c.category.toLowerCase();
        if (preferred && cat === preferred) score += 3;
        if (cat === "grundträning") score += beginnerHeavy ? 2 : 0.5;
        const text = `${c.title} ${c.description}`.toLowerCase();
        if (beginnerHeavy && /(nyböj|grund|start|introduk|nollklass)/.test(text)) score += 1;
        if (!beginnerHeavy && /(avancer|k2|k3|klass\s*2|klass\s*3|tävling)/.test(text)) score += 1;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.c);

    const reason = [
      preferred === "hoopers" ? "Hoopers" : preferred === "agility" ? "Agility" : "Blandat",
      beginnerHeavy ? "nybörjarvänligt" : "tävlingsnivå",
    ].join(" · ");

    return { items: scored, reason };
  }, [courses, dogs, purchases]);
}
