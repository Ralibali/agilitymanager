-- Add jumping_level column to dogs table
ALTER TABLE public.dogs 
ADD COLUMN jumping_level public.competition_level NOT NULL DEFAULT 'Nollklass';

-- Copy existing competition_level to jumping_level as a starting point
UPDATE public.dogs SET jumping_level = competition_level;