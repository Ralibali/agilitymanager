
-- Training goals
CREATE TABLE public.training_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'technique',
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.training_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.training_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.training_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.training_goals FOR DELETE USING (auth.uid() = user_id);

-- Training milestones (sub-steps within a goal)
CREATE TABLE public.training_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES public.training_goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones" ON public.training_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own milestones" ON public.training_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones" ON public.training_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own milestones" ON public.training_milestones FOR DELETE USING (auth.uid() = user_id);
