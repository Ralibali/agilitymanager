
CREATE TABLE public.hoopers_competitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id text NOT NULL UNIQUE,
  competition_name text DEFAULT '',
  date date,
  location text DEFAULT '',
  county text DEFAULT '',
  club_name text DEFAULT '',
  organizer text DEFAULT '',
  type text DEFAULT 'Officiell',
  classes text[] DEFAULT '{}',
  lopp_per_class jsonb DEFAULT '{}',
  price_per_lopp text DEFAULT '',
  registration_opens date,
  registration_closes date,
  registration_status text DEFAULT '',
  contact_person text DEFAULT '',
  contact_email text DEFAULT '',
  judge text DEFAULT '',
  source_url text DEFAULT '',
  extra_info text DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hoopers_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hoopers competitions"
  ON public.hoopers_competitions
  FOR SELECT
  TO public
  USING (true);
