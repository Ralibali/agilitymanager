// Raderar den inloggade användarens konto permanent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { requireAuth, sharedCors } from "../_shared/auth.ts";

// Barn-tabeller först, sedan föräldrar.
const USER_TABLES = [
  "training_milestones",
  "training_goals",
  "competition_reminders",
  "planned_competitions",
  "planned_training",
  "competition_results",
  "training_sessions",
  "stopwatch_results",
  "health_logs",
  "cached_dog_results",
  "achievements",
  "coach_feedback",
  "competition_interests",
  "competition_log",
  "notifications",
  "support_tickets",
  "club_event_signups",
  "club_group_members",
  "club_posts",
  "club_events",
  "club_members",
  "course_purchases",
  "course_comments",
  "saved_courses",
  "signup_sources",
  "dogs",
  "user_roles",
  "profiles",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: sharedCors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...sharedCors, "Content-Type": "application/json" },
    });

  try {
    const userId = await requireAuth(req);
    if (!userId) return json({ error: "Ej inloggad" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Vänskapsrelationer och meddelanden har två användarkolumner.
    await admin.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await admin.from("friendships").delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
    await admin.from("shared_courses").delete().or(`shared_by.eq.${userId},shared_with.eq.${userId}`);
    await admin.from("course_club_shares").delete().eq("shared_by", userId);
    await admin.from("referral_rewards").delete().or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);

    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) console.error(`delete ${table} failed`, error.message);
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) return json({ error: authError.message }, 400);

    return json({ success: true });
  } catch (err) {
    console.error("delete-account error", err);
    return json({ error: err instanceof Error ? err.message : "Okänt fel" }, 500);
  }
});
