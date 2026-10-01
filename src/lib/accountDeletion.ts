import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export interface AccountDeletionResult {
  deleted: true;
  localSessionCleared: boolean;
}

const NOT_READY = "Raderingen kunde inte bekräftas just nu. Logga in igen för att kontrollera kontot, eller kontakta info@auroramedia.se för hjälp med konto och uppgifter.";

export async function deleteSignedInAccount(confirmation: string, expectedUserId: string): Promise<AccountDeletionResult> {
  if (confirmation !== "RADERA") throw new Error("Skriv RADERA för att bekräfta.");
  if (!isSupabaseConfigured) throw new Error(NOT_READY);
  // This gets the credential to send. The server, not this cached session,
  // determines the identity and verifies that the session is still active.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token || sessionData.session.user.id !== expectedUserId) throw new Error("Logga in på kontot innan du raderar det.");
  const { data, error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    body: { confirmation },
  });
  if (error || data?.deleted !== true) throw new Error(NOT_READY);
  // Server deletion has succeeded. Do not turn a local sign-out error into an
  // apparent failed deletion that could lead the person to repeat the action.
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    return { deleted: true, localSessionCleared: !signOutError };
  } catch {
    return { deleted: true, localSessionCleared: false };
  }
}
