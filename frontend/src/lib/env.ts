/**
 * Centraliserad och validerad åtkomst till miljövariabler i frontend.
 *
 * Bakgrund:
 * - `src/integrations/supabase/client.ts` är auto-genererad och får inte ändras.
 * - `vite.config.ts` injicerar säkra fallback-värden för VITE_SUPABASE_*,
 *   så i praktiken är dessa alltid satta i bygget.
 * - Den här modulen är till för OVRIG kod (t.ex. anrop till edge functions,
 *   feature flags, externa URL:er) som vill läsa env på ett tryggt sätt
 *   med tydliga felmeddelanden i dev och säkra fallbacks i produktion.
 *
 * Den här modulen läser ALDRIG hemliga nycklar — endast publika värden.
 */

type EnvKey =
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_PUBLISHABLE_KEY"
  | "VITE_SUPABASE_PROJECT_ID";

const FALLBACKS: Record<EnvKey, string> = {
  VITE_SUPABASE_URL: "https://rcubbmnosawdtaupixnm.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA",
  VITE_SUPABASE_PROJECT_ID: "rcubbmnosawdtaupixnm",
};

/**
 * Hämta en publik miljövariabel.
 * - Returnerar värdet om det är satt.
 * - Annars returneras en känd fallback (samma som vite.config.ts injicerar).
 * - Loggar en varning i development om fallback används, så vi upptäcker
 *   konfigurationsmissar tidigt utan att krascha produktionen.
 */
export function getPublicEnv(key: EnvKey): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];

  if (value && value.length > 0) return value;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[env] ${key} saknas — använder fallback. Sätt variabeln i .env för att tysta varningen.`
    );
  }

  return FALLBACKS[key];
}

/** Praktiska genvägar */
export const SUPABASE_URL = getPublicEnv("VITE_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = getPublicEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
export const SUPABASE_PROJECT_ID = getPublicEnv("VITE_SUPABASE_PROJECT_ID");

/** Booleans för miljödetektion */
export const IS_DEV = import.meta.env.DEV === true;
export const IS_PROD = import.meta.env.PROD === true;
