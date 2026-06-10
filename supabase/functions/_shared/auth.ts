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
 * Accepts requests from pg_net cron jobs that send the anon key
 * either in `apikey` header or as `Authorization: Bearer <anon>`.
 * Requires the JSON body to contain `trigger: "cron"`.
 */
export async function hasCronAuth(req: Request): Promise<boolean> {
  if (hasInternalSecret(req)) return true;

  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) return false;

  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const hasAnonKey = bearer === anonKey || apikey === anonKey;
  if (!hasAnonKey) return false;

  try {
    const body = await req.clone().json();
    return body?.trigger === "cron";
  } catch {
    return false;
  }
}
