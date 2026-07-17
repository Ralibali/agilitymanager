-- Leads från klubb-sidan: klubbar som vill ha grupppris på Pro.
CREATE TABLE IF NOT EXISTS public.club_interest_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  club_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  members_estimate INTEGER,
  sport TEXT,
  message TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT INSERT ON public.club_interest_leads TO anon, authenticated;
GRANT SELECT ON public.club_interest_leads TO authenticated;
GRANT ALL ON public.club_interest_leads TO service_role;

ALTER TABLE public.club_interest_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit club interest" ON public.club_interest_leads;
CREATE POLICY "Anyone can submit club interest"
  ON public.club_interest_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read club interest leads" ON public.club_interest_leads;
CREATE POLICY "Admins can read club interest leads"
  ON public.club_interest_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Schemalägg interna cron-jobb om vault-hemligheten 'internal_secret' finns.
DO $$
DECLARE
  has_secret boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'internal_secret') INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE 'vault-hemligheten internal_secret saknas — cron-jobb hoppas över. Kör bootstrap-cron-secret som admin.';
    RETURN;
  END IF;

  PERFORM public.reschedule_internal_cron(
    'scrape-competitions-daily', '0 5 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/scrape-competitions',
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_secret' LIMIT 1)),
      body := jsonb_build_object('trigger','cron','at',now())
    ) AS request_id;$cmd$
  );
  PERFORM public.reschedule_internal_cron(
    'scrape-hoopers-competitions-daily', '30 5 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/scrape-hoopers-competitions',
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_secret' LIMIT 1)),
      body := jsonb_build_object('trigger','cron','at',now())
    ) AS request_id;$cmd$
  );
  PERFORM public.reschedule_internal_cron(
    'send-competition-reminders-daily', '0 7 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/send-competition-reminders',
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_secret' LIMIT 1)),
      body := jsonb_build_object('trigger','cron','at',now())
    ) AS request_id;$cmd$
  );
  PERFORM public.reschedule_internal_cron(
    'check-deadlines-daily', '0 8 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/check-registration-deadlines',
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_secret' LIMIT 1)),
      body := jsonb_build_object('trigger','cron','at',now())
    ) AS request_id;$cmd$
  );
  PERFORM public.reschedule_internal_cron(
    'social-notifications-daily', '0 9 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/social-notifications',
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_secret' LIMIT 1)),
      body := jsonb_build_object('trigger','cron','at',now())
    ) AS request_id;$cmd$
  );

  RAISE NOTICE 'Alla fem interna cron-jobb är schemalagda.';
END $$;
