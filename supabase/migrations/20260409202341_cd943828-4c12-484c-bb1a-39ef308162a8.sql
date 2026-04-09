
-- Competitions table (public read)
CREATE TABLE public.competitions (
  id text PRIMARY KEY,
  part_key text,
  club_name text,
  competition_name text,
  location text,
  indoor_outdoor text,
  date_start date,
  date_end date,
  classes_agility text[] DEFAULT '{}',
  classes_hopp text[] DEFAULT '{}',
  classes_other text[] DEFAULT '{}',
  judges text[] DEFAULT '{}',
  last_registration_date date,
  status text,
  status_code text,
  source_url text DEFAULT 'https://agilitydata.se/taevlingar/',
  fetched_at timestamptz DEFAULT now(),
  raw_lopp text
);

CREATE INDEX idx_competitions_status ON public.competitions(status);
CREATE INDEX idx_competitions_date_start ON public.competitions(date_start);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read competitions"
  ON public.competitions FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert/update competitions"
  ON public.competitions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update competitions"
  ON public.competitions FOR UPDATE
  USING (true);

-- Competition interests table
CREATE TABLE public.competition_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competition_id text NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('interested', 'registered')),
  dog_name text,
  class text,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, competition_id)
);

ALTER TABLE public.competition_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests"
  ON public.competition_interests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests"
  ON public.competition_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests"
  ON public.competition_interests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON public.competition_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Competition log table
CREATE TABLE public.competition_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dog_name text,
  competition_id text,
  competition_name text,
  city text,
  date date,
  discipline text,
  class text,
  starts integer,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.competition_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own log"
  ON public.competition_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own log"
  ON public.competition_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own log"
  ON public.competition_log FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own log"
  ON public.competition_log FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competition_id text,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
