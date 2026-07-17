-- Schemalägger alla interna cron-jobb via pg_cron + pg_net.
-- Idempotent och säker att köra om. Kräver att vault-hemligheten
-- 'internal_secret' finns — den skapas av edge-funktionen
-- bootstrap-cron-secret (engångsanrop som admin). Saknas den hoppar
-- migrationen bara över schemaläggningen med en NOTICE.

DO $$
DECLARE
  has_secret boolean;
  base_url text := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'internal_secret'
  ) INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE 'vault-hemligheten internal_secret saknas — cron-jobb schemaläggs inte. Anropa edge-funktionen bootstrap-cron-secret en gång som admin, kör sedan om denna migration.';
    RETURN;
  END IF;

  -- Agilitytävlingar dagligen 05:00
  PERFORM public.reschedule_internal_cron(
    'scrape-competitions-daily',
    '0 5 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/scrape-competitions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_secret' LIMIT 1)
      ),
      body := jsonb_build_object('trigger', 'cron', 'at', now())
    ) AS request_id;$cmd$
  );

  -- Hooperstävlingar dagligen 05:30
  PERFORM public.reschedule_internal_cron(
    'scrape-hoopers-competitions-daily',
    '30 5 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/scrape-hoopers-competitions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_secret' LIMIT 1)
      ),
      body := jsonb_build_object('trigger', 'cron', 'at', now())
    ) AS request_id;$cmd$
  );

  -- Tävlingspåminnelser dagligen 07:00
  PERFORM public.reschedule_internal_cron(
    'send-competition-reminders-daily',
    '0 7 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/send-competition-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_secret' LIMIT 1)
      ),
      body := jsonb_build_object('trigger', 'cron', 'at', now())
    ) AS request_id;$cmd$
  );

  -- Anmälningsdeadlines dagligen 08:00
  PERFORM public.reschedule_internal_cron(
    'check-deadlines-daily',
    '0 8 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/check-registration-deadlines',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_secret' LIMIT 1)
      ),
      body := jsonb_build_object('trigger', 'cron', 'at', now())
    ) AS request_id;$cmd$
  );

  -- Sociala notiser dagligen 09:00
  PERFORM public.reschedule_internal_cron(
    'social-notifications-daily',
    '0 9 * * *',
    $cmd$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/social-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_secret' LIMIT 1)
      ),
      body := jsonb_build_object('trigger', 'cron', 'at', now())
    ) AS request_id;$cmd$
  );

  RAISE NOTICE 'Alla fem interna cron-jobb är schemalagda.';
END $$;
