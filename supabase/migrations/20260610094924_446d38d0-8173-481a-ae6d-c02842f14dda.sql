
-- Helper to upsert the internal secret in vault
CREATE OR REPLACE FUNCTION public.vault_create_internal_secret(v text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
BEGIN
  PERFORM vault.create_secret(v, 'internal_secret');
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_update_secret(secret_name text, new_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  sid uuid;
BEGIN
  SELECT id INTO sid FROM vault.secrets WHERE name = secret_name LIMIT 1;
  IF sid IS NULL THEN
    PERFORM vault.create_secret(new_secret, secret_name);
  ELSE
    PERFORM vault.update_secret(sid, new_secret, secret_name);
  END IF;
END;
$$;

-- Helper to (re)schedule a cron job by name
CREATE OR REPLACE FUNCTION public.reschedule_internal_cron(job_name text, job_schedule text, job_command text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, pg_temp
AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Real reschedule: drops old then schedules new
CREATE OR REPLACE FUNCTION public.reschedule_internal_cron(job_name text, job_schedule text, job_command text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, pg_temp
AS $$
DECLARE
  jid bigint;
BEGIN
  -- Unschedule any existing job with this name (ignore errors if absent)
  BEGIN
    PERFORM cron.unschedule(job_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- Schedule new
  jid := cron.schedule(job_name, job_schedule, job_command);
END;
$$;

-- Lock these helpers down: only service_role may call them
REVOKE ALL ON FUNCTION public.vault_create_internal_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vault_update_secret(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reschedule_internal_cron(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_create_internal_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_update_secret(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_internal_cron(text, text, text) TO service_role;
