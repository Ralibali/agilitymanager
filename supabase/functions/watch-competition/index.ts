// Publik e-postbevakning av tävlingar (ingen inloggning krävs).
// - POST  /              -> registrera bevakning + skicka bekräftelsemejl
// - GET   /confirm?token -> bekräfta e-post (sätter confirmed_at)
// - GET   /unsubscribe?token -> avregistrera (raderar raden)
//
// Tabellen public.competition_watchers är låst från klienten (RLS utan policies).
// All åtkomst sker här med service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://agilitymanager.se";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Enkel in-memory rate limit per IP: max 5 registreringar/min.
const rateBuckets = new Map<string, number[]>();
function rateLimited(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  rateBuckets.set(ip, arr);
  return arr.length > max;
}

function getIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function htmlPage(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"/>
    <title>${title} · AgilityManager</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="robots" content="noindex"/>
    <style>
      body{margin:0;background:#f9f8f6;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
      .card{background:#fff;border-radius:16px;padding:32px;max-width:480px;box-shadow:0 4px 24px rgba(0,0,0,.06);text-align:center}
      h1{margin:0 0 12px;color:#1a6b3c;font-size:22px}
      p{color:#555;line-height:1.6;font-size:15px}
      a.btn{display:inline-block;background:#1a6b3c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px}
    </style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(html, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

async function findCompetition(
  supabase: ReturnType<typeof createClient>,
  competitionId: string,
): Promise<{ sport: "agility" | "hoopers"; name: string } | null> {
  const { data: agility } = await supabase
    .from("competitions")
    .select("id, competition_name")
    .eq("id", competitionId)
    .maybeSingle();
  if (agility) {
    return {
      sport: "agility",
      name: (agility.competition_name as string) || "Tävling",
    };
  }
  const { data: hoopers } = await supabase
    .from("hoopers_competitions")
    .select("competition_id, competition_name")
    .eq("competition_id", competitionId)
    .maybeSingle();
  if (hoopers) {
    return {
      sport: "hoopers",
      name: (hoopers.competition_name as string) || "Hooperstävling",
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/functions\/v1\/watch-competition/, "");

  try {
    // ---- GET confirm / unsubscribe (public HTML) ----
    if (req.method === "GET" && (path === "/confirm" || path === "/unsubscribe")) {
      const token = url.searchParams.get("token") || "";
      if (!/^[0-9a-f-]{36}$/i.test(token)) {
        return htmlPage(
          "Ogiltig länk",
          `<h1>Länken är ogiltig</h1><p>Länken saknar en giltig token. Kontrollera att du kopierade hela adressen från mejlet.</p>
           <a class="btn" href="${SITE_URL}/tavlingar">Till tävlingar</a>`,
          400,
        );
      }

      if (path === "/confirm") {
        const { data, error } = await supabase
          .from("competition_watchers")
          .update({ confirmed_at: new Date().toISOString() })
          .eq("token", token)
          .select("competition_id")
          .maybeSingle();
        if (error || !data) {
          return htmlPage(
            "Länken har gått ut",
            `<h1>Kunde inte bekräfta</h1><p>Länken är redan använd eller bevakningen har tagits bort.</p>
             <a class="btn" href="${SITE_URL}/tavlingar">Till tävlingar</a>`,
            410,
          );
        }
        return htmlPage(
          "Bevakning bekräftad",
          `<h1>Klart! ✅</h1><p>Vi hör av oss när det finns nyheter om tävlingen — deadline eller resultat. Du kan avregistrera dig när som helst från länken i mejlen.</p>
           <a class="btn" href="${SITE_URL}/tavlingar">Se fler tävlingar</a>`,
        );
      }

      // unsubscribe
      const { error } = await supabase
        .from("competition_watchers")
        .delete()
        .eq("token", token);
      if (error) {
        return htmlPage(
          "Något gick fel",
          `<h1>Kunde inte avregistrera</h1><p>Försök igen senare eller mejla info@auroramedia.se.</p>`,
          500,
        );
      }
      return htmlPage(
        "Avregistrerad",
        `<h1>Avregistrerad</h1><p>Du kommer inte längre få mejl om den här tävlingen.</p>
         <a class="btn" href="${SITE_URL}/tavlingar">Till tävlingar</a>`,
      );
    }

    // ---- POST: create watcher ----
    if (req.method === "POST") {
      const ip = getIp(req);
      if (rateLimited(ip)) {
        return json({ error: "För många försök. Vänta en minut och försök igen." }, 429);
      }

      let payload: { email?: unknown; competition_id?: unknown };
      try {
        payload = await req.json();
      } catch {
        return json({ error: "Ogiltig JSON" }, 400);
      }
      const email = String(payload.email ?? "").trim().toLowerCase();
      const competitionId = String(payload.competition_id ?? "").trim();
      if (!EMAIL_RE.test(email) || email.length > 254) {
        return json({ error: "Ogiltig e-postadress" }, 400);
      }
      if (!competitionId || competitionId.length > 200) {
        return json({ error: "Ogiltig tävling" }, 400);
      }

      const comp = await findCompetition(supabase, competitionId);
      if (!comp) {
        return json({ error: "Tävlingen hittades inte" }, 404);
      }

      // Upsert på (email, competition_id).
      const { data: existing } = await supabase
        .from("competition_watchers")
        .select("id, token, confirmed_at")
        .eq("email", email)
        .eq("competition_id", competitionId)
        .maybeSingle();

      let token: string;
      let alreadyConfirmed = false;
      if (existing) {
        token = existing.token as string;
        alreadyConfirmed = Boolean(existing.confirmed_at);
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("competition_watchers")
          .insert({
            email,
            competition_id: competitionId,
            sport: comp.sport,
          })
          .select("token")
          .single();
        if (insErr || !inserted) {
          console.error("insert watcher failed", insErr);
          return json({ error: "Kunde inte spara bevakning" }, 500);
        }
        token = inserted.token as string;
      }

      const confirmUrl = `${supabaseUrl}/functions/v1/watch-competition/confirm?token=${token}`;
      const unsubUrl = `${supabaseUrl}/functions/v1/watch-competition/unsubscribe?token=${token}`;

      // Skicka bekräftelsemejl via send-email (internal secret).
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": serviceRoleKey,
          },
          body: JSON.stringify({
            templateName: alreadyConfirmed ? "watch_reminder_info" : "watch_confirmation",
            recipientEmail: email,
            data: {
              competitionName: comp.name,
              confirmUrl,
              unsubUrl,
            },
          }),
        });
        if (!resp.ok) {
          console.error("send-email failed", resp.status, await resp.text());
        }
      } catch (e) {
        console.error("send-email error", e);
      }

      return json({
        success: true,
        alreadyConfirmed,
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error("watch-competition error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
