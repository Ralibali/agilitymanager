/** Never show provider errors, URLs or raw server responses in the UI. */
export function authErrorMessage(error: unknown): string {
  const value = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  const code = value.code ?? '';
  const message = (value.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'Fel e-postadress eller lösenord. Kontrollera uppgifterna och försök igen.';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'Bekräfta din e-postadress först. Du kan begära en ny bekräftelselänk här.';
  if (code === 'otp_expired' || message.includes('expired') || message.includes('invalid token')) return 'Bekräftelselänken har gått ut eller redan använts. Logga in eller begär en ny länk.';
  if (code === 'weak_password' || message.includes('password should')) return 'Välj ett lösenord med minst 8 tecken.';
  if (code === 'user_already_exists' || message.includes('already registered')) return 'Det finns redan ett konto med den e-postadressen. Prova att logga in.';
  if (code.includes('rate_limit') || message.includes('too many') || message.includes('rate limit')) return 'För många försök på kort tid. Vänta en stund och försök igen.';
  if (message.includes('fetch') || message.includes('network')) return 'Kunde inte ansluta. Kontrollera din uppkoppling och försök igen.';
  return 'Det gick inte att logga in eller bekräfta kontot. Försök igen.';
}

export function authCallbackError(search: string, hash: string): string | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return query.get('error_code') || fragment.get('error_code') || query.get('error') || fragment.get('error');
}
export function confirmationRedirect(): string { return `${window.location.origin}/auth/bekrafta`; }
