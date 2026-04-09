import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "info@auroramedia.se";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const { type, data } = await req.json();

    let subject = "AgilityManager – Notifikation";
    let html = "";

    switch (type) {
      case "new_user":
        subject = `🎉 Ny användare: ${data.email}`;
        html = `
          <h2>Ny registrering på AgilityManager</h2>
          <p><strong>E-post:</strong> ${data.email}</p>
          <p><strong>Namn:</strong> ${data.display_name || "Ej angett"}</p>
          <p><strong>Tidpunkt:</strong> ${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</p>
        `;
        break;

      case "support_ticket":
        subject = `📩 Nytt supportärende: ${data.subject}`;
        html = `
          <h2>Nytt supportärende</h2>
          <p><strong>Ämne:</strong> ${data.subject}</p>
          <p><strong>Meddelande:</strong></p>
          <p>${data.message}</p>
          <p><strong>Från:</strong> ${data.user_email || "Okänd"}</p>
          <p><strong>Tidpunkt:</strong> ${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</p>
        `;
        break;

      case "new_subscription":
        subject = `💎 Ny Premium-prenumerant: ${data.email}`;
        html = `
          <h2>Ny Premium-prenumeration</h2>
          <p><strong>E-post:</strong> ${data.email}</p>
          <p><strong>Plan:</strong> ${data.plan || "Okänd"}</p>
          <p><strong>Tidpunkt:</strong> ${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</p>
        `;
        break;

      case "contact":
        subject = `📬 Kontaktformulär: ${data.subject || "Nytt meddelande"}`;
        html = `
          <h2>Meddelande via kontaktformulär</h2>
          <p><strong>Namn:</strong> ${data.name || "Ej angett"}</p>
          <p><strong>E-post:</strong> ${data.email || "Ej angett"}</p>
          <p><strong>Meddelande:</strong></p>
          <p>${data.message}</p>
        `;
        break;

      default:
        subject = `AgilityManager: ${type}`;
        html = `<h2>${type}</h2><pre>${JSON.stringify(data, null, 2)}</pre>`;
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
    console.log("[NOTIFY-ADMIN]", type, response.status, JSON.stringify(result));

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
