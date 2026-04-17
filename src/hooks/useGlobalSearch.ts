import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_GROUPS } from "@/components/layout/navConfig";
import { blogPosts } from "@/lib/blogData";

export type SearchResultGroup =
  | "Sidor"
  | "Hundar"
  | "Tävlingar"
  | "Resultat"
  | "Träning"
  | "Klubbar"
  | "Banor"
  | "Kompisar"
  | "Blogg";

export interface SearchResult {
  id: string;
  group: SearchResultGroup;
  title: string;
  subtitle?: string;
  path: string;
  keywords?: string;
}

interface State {
  results: SearchResult[];
  loading: boolean;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();

/** Söker parallellt över alla användarens entiteter + statiska sidor/blogg. */
export function useGlobalSearch(query: string): State {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ results: [], loading: false });

  useEffect(() => {
    const q = query.trim();

    // Tom query → visa bara sidor (nav-shortcuts) som "snabbåtkomst"
    if (!q) {
      setState({ results: buildPageResults(""), loading: false });
      return;
    }

    if (!user) {
      setState({
        results: [...buildPageResults(q), ...buildBlogResults(q)],
        loading: false,
      });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    const t = window.setTimeout(async () => {
      const like = `%${q}%`;
      const [dogs, planned, results, sessions, clubs, courses, friendships, profiles] =
        await Promise.all([
          supabase
            .from("dogs")
            .select("id, name, breed")
            .eq("user_id", user.id)
            .or(`name.ilike.${like},breed.ilike.${like}`)
            .limit(8),
          supabase
            .from("planned_competitions")
            .select("id, event_name, location, date")
            .eq("user_id", user.id)
            .or(`event_name.ilike.${like},location.ilike.${like}`)
            .limit(8),
          supabase
            .from("competition_results")
            .select("id, event_name, date, placement, sport")
            .eq("user_id", user.id)
            .ilike("event_name", like)
            .limit(8),
          supabase
            .from("training_sessions")
            .select("id, type, location, date, sport")
            .eq("user_id", user.id)
            .or(`location.ilike.${like},notes_good.ilike.${like},notes_improve.ilike.${like}`)
            .limit(8),
          supabase
            .from("clubs")
            .select("id, name, city")
            .or(`name.ilike.${like},city.ilike.${like}`)
            .limit(8),
          supabase
            .from("saved_courses")
            .select("id, name, description")
            .eq("user_id", user.id)
            .or(`name.ilike.${like},description.ilike.${like}`)
            .limit(8),
          supabase
            .from("friendships")
            .select("requester_id, receiver_id")
            .eq("status", "accepted")
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
          // profiles separat – behöver alla synliga för matchning
          supabase
            .from("profiles")
            .select("user_id, display_name")
            .ilike("display_name", like)
            .limit(20),
        ]);

      if (cancelled) return;

      const out: SearchResult[] = [];

      out.push(...buildPageResults(q));

      (dogs.data ?? []).forEach((d) =>
        out.push({
          id: `dog-${d.id}`,
          group: "Hundar",
          title: d.name,
          subtitle: d.breed || undefined,
          path: "/dogs",
        }),
      );

      (planned.data ?? []).forEach((c) =>
        out.push({
          id: `plan-${c.id}`,
          group: "Tävlingar",
          title: c.event_name,
          subtitle: [formatDate(c.date), c.location].filter(Boolean).join(" · "),
          path: "/app/competition",
        }),
      );

      (results.data ?? []).forEach((r) =>
        out.push({
          id: `res-${r.id}`,
          group: "Resultat",
          title: r.event_name,
          subtitle: [
            formatDate(r.date),
            r.sport,
            r.placement ? `Placering ${r.placement}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          path: "/app/competition",
        }),
      );

      (sessions.data ?? []).forEach((s) =>
        out.push({
          id: `train-${s.id}`,
          group: "Träning",
          title: `${s.type ?? "Träning"} – ${formatDate(s.date)}`,
          subtitle: [s.sport, s.location].filter(Boolean).join(" · ") || undefined,
          path: "/training",
        }),
      );

      (clubs.data ?? []).forEach((c) =>
        out.push({
          id: `club-${c.id}`,
          group: "Klubbar",
          title: c.name,
          subtitle: c.city || undefined,
          path: "/app/clubs",
        }),
      );

      (courses.data ?? []).forEach((c) =>
        out.push({
          id: `course-${c.id}`,
          group: "Banor",
          title: c.name,
          subtitle: c.description || undefined,
          path: "/course-planner",
        }),
      );

      // Begränsa profil-träffar till accepterade vänner
      const friendIds = new Set<string>();
      (friendships.data ?? []).forEach((f) => {
        const other = f.requester_id === user.id ? f.receiver_id : f.requester_id;
        if (other) friendIds.add(other);
      });
      (profiles.data ?? [])
        .filter((p) => friendIds.has(p.user_id))
        .slice(0, 8)
        .forEach((p) =>
          out.push({
            id: `friend-${p.user_id}`,
            group: "Kompisar",
            title: p.display_name ?? "Okänd",
            path: `/friend-stats/${p.user_id}`,
          }),
        );

      out.push(...buildBlogResults(q));

      setState({ results: out, loading: false });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, user]);

  return state;
}

function buildPageResults(q: string): SearchResult[] {
  const all: SearchResult[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.adminOnly) continue;
      all.push({
        id: `nav-${item.path}`,
        group: "Sidor",
        title: item.label,
        subtitle: group.label,
        path: item.path,
        keywords: `${group.label} ${item.label}`,
      });
    }
  }
  if (!q) return all.slice(0, 6);
  const nq = q.toLowerCase();
  return all.filter(
    (r) => norm(r.title).includes(nq) || norm(r.keywords).includes(nq),
  );
}

function buildBlogResults(q: string): SearchResult[] {
  if (!q) return [];
  const nq = q.toLowerCase();
  return blogPosts
    .filter(
      (p) =>
        p.title.toLowerCase().includes(nq) ||
        p.excerpt.toLowerCase().includes(nq) ||
        p.category.toLowerCase().includes(nq),
    )
    .slice(0, 6)
    .map((p) => ({
      id: `blog-${p.slug}`,
      group: "Blogg" as const,
      title: p.title,
      subtitle: p.category,
      path: `/blogg/${p.slug}`,
    }));
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
