
-- Sheltie: ta bort raden om kontaktzoner (A-bro/tipp/gångbro)
UPDATE public.breeds
SET agility_strengths = E'Exceptionell lyhördhet – läser förarens minsta kroppsspråksignal och reagerar blixtsnabbt\nKompakt kropp med låg tyngdpunkt ger fantastisk vändförmåga i tajta sekvenser\nHög motivation att arbeta med sin förare utan behov av extrema belöningar\nUthållig koncentration genom hela tävlingsdagen utan att tappa fokus\nSnabb acceleration från stilla till toppfart på mycket kort sträcka'
WHERE slug = 'shetland-sheepdog';

-- Papillon: skriv om utmaningarna utan att nämna A-bro/gångbro/tipp specifikt
UPDATE public.breeds
SET agility_challenges = E'Branta lutningar på kontakthinder är proportionellt brantare för en hund på 25 cm – kräver specifik styrketräning för bakbenen\nLåg kroppsvikt påverkar hur hindren reagerar på hundens rörelser – kräver extra fartjustering och timing\nKan vara känslig för kyla och regn vid utomhustävlingar – tunnpälsen ger begränsat skydd\nStarka vindbyar kan påverka den lätta kroppen vid höga hopp\nRisk för skador vid fellandningar – de finlemmade benen tål inte samma belastning som robustare raser'
WHERE slug = 'papillon';

-- Säkerställ att Border Collie inte heller har kvar några spår
UPDATE public.breeds
SET 
  agility_strengths = REGEXP_REPLACE(agility_strengths, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp)[^\n]*\n?', '', 'g'),
  agility_challenges = REGEXP_REPLACE(agility_challenges, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp)[^\n]*\n?', '', 'g'),
  training_tips = REGEXP_REPLACE(training_tips, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp)[^\n]*\n?', '', 'g'),
  description = REGEXP_REPLACE(description, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp)[^\n]*\n?', '', 'g'),
  long_description = REGEXP_REPLACE(long_description, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp)[^\n]*\n?', '', 'g'),
  agility_profile = REGEXP_REPLACE(agility_profile, '(?i)[^\n]*(gångbro|bordsstopp|bordstopp)[^\n]*\n?', '', 'g')
WHERE slug = 'border-collie';
