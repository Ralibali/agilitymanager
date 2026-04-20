-- Lägg till nya textkolumner för rikt SEO-content
ALTER TABLE public.breeds
  ADD COLUMN IF NOT EXISTS short_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS long_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS agility_profile TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;