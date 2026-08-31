import { createClient } from "npm:@supabase/supabase-js@2.109.0";

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

/** Hela request-body får aldrig överstiga detta (före och efter JSON-parse). */
const MAX_BODY_CHARS = 300_000;
/** Defensiva gränser — speglar src/lib/courseSafety.ts på klienten. */
const ARENA_MIN_M = 5;
const ARENA_MAX_M = 200;
const MAX_OBSTACLES = 500;
const VALID_SIZE_CLASSES = new Set(["XS", "S", "M", "L", "XL"]);
const TYPE_RE = /^[a-z0-9_-]{1,40}$/;
const ID_RE = /^[a-zA-Z0-9_-]{1,60}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/g;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_CHARS_RE, "").trim().slice(0, max);
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Bygger upp course_data fält för fält. Okända fält, extrema arena-mått,
 * ogiltiga hindertyper och extrema koordinater når aldrig databasen —
 * annars kan en enda publik bana krascha alla klienters rendering (H1).
 */
function sanitizeCourseData(input: Record<string, unknown>): Record<string, unknown> {
  const arenaWidthM = clampNum(input.arenaWidthM, ARENA_MIN_M, ARENA_MAX_M, 30);
  const arenaHeightM = clampNum(input.arenaHeightM, ARENA_MIN_M, ARENA_MAX_M, 40);

  const data: Record<string, unknown> = {
    version: 2,
    sport: input.sport === "hoopers" ? "hoopers" : "agility",
    sizeClass: VALID_SIZE_CLASSES.has(input.sizeClass as string) ? input.sizeClass : "L",
    arenaWidthM,
    arenaHeightM,
    classTemplate: null as string | null,
    obstacles: [] as Record<string, unknown>[],
  };

  if (typeof input.classTemplate === "string" && TYPE_RE.test(input.classTemplate)) {
    data.classTemplate = input.classTemplate;
  }
  if (typeof input.ruleSetId === "string" && ID_RE.test(input.ruleSetId)) {
    data.ruleSetId = input.ruleSetId;
  }
  const courseName = cleanText(input.name, 120);
  if (courseName) data.name = courseName;

  const rawObstacles = Array.isArray(input.obstacles) ? input.obstacles.slice(0, MAX_OBSTACLES) : [];
  const obstacles: Record<string, unknown>[] = [];
  for (let i = 0; i < rawObstacles.length; i++) {
    const raw = rawObstacles[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.type !== "string" || !TYPE_RE.test(r.type)) continue;

    const ob: Record<string, unknown> = {
      id: cleanText(r.id, 64) || `ob-${i}`,
      type: r.type,
      x: clampNum(r.x, 0, arenaWidthM, arenaWidthM / 2),
      y: clampNum(r.y, 0, arenaHeightM, arenaHeightM / 2),
      rotation: clampNum(r.rotation, -360, 360, 0),
    };
    if (typeof r.number === "number" && Number.isFinite(r.number) && r.number > 0) {
      ob.number = Math.min(999, Math.round(r.number));
    }
    if (typeof r.curveDeg === "number" && Number.isFinite(r.curveDeg)) {
      ob.curveDeg = clampNum(r.curveDeg, 0, 90, 0);
    }
    if (r.curveSide === "left" || r.curveSide === "right") ob.curveSide = r.curveSide;
    if (r.locked === true) ob.locked = true;
    if (typeof r.zIndex === "number" && Number.isFinite(r.zIndex)) {
      ob.zIndex = Math.round(clampNum(r.zIndex, -1000, 1000, 0));
    }
    obstacles.push(ob);
  }
  data.obstacles = obstacles;
  return data;
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

  // Pre-parse guard: avvisa överdimensionerade requests innan de laddas i minnet.
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_CHARS) {
    return json({ error: "Förfrågan är för stor" }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }
  // Post-parse guard: content-length kan saknas eller ljuga.
  let bodySize = 0;
  try {
    bodySize = JSON.stringify(body).length;
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }
  if (bodySize > MAX_BODY_CHARS) {
    return json({ error: "Förfrågan är för stor" }, 413);
  }

  const action = str(body.action, 40);

  try {
    // ── Skapa/hämta profil (namn + e-post, inget lösenord) ────────────
    if (action === "profile") {
      const name = str(body.name, 80);
      const email = str(body.email, 255).toLowerCase();
      const presentedToken = str(body.token, 60);
      if (name.length < 2) return json({ error: "Ange ditt namn" }, 400);
      if (!EMAIL_RE.test(email)) return json({ error: "Ange en giltig e-postadress" }, 400);

      const { data: existing } = await supabase
        .from("planner_profiles")
        .select("id, name, edit_token")
        // E-post lagras alltid nerskalad (lowercase) vid insert — exakt matchning
        // räcker och undviker att ilike tolkar %/_ i adressen som wildcards.
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        // Viktigt: e-postadressen i sig är inte autentisering. Tidigare returnerades
        // edit_token till vem som helst som kände till adressen, vilket gav full
        // redigeringsåtkomst till profilens banor. En befintlig profil får bara
        // återanvändas om klienten redan kan bevisa innehav av dess token.
        if (!presentedToken || presentedToken !== existing.edit_token) {
          return json({
            error:
              "Det finns redan en profil med den e-postadressen. Av säkerhetsskäl kan den inte återställas enbart via e-post. Använd den webbläsare där profilen skapades.",
          });
        }
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
      const rawSport = str(body.sport, 30);
      const sport = rawSport === "hoopers" ? "hoopers" : "agility";
      const isPublic = body.isPublic === true;
      const rawCourseData = body.courseData;
      if (!rawCourseData || typeof rawCourseData !== "object" || Array.isArray(rawCourseData)) {
        return json({ error: "Banan saknar data" }, 400);
      }
      // H1: sanera fält för fält — arena-mått klampas till 5–200 m, hinder
      // till max 500 med koordinater inom arenan. Annars kan en enda publik
      // bana lagra t.ex. arenaWidthM: 1e12 och krascha alla klienters
      // grid-rendering (stored oautentiserad DoS).
      const courseData = sanitizeCourseData(rawCourseData as Record<string, unknown>);
      // Skydd mot överdimensionerade payloads (lagrings- och läskostnad).
      let dataSize = 0;
      try {
        dataSize = JSON.stringify(courseData).length;
      } catch {
        return json({ error: "Banans data går inte att lagra" }, 400);
      }
      if (dataSize > 200_000) {
        return json({ error: "Banan är för stor för att sparas" }, 413);
      }
      if ((courseData.obstacles as unknown[]).length === 0) {
        return json({ error: "Banan har inga giltiga hinder" }, 400);
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