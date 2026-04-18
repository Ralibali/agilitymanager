-- Add spec columns to existing breeds table
ALTER TABLE public.breeds
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS temperament TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agility_suitability INTEGER CHECK (agility_suitability BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS hoopers_suitability INTEGER CHECK (hoopers_suitability BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS typical_height_cm TEXT,
  ADD COLUMN IF NOT EXISTS typical_weight_kg TEXT,
  ADD COLUMN IF NOT EXISTS life_expectancy TEXT,
  ADD COLUMN IF NOT EXISTS origin_country TEXT,
  ADD COLUMN IF NOT EXISTS breed_group TEXT,
  ADD COLUMN IF NOT EXISTS agility_strengths TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS agility_challenges TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS training_tips TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS suitable_class TEXT,
  ADD COLUMN IF NOT EXISTS popular_in_sweden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_attribution TEXT,
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.breeds.published IS 'True = breed has rich content and appears on /raser and in sitemap-breeds.xml';
COMMENT ON COLUMN public.breeds.suitable_class IS 'Display label: Small | Medium | Large (UI-friendly version of size_class XS/S/M/L)';

CREATE INDEX IF NOT EXISTS breeds_published_rank_idx
  ON public.breeds (published, agility_popularity_rank)
  WHERE published = true;

-- Tighten public read: only published breeds visible to anonymous users
DROP POLICY IF EXISTS "Breeds are publicly readable" ON public.breeds;

CREATE POLICY "Anyone can read published breeds"
  ON public.breeds
  FOR SELECT
  TO public
  USING (published = true);

CREATE POLICY "Admins can read all breeds"
  ON public.breeds
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
