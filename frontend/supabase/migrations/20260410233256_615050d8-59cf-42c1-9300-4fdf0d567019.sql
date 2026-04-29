
-- Add hoopers points column (0-35 possible per lopp)
ALTER TABLE public.competition_results 
ADD COLUMN IF NOT EXISTS hoopers_points integer DEFAULT 0;

-- Add lopp number to track individual runs
ALTER TABLE public.competition_results 
ADD COLUMN IF NOT EXISTS lopp_number integer DEFAULT NULL;

-- Add index for efficient hoopers queries
CREATE INDEX IF NOT EXISTS idx_competition_results_hoopers 
ON public.competition_results (dog_id, sport, competition_level) 
WHERE sport = 'Hoopers';
