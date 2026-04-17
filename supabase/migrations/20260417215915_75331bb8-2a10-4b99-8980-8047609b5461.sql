ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

COMMENT ON COLUMN public.blog_posts.seo_title IS 'Optimerad <title>-tagg för Google (50–60 tecken inkl. " | AgilityManager"-suffix). Faller tillbaka till title om null.';
COMMENT ON COLUMN public.blog_posts.seo_description IS 'Optimerad meta description (140–160 tecken). Faller tillbaka till excerpt om null.';