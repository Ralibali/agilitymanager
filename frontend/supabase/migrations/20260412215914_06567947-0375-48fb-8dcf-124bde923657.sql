
-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own achievements" ON public.achievements FOR DELETE USING (auth.uid() = user_id);

-- Add goal tracking columns to training_goals
ALTER TABLE public.training_goals
  ADD COLUMN IF NOT EXISTS goal_type TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS target_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;
