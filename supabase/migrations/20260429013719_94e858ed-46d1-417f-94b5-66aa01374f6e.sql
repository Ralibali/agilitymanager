
ALTER TABLE public.coach_feedback
  ADD COLUMN privacy_mode text NOT NULL DEFAULT 'private'
  CHECK (privacy_mode IN ('private', 'private_no_export'));
