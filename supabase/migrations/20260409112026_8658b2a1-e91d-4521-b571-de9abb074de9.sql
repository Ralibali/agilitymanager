
CREATE TABLE public.signup_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer text,
  landing_page text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own signup source"
ON public.signup_sources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all signup sources"
ON public.signup_sources FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_signup_sources_user_id ON public.signup_sources(user_id);
CREATE INDEX idx_signup_sources_utm_source ON public.signup_sources(utm_source);
CREATE INDEX idx_signup_sources_created_at ON public.signup_sources(created_at);
