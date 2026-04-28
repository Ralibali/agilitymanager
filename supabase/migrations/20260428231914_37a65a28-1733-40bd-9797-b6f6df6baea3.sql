
-- Clean dangling/incomplete HTML fragments and complete tags from scraped competition fields
UPDATE public.competitions
SET
  competition_name = trim(regexp_replace(regexp_replace(regexp_replace(competition_name, '<[^<>]*$', '', 'g'), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')),
  club_name        = trim(regexp_replace(regexp_replace(regexp_replace(coalesce(club_name,''), '<[^<>]*$', '', 'g'), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')),
  location         = trim(regexp_replace(regexp_replace(regexp_replace(coalesce(location,''), '<[^<>]*$', '', 'g'), '<[^>]*>', '', 'g'), '\s+', ' ', 'g'))
WHERE competition_name ~ '<' OR club_name ~ '<' OR location ~ '<';

UPDATE public.hoopers_competitions
SET
  competition_name = trim(regexp_replace(regexp_replace(regexp_replace(competition_name, '<[^<>]*$', '', 'g'), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')),
  club_name        = trim(regexp_replace(regexp_replace(regexp_replace(coalesce(club_name,''), '<[^<>]*$', '', 'g'), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')),
  location         = trim(regexp_replace(regexp_replace(regexp_replace(coalesce(location,''), '<[^<>]*$', '', 'g'), '<[^>]*>', '', 'g'), '\s+', ' ', 'g'))
WHERE competition_name ~ '<' OR club_name ~ '<' OR location ~ '<';
