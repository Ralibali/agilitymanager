-- Add new columns to training_sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS obstacles_trained text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fault_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_time_sec decimal,
  ADD COLUMN IF NOT EXISTS jump_height_used text,
  ADD COLUMN IF NOT EXISTS handler_zone_kept boolean,
  ADD COLUMN IF NOT EXISTS overall_mood integer,
  ADD COLUMN IF NOT EXISTS location text DEFAULT '';

-- Add withers_cm to dogs
ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS withers_cm integer;