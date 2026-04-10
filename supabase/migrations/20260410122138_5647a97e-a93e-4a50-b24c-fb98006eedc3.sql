
CREATE TABLE public.cached_dog_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  dog_name TEXT NOT NULL DEFAULT '',
  reg_name TEXT NOT NULL DEFAULT '',
  reg_nr TEXT NOT NULL DEFAULT '',
  breed TEXT NOT NULL DEFAULT '',
  handler TEXT NOT NULL DEFAULT '',
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dog_id)
);

ALTER TABLE public.cached_dog_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cached results"
ON public.cached_dog_results FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cached results"
ON public.cached_dog_results FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cached results"
ON public.cached_dog_results FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached results"
ON public.cached_dog_results FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
