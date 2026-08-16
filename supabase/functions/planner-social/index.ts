import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Verifierar profil-id + token och returnerar profilen. */
async function authProfile(profileId: unknown, token: unknown) {
  const id = str(profileId, 60);
  const tok = str(token, 60);
  if (!id || !tok) return null;
  const { data } = await supabase
    .from("planner_profiles")
    .select("id, name, edit_token")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.edit_token !== tok) return null;
  return data as { id: string; name: string; edit_token: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }

  const action = str(body.action, 40);

  try {
    // ── Skapa/hämta profil (namn + e-post, inget lösenord) ────────────
    if (action === "profile") {
      const name = str(body.name, 80);
      const email = str(body.email, 255).toLowerCase();
      if (name.length < 2) return json({ error: "Ange ditt namn" }, 400);
      if (!EMAIL_RE.test(email)) return json({ error: "Ange en giltig e-postadress" }, 400);

      const { data: existing } = await supabase
        .from("planner_profiles")
        .select("id, name, edit_token")
        .ilike("email", email)
        .maybeSingle();

      if (existing) {
        if (existing.name !== name) {
          await supabase.from("planner_profiles").update({ name }).eq("id", existing.id);
        }
        return json({ profile: { id: existing.id, name, email, token: existing.edit_token } });
      }

      const { data, error } = await supabase
        .from("planner_profiles")
        .insert({ name, email })
        .select("id, name, edit_token")
        .single();
      if (error) throw error;
      return json({ profile: { id: data.id, name: data.name, email, token: data.edit_token } });
    }

    const profile = await authProfile(body.profileId, body.token);
    if (!profile) return json({ error: "Din profil kunde inte verifieras" }, 401);

    // ── Spara/uppdatera bana ──────────────────────────────────────────
    if (action === "save-course") {
      const name = str(body.name, 120) || "Namnlös bana";
      const sport = str(body.sport, 30) || "agility";
      const isPublic = body.isPublic === true;
      const courseData = body.courseData;
      if (!courseData || typeof courseData !== "object") {
        return json({ error: "Banan saknar data" }, 400);
      }
      const courseId = str(body.courseId, 60);
      const payload = {
        profile_id: profile.id,
        author_name: profile.name,
        name,
        sport,
        course_data: courseData,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      };

      if (courseId) {
        const { data, error } = await supabase
          .from("planner_courses")
          .update(payload)
          .eq("id", courseId)
          .eq("profile_id", profile.id)
          .select("id, is_public")
          .maybeSingle();
        if (error) throw error;
        if (data) return json({ course: data });
      }

      const { data, error } = await supabase
        .from("planner_courses")
        .insert(payload)
        .select("id, is_public")
        .single();
      if (error) throw error;
      return json({ course: data });
    }

    // ── Mina banor ────────────────────────────────────────────────────
    if (action === "my-courses") {
      const { data, error } = await supabase
        .from("planner_courses")
        .select("id, name, sport, is_public, updated_at, course_data")
        .eq("profile_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ courses: data ?? [] });
    }

    // ── Ta bort bana ──────────────────────────────────────────────────
    if (action === "delete-course") {
      const courseId = str(body.courseId, 60);
      if (!courseId) return json({ error: "Bana saknas" }, 400);
      const { error } = await supabase
        .from("planner_courses")
        .delete()
        .eq("id", courseId)
        .eq("profile_id", profile.id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ── Kommentera ────────────────────────────────────────────────────
    if (action === "comment") {
      const courseId = str(body.courseId, 60);
      const text = str(body.body, 1000);
      if (!courseId || text.length < 1) return json({ error: "Skriv en kommentar" }, 400);
      const { data: course } = await supabase
        .from("planner_courses")
        .select("id, is_public, profile_id")
        .eq("id", courseId)
        .maybeSingle();
      if (!course || (!course.is_public && course.profile_id !== profile.id)) {
        return json({ error: "Banan går inte att kommentera" }, 403);
      }
      const { data, error } = await supabase
        .from("planner_course_comments")
        .insert({ course_id: courseId, profile_id: profile.id, author_name: profile.name, body: text })
        .select("id, author_name, body, created_at")
        .single();
      if (error) throw error;
      return json({ comment: data });
    }

    // ── Betygsätt ─────────────────────────────────────────────────────
    if (action === "rate") {
      const courseId = str(body.courseId, 60);
      const rating = Number(body.rating);
      if (!courseId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ error: "Ogiltigt betyg" }, 400);
      }
      const { data: course } = await supabase
        .from("planner_courses")
        .select("id, is_public")
        .eq("id", courseId)
        .maybeSingle();
      if (!course?.is_public) return json({ error: "Banan går inte att betygsätta" }, 403);
      const { error } = await supabase
        .from("planner_course_ratings")
        .upsert(
          { course_id: courseId, profile_id: profile.id, rating },
          { onConflict: "course_id,profile_id" },
        );
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Okänd åtgärd" }, 400);
  } catch (err) {
    console.error("planner-social error", err);
    return json({ error: "Något gick fel" }, 500);
  }
});
