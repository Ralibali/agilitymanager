-- Leads från klubb-sidan: klubbar som vill ha grupppris på Pro.
-- INSERT är öppen (även för anonyma besökare), SELECT är admin-only.

CREATE TABLE public.club_interest_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  club_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  members_estimate INTEGER,
  sport TEXT,
  message TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.club_interest_leads ENABLE ROW LEVEL SECURITY;

-- Vem som helst (inloggad eller inte) får skicka in en intresseanmälan.
CREATE POLICY "Anyone can submit club interest"
  ON public.club_interest_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Bara admins kan läsa leads.
CREATE POLICY "Admins can read club interest leads"
  ON public.club_interest_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ingen uppdatering/radering via klienten (service_role kringgår RLS vid behov).
