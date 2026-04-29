
UPDATE public.breeds
SET agility_profile = REGEXP_REPLACE(agility_profile, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp|a-bro|tipp(?:en)?)[^\n]*\n?', '', 'g')
WHERE slug = 'papillon';
