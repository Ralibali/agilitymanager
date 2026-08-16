SELECT public.reschedule_internal_cron(
  'send-competition-push-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
      url := 'https://rcubbmnosawdtaupixnm.supabase.co/functions/v1/send-competition-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );$$
);