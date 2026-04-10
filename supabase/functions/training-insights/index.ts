import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { trainingSummary, competitionSummary, dogs } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Du är en erfaren agilitycoach som ger personliga träningsinsikter på svenska. 
Analysera tränings- och tävlingsdata och ge konkreta, uppmuntrande tips.

Svara med exakt denna JSON-struktur (inget annat):
{
  "insights": [
    {
      "title": "Kort rubrik",
      "description": "Konkret beskrivning och tips",
      "type": "tip" | "warning" | "praise" | "suggestion"
    }
  ]
}

Regler:
- Ge 3-5 insikter baserat på datan
- "tip": konkret träningsråd
- "warning": identifierad risk eller lucka i träningen  
- "praise": beröm för bra mönster
- "suggestion": förslag på nästa steg
- Var specifik: nämn hundnamn, träningstyper, tidsperioder
- Om det saknas träning i en kategori (t.ex. kontaktträning), påpeka det
- Om en hund har många fel i tävling, föreslå relevant träning
- Max 2 meningar per beskrivning`;

    const userPrompt = `Här är data att analysera:

HUNDAR:
${dogs}

TRÄNINGSDATA (senaste 3 månaderna):
${trainingSummary}

TÄVLINGSDATA (senaste 6 månaderna):
${competitionSummary}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const insights = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("training-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
