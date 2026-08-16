CREATE TABLE public.dog_match_profiles (
  user_id UUID NOT NULL PRIMARY KEY,
  store JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_match_profiles TO authenticated;
GRANT ALL ON public.dog_match_profiles TO service_role;

ALTER TABLE public.dog_match_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own match profiles"
ON public.dog_match_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_dog_match_profiles_updated_at
BEFORE UPDATE ON public.dog_match_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();