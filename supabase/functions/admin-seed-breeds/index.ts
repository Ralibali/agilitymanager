// One-shot admin upsert for breed seeding. Bypasses RLS via service role.
// Auth: shared secret in `x-seed-token` header (SEED_ADMIN_TOKEN).
// This function is intended to be deleted after seeding is complete.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-seed-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = req.headers.get("x-seed-token") ?? "";
  const expected = Deno.env.get("SEED_ADMIN_TOKEN") ?? "";
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let body: { breeds?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const breeds = Array.isArray(body.breeds) ? body.breeds : null;
  if (!breeds || breeds.length === 0) {
    return new Response(
      JSON.stringify({ error: "missing or empty 'breeds' array" }),
      {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const rows = breeds.map((b: any) => ({
    slug: String(b.slug),
    name: String(b.name),
    size_class: String(b.size_class),
    agility_suitability: b.agility_suitability ?? null,
    hoopers_suitability: b.hoopers_suitability ?? null,
    typical_height_cm: b.typical_height_cm ?? null,
    typical_weight_kg: b.typical_weight_kg ?? null,
    life_expectancy: b.life_expectancy ?? null,
    breed_group: b.breed_group ?? null,
    origin_country: b.origin_country ?? null,
    seo_title: b.seo_title ?? null,
    seo_description: b.seo_description ?? null,
    short_description: b.short_description ?? "",
    long_description: b.long_description ?? "",
    agility_profile: b.agility_profile ?? "",
    agility_strengths: b.agility_strengths ?? "",
    agility_challenges: b.agility_challenges ?? "",
    training_tips: b.training_tips ?? "",
    temperament: Array.isArray(b.temperament) ? b.temperament : [],
    popular_in_sweden: Boolean(b.popular_in_sweden),
    published: true,
    description: b.short_description ?? "",
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("breeds")
    .upsert(rows, { onConflict: "slug" })
    .select("slug");

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message, details: error }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      count: data?.length ?? 0,
      slugs: data?.map((r) => r.slug),
    }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
