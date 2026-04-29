
-- Courses table for partner course offerings
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  price_sek integer NOT NULL DEFAULT 0,
  discounted_price_sek integer,
  stripe_price_id text,
  stripe_product_id text,
  instructor_name text NOT NULL DEFAULT '',
  instructor_bio text NOT NULL DEFAULT '',
  partner_name text NOT NULL DEFAULT '',
  partner_url text NOT NULL DEFAULT '',
  image_url text,
  trailer_url text,
  category text NOT NULL DEFAULT 'hoopers',
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
ON public.courses FOR SELECT
USING (published = true);

CREATE POLICY "Admins can manage courses"
ON public.courses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Course purchases
CREATE TABLE public.course_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  stripe_session_id text,
  amount_paid_sek integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
ON public.course_purchases FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
ON public.course_purchases FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
ON public.course_purchases FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
