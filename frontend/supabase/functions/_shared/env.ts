/**
 * Delad helper för säker hantering av environment-variabler i edge functions.
 *
 * Bakgrund:
 * - Tidigare användes `Deno.env.get("X") ?? ""` på många ställen, vilket
 *   resulterade i att saknade secrets gav obegripliga 500-fel långt senare.
 * - Den här modulen ger tydliga, omedelbara felmeddelanden när en obligatorisk
 *   secret saknas, samt en mjukare variant för valfria.
 *
 * Bakåtkompatibelt — befintliga functions fortsätter fungera oförändrade.
 * Migrera in den här gradvis vid framtida edits.
 */

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.length === 0) {
    throw new Error(
      `[env] Saknad obligatorisk miljövariabel: ${name}. ` +
        `Konfigurera den under Lovable Cloud → Secrets.`
    );
  }
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  return Deno.env.get(name) ?? fallback;
}

/** Vanliga Supabase-secrets paketerade. */
export function getSupabaseEnv() {
  return {
    url: requireEnv("SUPABASE_URL"),
    anonKey: requireEnv("SUPABASE_ANON_KEY"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
