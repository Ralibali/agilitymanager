-- Tabell för flera påminnelser per planerad tävling
CREATE TABLE public.competition_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  planned_competition_id uuid NOT NULL REFERENCES public.planned_competitions(id) ON DELETE CASCADE,
  days_before integer NOT NULL CHECK (days_before >= 0 AND days_before <= 120),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','inapp')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (planned_competition_id, days_before, channel)
);

CREATE INDEX idx_competition_reminders_user ON public.competition_reminders(user_id);
CREATE INDEX idx_competition_reminders_pending ON public.competition_reminders(sent_at) WHERE sent_at IS NULL;

ALTER TABLE public.competition_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.competition_reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON public.competition_reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.competition_reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.competition_reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);