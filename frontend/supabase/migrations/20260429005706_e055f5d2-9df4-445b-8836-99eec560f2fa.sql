ALTER TABLE public.competition_interests
  DROP CONSTRAINT IF EXISTS competition_interests_status_check;

ALTER TABLE public.competition_interests
  ADD CONSTRAINT competition_interests_status_check
  CHECK (status = ANY (ARRAY['interested'::text, 'registered'::text, 'done'::text]));