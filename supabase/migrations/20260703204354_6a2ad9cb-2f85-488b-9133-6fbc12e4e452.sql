
-- 1. Restrict column-level SELECT on clubs.invite_code so RLS SELECT policy
--    ("true") does not leak secret invite codes to any authenticated user.
--    Admins still read it via public.get_my_club_invite_code (SECURITY DEFINER),
--    and public invite lookups still work via get_club_by_invite_code.
REVOKE SELECT (invite_code) ON public.clubs FROM authenticated;
REVOKE SELECT (invite_code) ON public.clubs FROM anon;

-- Ensure service_role retains full access (used by edge functions).
GRANT SELECT (invite_code) ON public.clubs TO service_role;

-- 2. Convert profiles_club_public to security_invoker so it respects the caller's RLS.
ALTER VIEW public.profiles_club_public SET (security_invoker = true);
