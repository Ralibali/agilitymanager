import { createClient } from "npm:@supabase/supabase-js@2.109.0";
import { createAccountDeletionHandler } from "./handler.ts";

// Never copy this secret into a VITE_* variable or a mobile bundle.
const url = Deno.env.get("SUPABASE_URL") ?? "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Enable only after the complete target schema and deletion flow pass staging QA.
const enabled = Deno.env.get("ACCOUNT_DELETION_ENABLED") === "true";
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

Deno.serve(createAccountDeletionHandler({
  async getUser(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data.user || data.user.is_anonymous ? null : { id: data.user.id };
  },
  async preflight(userId, sessionId) {
    if (!enabled) return "not_ready";
    const { data, error } = await admin.rpc("account_deletion_preflight", {
      p_user_id: userId,
      p_session_id: sessionId,
    });
    if (error) return "not_ready";
    return data === "ready" || data === "inactive_session" ? data : "not_ready";
  },
  async revokeSessions(jwt) {
    const { error } = await admin.auth.admin.signOut(jwt, "global");
    return !error;
  },
  async deleteUser(userId) {
    const { error } = await admin.auth.admin.deleteUser(userId, false);
    return !error;
  },
  async userIsDeleted(userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    return !data.user && error?.status === 404;
  },
}));
