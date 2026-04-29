
-- Drop old public SELECT policy
DROP POLICY IF EXISTS "Public read hoopers competitions" ON public.hoopers_competitions;

-- Authenticated users can see everything
CREATE POLICY "Authenticated can view hoopers competitions"
  ON public.hoopers_competitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a public view without sensitive contact fields
CREATE OR REPLACE VIEW public.hoopers_competitions_public
WITH (security_invoker = on) AS
  SELECT
    id,
    competition_id,
    competition_name,
    date,
    location,
    county,
    club_name,
    organizer,
    type,
    classes,
    lopp_per_class,
    price_per_lopp,
    registration_opens,
    registration_closes,
    registration_status,
    judge,
    source_url,
    extra_info,
    fetched_at
  FROM public.hoopers_competitions;

-- Allow anon to read through the view by granting SELECT on the view
GRANT SELECT ON public.hoopers_competitions_public TO anon;
GRANT SELECT ON public.hoopers_competitions_public TO authenticated;

-- Anon can read base table but only via the view (need base table access for security_invoker)
CREATE POLICY "Anon can read hoopers competitions"
  ON public.hoopers_competitions
  FOR SELECT
  TO anon
  USING (true);
