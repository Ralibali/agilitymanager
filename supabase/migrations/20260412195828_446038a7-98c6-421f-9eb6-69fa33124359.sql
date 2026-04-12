
CREATE TABLE public.planned_training (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  date date NOT NULL,
  time_start time,
  time_end time,
  location text NOT NULL DEFAULT '',
  training_type text NOT NULL DEFAULT 'Bana',
  sport text NOT NULL DEFAULT 'Agility',
  recurring text NOT NULL DEFAULT 'none',
  completed boolean NOT NULL DEFAULT false,
  reminder_minutes_before integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.planned_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planned training"
ON public.planned_training FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planned training"
ON public.planned_training FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planned training"
ON public.planned_training FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planned training"
ON public.planned_training FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_planned_training_updated_at
BEFORE UPDATE ON public.planned_training
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
