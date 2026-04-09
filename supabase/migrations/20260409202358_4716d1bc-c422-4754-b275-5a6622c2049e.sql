
-- Fix competitions: drop overly permissive policies, replace with service-role-only
DROP POLICY "Service role can insert/update competitions" ON public.competitions;
DROP POLICY "Service role can update competitions" ON public.competitions;

-- Service role bypasses RLS entirely, so no INSERT/UPDATE policy needed for it.
-- No regular users should insert/update competitions.

-- Fix notifications: drop overly permissive insert policy
DROP POLICY "Service can insert notifications" ON public.notifications;

-- Service role bypasses RLS, so edge functions with service role can still insert.
