import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireAuth, escapeHtml } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "info@auroramedia.se";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const ALLOWED_TYPES = new Set([
  "new_user",
  "support_ticket",
  "new_subscription",
  "contact",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller
    const userId = await requireAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const { type, data } = await req.json();

    if (!type || !ALLOWED_TYPES.has(String(type))) {
      return new Response(JSON.stringify({ error: "invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const d = data ?? {};
    const e = (v: unknown) => escapeHtml(v);

    let subject = "AgilityManager – Notifikation";
    let html = "";

    switch (type) {
      case "new_user":
        subject = `🎉 Ny användare: ${e(d.email)}`;
        html = `
          <h2>Ny registrering på AgilityManager</h2>
          <p><strong>E-post:</strong> ${e(d.email)}</p>
          <p><strong>Namn:</strong> ${e(d.display_name || "Ej angett")}</p>
          <p><strong>Tidpunkt:</strong> ${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</p>
        `;
        break;
      case "support_ticket":
        subject = `📩 Nytt supportärende: ${e(d.subject)}`;
        html = `
          <h2>Nytt supportärende</h2>
          <p><strong>Ämne:</strong> ${e(d.subject)}</p>
          <p><strong>Meddelande:</strong></p>
          <p>${e(d.message)}</p>
          <p><strong>Från:</strong> ${e(d.user_email || "Okänd")}</p>
          <p><strong>Tidpunkt:</strong> ${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</p>
        `;
        break;
      case "new_subscription":
        subject = `💎 Ny Premium-prenumerant: ${e(d.email)}`;
        html = `
          <h2>Ny Premium-prenumeration</h2>
          <p><strong>E-post:</strong> ${e(d.email)}</p>
          <p><strong>Plan:</strong> ${e(d.plan || "Okänd")}</p>
          <p><strong>Tidpunkt:</strong> ${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</p>
        `;
        break;
      case "contact":
        subject = `📬 Kontaktformulär: ${e(d.subject || "Nytt meddelande")}`;
        html = `
          <h2>Meddelande via kontaktformulär</h2>
          <p><strong>Namn:</strong> ${e(d.name || "Ej angett")}</p>
          <p><strong>E-post:</strong> ${e(d.email || "Ej angett")}</p>
          <p><strong>Meddelande:</strong></p>
          <p>${e(d.message)}</p>
        `;
        break;
    }

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "AgilityManager <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const result = await response.json();
    console.log("[NOTIFY-ADMIN]", type, response.status);

    return new Response(JSON.stringify({ success: response.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[NOTIFY-ADMIN] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
