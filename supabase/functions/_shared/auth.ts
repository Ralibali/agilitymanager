// Shared auth + HTML helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const sharedCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates a JWT-bearing request and returns the authenticated user id.
 * Returns null when unauthenticated; caller should respond with 401.
 */
export async function requireAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

/**
 * Returns true when the request carries a valid internal secret
 * matching SUPABASE_SERVICE_ROLE_KEY (used for server-to-server calls).
 */
export function hasInternalSecret(req: Request): boolean {
  const secret = req.headers.get("x-internal-secret");
  if (!secret) return false;
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(expected) && secret === expected;
}

/**
 * Cron-jobb måste skicka `x-internal-secret` (provisionerad via vault av
 * bootstrap-cron-secret). Vi accepterar INTE längre anon-nyckeln som
 * cron-auth eftersom den ligger publikt i JS-bundeln — då kunde vem som
 * helst trigga t.ex. send-competition-reminders utifrån.
 */
export async function hasCronAuth(req: Request): Promise<boolean> {
  return hasInternalSecret(req);
}
