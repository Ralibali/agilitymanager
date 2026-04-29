-- Sport enum
CREATE TYPE public.sport AS ENUM ('Agility', 'Hoopers');

-- Hoopers-specific enums
CREATE TYPE public.hoopers_level AS ENUM ('Startklass', 'Klass 1', 'Klass 2', 'Klass 3');
CREATE TYPE public.hoopers_size AS ENUM ('Small', 'Large');

-- Add hoopers training types
ALTER TYPE public.training_type ADD VALUE 'Dirigering';
ALTER TYPE public.training_type ADD VALUE 'Hoop';
ALTER TYPE public.training_type ADD VALUE 'Tunnel';
ALTER TYPE public.training_type ADD VALUE 'Tunna';

-- Dogs: add sport, hoopers level and size
ALTER TABLE public.dogs
  ADD COLUMN sport public.sport NOT NULL DEFAULT 'Agility',
  ADD COLUMN hoopers_level public.hoopers_level NOT NULL DEFAULT 'Startklass',
  ADD COLUMN hoopers_size public.hoopers_size NOT NULL DEFAULT 'Large';

-- Training sessions: add sport and hoopers-specific scores
ALTER TABLE public.training_sessions
  ADD COLUMN sport public.sport NOT NULL DEFAULT 'Agility',
  ADD COLUMN dirigering_score smallint NULL,
  ADD COLUMN banflyt_score smallint NULL;

-- Competition results: add sport
ALTER TABLE public.competition_results
  ADD COLUMN sport public.sport NOT NULL DEFAULT 'Agility';