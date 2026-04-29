
-- Storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', false);

-- Storage policies
CREATE POLICY "Users can upload own training videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own training videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own training videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'training-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Coach feedback history table
CREATE TABLE public.coach_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  question text NOT NULL,
  ai_response text,
  sport text NOT NULL DEFAULT 'Agility',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coach feedback"
ON public.coach_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coach feedback"
ON public.coach_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coach feedback"
ON public.coach_feedback FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own coach feedback"
ON public.coach_feedback FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
