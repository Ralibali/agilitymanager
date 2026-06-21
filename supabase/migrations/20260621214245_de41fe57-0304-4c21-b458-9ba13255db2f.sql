
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, premium_until)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    now() + interval '14 days'
  );
  RETURN NEW;
END;
$function$;

-- Backfill: ge premium till befintliga användare som registrerats senaste 14 dagarna
-- och som saknar premium_until.
UPDATE public.profiles p
SET premium_until = p.created_at + interval '14 days'
WHERE premium_until IS NULL
  AND p.created_at > now() - interval '14 days';
