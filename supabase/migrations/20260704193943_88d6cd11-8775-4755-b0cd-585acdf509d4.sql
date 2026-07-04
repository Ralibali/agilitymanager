
CREATE TABLE public.competition_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  competition_id text NOT NULL,
  sport text NOT NULL CHECK (sport IN ('agility','hoopers')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at timestamptz,
  deadline_notified_at timestamptz,
  results_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, competition_id)
);

CREATE INDEX idx_competition_watchers_competition ON public.competition_watchers(competition_id);
CREATE INDEX idx_competition_watchers_token ON public.competition_watchers(token);

-- Bara service_role. INGA policies för anon/authenticated: e-postadresser
-- får aldrig kunna läsas eller skrivas från klienten.
GRANT ALL ON public.competition_watchers TO service_role;

ALTER TABLE public.competition_watchers ENABLE ROW LEVEL SECURITY;
