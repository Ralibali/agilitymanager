
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Size class enum
CREATE TYPE public.size_class AS ENUM ('XS', 'S', 'M', 'L');

-- Competition level enum (Swedish SAgiK)
CREATE TYPE public.competition_level AS ENUM ('Nollklass', 'K1', 'K2', 'K3');

-- Gender enum
CREATE TYPE public.dog_gender AS ENUM ('Hane', 'Tik');

-- Training type enum
CREATE TYPE public.training_type AS ENUM ('Bana', 'Hinder', 'Kontakt', 'Vändning', 'Distans', 'Freestyle', 'Annan');

-- Discipline enum
CREATE TYPE public.discipline AS ENUM ('Agility', 'Jumping', 'Nollklass');

-- Competition status enum
CREATE TYPE public.competition_status AS ENUM ('sparad', 'anmäld', 'bekräftad', 'genomförd');

-- Dogs table
CREATE TABLE public.dogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT NOT NULL DEFAULT '',
  gender public.dog_gender NOT NULL DEFAULT 'Hane',
  color TEXT NOT NULL DEFAULT '',
  birthdate DATE,
  photo_url TEXT,
  size_class public.size_class NOT NULL DEFAULT 'L',
  competition_level public.competition_level NOT NULL DEFAULT 'Nollklass',
  notes TEXT NOT NULL DEFAULT '',
  theme_color TEXT NOT NULL DEFAULT 'hsl(221, 79%, 48%)',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dogs" ON public.dogs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dogs" ON public.dogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dogs" ON public.dogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dogs" ON public.dogs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON public.dogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Training sessions table
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min INTEGER NOT NULL DEFAULT 0,
  type public.training_type NOT NULL DEFAULT 'Bana',
  reps INTEGER NOT NULL DEFAULT 0,
  notes_good TEXT NOT NULL DEFAULT '',
  notes_improve TEXT NOT NULL DEFAULT '',
  dog_energy INTEGER NOT NULL DEFAULT 3 CHECK (dog_energy BETWEEN 1 AND 5),
  handler_energy INTEGER NOT NULL DEFAULT 3 CHECK (handler_energy BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own training" ON public.training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own training" ON public.training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own training" ON public.training_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own training" ON public.training_sessions FOR DELETE USING (auth.uid() = user_id);

-- Competition results table
CREATE TABLE public.competition_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_name TEXT NOT NULL,
  organizer TEXT NOT NULL DEFAULT '',
  discipline public.discipline NOT NULL DEFAULT 'Agility',
  size_class public.size_class NOT NULL DEFAULT 'L',
  competition_level public.competition_level NOT NULL DEFAULT 'K1',
  faults INTEGER NOT NULL DEFAULT 0,
  time_sec NUMERIC(8,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  placement INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own results" ON public.competition_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON public.competition_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own results" ON public.competition_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own results" ON public.competition_results FOR DELETE USING (auth.uid() = user_id);

-- Planned competitions table
CREATE TABLE public.planned_competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  signup_url TEXT NOT NULL DEFAULT '',
  status public.competition_status NOT NULL DEFAULT 'sparad',
  reminder_days_before INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.planned_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own planned" ON public.planned_competitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planned" ON public.planned_competitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planned" ON public.planned_competitions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planned" ON public.planned_competitions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_planned_updated_at BEFORE UPDATE ON public.planned_competitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Photo storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('dog-photos', 'dog-photos', true);
CREATE POLICY "Anyone can view dog photos" ON storage.objects FOR SELECT USING (bucket_id = 'dog-photos');
CREATE POLICY "Users can upload own dog photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dog-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own dog photos" ON storage.objects FOR UPDATE USING (bucket_id = 'dog-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own dog photos" ON storage.objects FOR DELETE USING (bucket_id = 'dog-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
