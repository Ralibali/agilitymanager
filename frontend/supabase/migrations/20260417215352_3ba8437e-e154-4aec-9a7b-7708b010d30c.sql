-- Fixa Security Definer View-varning på breed_stats
DROP VIEW IF EXISTS public.breed_stats;

CREATE VIEW public.breed_stats
WITH (security_invoker = true)
AS
SELECT
  b.id,
  b.name,
  b.slug,
  b.size_class,
  b.agility_popularity_rank,
  COALESCE(d.dog_count, 0) AS dog_count,
  COALESCE(d.active_competition_count, 0) AS active_competition_count
FROM public.breeds b
LEFT JOIN (
  SELECT
    lower(trim(breed)) AS breed_key,
    count(*) AS dog_count,
    count(*) FILTER (WHERE is_active_competition_dog) AS active_competition_count
  FROM public.dogs
  WHERE breed IS NOT NULL AND breed <> ''
  GROUP BY lower(trim(breed))
) d ON d.breed_key = lower(trim(b.name));

GRANT SELECT ON public.breed_stats TO anon, authenticated;