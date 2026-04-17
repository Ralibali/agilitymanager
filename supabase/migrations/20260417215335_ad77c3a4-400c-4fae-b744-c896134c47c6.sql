-- Fas 2A.3: Schema-förberedelser för programmatiska SEO-sidor

-- 1) competitions: lägg till region + sport
ALTER TABLE public.competitions 
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS sport TEXT;

CREATE INDEX IF NOT EXISTS idx_competitions_region ON public.competitions(region);
CREATE INDEX IF NOT EXISTS idx_competitions_sport ON public.competitions(sport);

-- 2) clubs: lägg till slug + region
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT;

-- Slug-generator: namn → kebab-case + transliterering åäö
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT;
BEGIN
  s := lower(coalesce(input, ''));
  s := translate(s, 'åäöéèêüÅÄÖÉÈÊÜ', 'aaoeeeuaaoeeeu');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  RETURN s;
END;
$$;

-- Auto-fyll slug för befintliga klubbar (om null)
UPDATE public.clubs SET slug = public.slugify(name) WHERE slug IS NULL OR slug = '';

-- Säkerställ unik slug genom att lägga till -2, -3 vid kollision
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  test_slug TEXT;
  n INT;
BEGIN
  FOR rec IN
    SELECT id, slug FROM public.clubs WHERE slug IN (
      SELECT slug FROM public.clubs WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1
    ) ORDER BY created_at
  LOOP
    base_slug := rec.slug;
    n := 2;
    LOOP
      test_slug := base_slug || '-' || n;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clubs WHERE slug = test_slug AND id <> rec.id);
      n := n + 1;
    END LOOP;
    UPDATE public.clubs SET slug = test_slug WHERE id = rec.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_slug_unique ON public.clubs(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_region ON public.clubs(region);

-- Trigger: auto-generera slug på insert/update om saknas
CREATE OR REPLACE FUNCTION public.clubs_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  test_slug TEXT;
  n INT := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(NEW.name);
    test_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.clubs WHERE slug = test_slug AND id <> NEW.id) LOOP
      test_slug := base_slug || '-' || n;
      n := n + 1;
    END LOOP;
    NEW.slug := test_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clubs_set_slug_trigger ON public.clubs;
CREATE TRIGGER clubs_set_slug_trigger
  BEFORE INSERT OR UPDATE OF name, slug ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.clubs_set_slug();

-- 3) breeds-tabell: 50 vanligaste agility-raserna
CREATE TABLE IF NOT EXISTS public.breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  size_class TEXT NOT NULL DEFAULT 'M', -- XS/S/M/L
  agility_popularity_rank INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_breeds_rank ON public.breeds(agility_popularity_rank);
CREATE INDEX IF NOT EXISTS idx_breeds_size ON public.breeds(size_class);

ALTER TABLE public.breeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Breeds are publicly readable" ON public.breeds;
CREATE POLICY "Breeds are publicly readable"
  ON public.breeds FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify breeds" ON public.breeds;
CREATE POLICY "Only admins can modify breeds"
  ON public.breeds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_breeds_updated_at ON public.breeds;
CREATE TRIGGER update_breeds_updated_at
  BEFORE UPDATE ON public.breeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Vy: aggregerad statistik per ras (anonymiserad – endast antal)
CREATE OR REPLACE VIEW public.breed_stats AS
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

-- 5) Seed: 50 vanligaste agility-raserna i Sverige (popularitetsrank baserad på SAgiK-statistik)
INSERT INTO public.breeds (name, slug, description, size_class, agility_popularity_rank) VALUES
  ('Border Collie', 'border-collie', 'Agility-sportens absolut vanligaste ras. Otrolig arbetsvilja, hög inlärningsförmåga och naturlig fart. Dominerar elitklasserna.', 'M', 1),
  ('Shetland Sheepdog', 'shetland-sheepdog', 'Liten vallhund med stor motor. Snabb, smidig och alert. En topprras i Small-klassen.', 'S', 2),
  ('Australian Shepherd', 'australian-shepherd', 'Allsidig vallhund med stark drivkraft. Populär val för aktiva förare.', 'M', 3),
  ('Working Cocker Spaniel', 'working-cocker-spaniel', 'Energisk jaktspaniel som blivit populär i agility tack vare snabbhet och samarbetsvilja.', 'S', 4),
  ('Jack Russell Terrier', 'jack-russell-terrier', 'Kompakt och snabb terrier med outtömlig energi. Vanlig i Small-klassen.', 'S', 5),
  ('Belgisk Vallhund Malinois', 'belgisk-vallhund-malinois', 'Intensiv arbetshund med extrem drift. Kräver erfaren förare.', 'L', 6),
  ('Papillon', 'papillon', 'Liten sällskapshund med förvånande snabbhet och lekfullhet i agility.', 'XS', 7),
  ('Pudel Mellan', 'pudel-mellan', 'Intelligent och mångsidig. Trivs i många hundsporter.', 'M', 8),
  ('Sheltie', 'sheltie', 'Alternativt namn för Shetland Sheepdog – populär i svensk agility.', 'S', 9),
  ('Belgisk Vallhund Tervueren', 'belgisk-vallhund-tervueren', 'Långhårig variant av belgisk vallhund. Elegant och drivande.', 'L', 10),
  ('Labrador Retriever', 'labrador-retriever', 'Vänlig allroundhund. Mindre vanlig på elitnivå men populär i klubbträning.', 'L', 11),
  ('Australian Kelpie', 'australian-kelpie', 'Australisk vallhund med stark drift. Snabb och uthållig.', 'M', 12),
  ('Working Springer Spaniel', 'working-springer-spaniel', 'Jaktspaniel som tar plats i agility med fart och fokus.', 'M', 13),
  ('Mudi', 'mudi', 'Ungersk vallhund i M-storlek. Smart och lättränad.', 'M', 14),
  ('Pumi', 'pumi', 'Ungersk vallhund med karaktäristiskt lockigt hår. Snabb och rörlig.', 'M', 15),
  ('Border Terrier', 'border-terrier', 'Liten arbetsterrier med hjärta. Populär bland nybörjarekipage.', 'S', 16),
  ('Golden Retriever', 'golden-retriever', 'Vänlig familjehund. Trivs i lugnare träning.', 'L', 17),
  ('Welsh Corgi Pembroke', 'welsh-corgi-pembroke', 'Liten vallhund med kort rygg. Kräver hänsyn till leder.', 'S', 18),
  ('Schäfer', 'schafer', 'Klassisk arbetshund. Stark och tränbar.', 'L', 19),
  ('Beagle', 'beagle', 'Drivande hund med självständig karaktär. Utmaning i agility.', 'M', 20),
  ('Cocker Spaniel', 'cocker-spaniel', 'Klassisk spaniel. Vänlig och samarbetsvillig.', 'S', 21),
  ('Pudel Dvärg', 'pudel-dvarg', 'Liten variant av pudeln. Smart och alert.', 'S', 22),
  ('Pudel Toy', 'pudel-toy', 'Minsta pudelvarianten. Kvick och lekfull.', 'XS', 23),
  ('Riesenschnauzer', 'riesenschnauzer', 'Stor schnauzer. Tränbar arbetshund.', 'L', 24),
  ('Hovawart', 'hovawart', 'Tysk arbetshund med vakthundsegenskaper.', 'L', 25),
  ('Briard', 'briard', 'Fransk vallhund. Stor och drivande.', 'L', 26),
  ('Kelpie', 'kelpie', 'Smeknamn för Australian Kelpie i Sverige.', 'M', 27),
  ('Berner Sennenhund', 'berner-sennenhund', 'Lugn schweizisk arbetshund. Mindre vanlig i tävling.', 'L', 28),
  ('Vit Herdehund', 'vit-herdehund', 'Vit variant av schäfer. Mjukare temperament.', 'L', 29),
  ('Australian Cattle Dog', 'australian-cattle-dog', 'Robust australisk vallhund. Hög uthållighet.', 'M', 30),
  ('Lapphund', 'lapphund', 'Svensk vallhund med trevligt temperament.', 'M', 31),
  ('Norsk Älghund Grå', 'norsk-alghund-gra', 'Drivande nordisk hund. Sällsynt i agility.', 'M', 32),
  ('Finsk Lapphund', 'finsk-lapphund', 'Mjuk finsk vallhund.', 'M', 33),
  ('Schipperke', 'schipperke', 'Liten belgisk hund. Pigg och alert.', 'S', 34),
  ('Tibetansk Spaniel', 'tibetansk-spaniel', 'Liten tibetansk hund. Sällsynt val.', 'S', 35),
  ('Pinscher', 'pinscher', 'Alert tysk terriertyp. Snabb.', 'S', 36),
  ('Dvärgpinscher', 'dvargpinscher', 'Liten variant. Pigg och alert.', 'XS', 37),
  ('Russian Toy', 'russian-toy', 'Liten rysk sällskapshund.', 'XS', 38),
  ('Italiensk Vinthund', 'italiensk-vinthund', 'Liten vinthund. Snabb men kräver försiktighet med leder.', 'S', 39),
  ('Whippet', 'whippet', 'Mellanstor vinthund. Explosivt snabb.', 'M', 40),
  ('Stövare', 'stovare', 'Drivande svensk jakthund. Ovanlig i agility.', 'M', 41),
  ('Dvärgschnauzer', 'dvargschnauzer', 'Liten energisk schnauzer.', 'S', 42),
  ('Mellanschnauzer', 'mellanschnauzer', 'Allroundschnauzer i mellanstorlek.', 'M', 43),
  ('Cavalier King Charles Spaniel', 'cavalier-king-charles-spaniel', 'Mjuk sällskapshund. Sällsynt i tävling.', 'S', 44),
  ('Tibetansk Terrier', 'tibetansk-terrier', 'Långhårig tibetansk hund.', 'M', 45),
  ('Engelsk Springer Spaniel', 'engelsk-springer-spaniel', 'Klassisk springer. Energisk.', 'M', 46),
  ('Flatcoated Retriever', 'flatcoated-retriever', 'Glad och energisk retriever.', 'L', 47),
  ('Nova Scotia Duck Tolling Retriever', 'nova-scotia-duck-tolling-retriever', 'Tollare – mindre retriever med stor energi.', 'M', 48),
  ('Standard Pudel', 'standard-pudel', 'Stor variant av pudeln. Elegant och tränbar.', 'L', 49),
  ('Blandras', 'blandras', 'Blandrashundar är alltid välkomna i agility – många topphundar är blandraser.', 'M', 50)
ON CONFLICT (name) DO NOTHING;

-- 6) Auto-fyll competitions.sport baserat på existerande klass-arrayer (för historisk data)
UPDATE public.competitions
SET sport = 'Agility'
WHERE sport IS NULL
  AND (
    (classes_agility IS NOT NULL AND array_length(classes_agility, 1) > 0)
    OR (classes_hopp IS NOT NULL AND array_length(classes_hopp, 1) > 0)
  );

-- 7) Auto-fyll competitions.region från location (enkel mappning – kan utökas senare)
UPDATE public.competitions
SET region = CASE
  WHEN location ILIKE '%stockholm%' OR location ILIKE '%uppsala%' OR location ILIKE '%södertälje%' THEN 'Stockholm'
  WHEN location ILIKE '%göteborg%' OR location ILIKE '%mölndal%' OR location ILIKE '%kungälv%' THEN 'Västra Götaland'
  WHEN location ILIKE '%malmö%' OR location ILIKE '%lund%' OR location ILIKE '%helsingborg%' THEN 'Skåne'
  WHEN location ILIKE '%linköping%' OR location ILIKE '%norrköping%' THEN 'Östergötland'
  WHEN location ILIKE '%örebro%' THEN 'Örebro'
  WHEN location ILIKE '%västerås%' THEN 'Västmanland'
  WHEN location ILIKE '%jönköping%' THEN 'Jönköping'
  WHEN location ILIKE '%umeå%' THEN 'Västerbotten'
  WHEN location ILIKE '%luleå%' THEN 'Norrbotten'
  WHEN location ILIKE '%gävle%' THEN 'Gävleborg'
  ELSE NULL
END
WHERE region IS NULL AND location IS NOT NULL;