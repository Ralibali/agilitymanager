CREATE TABLE public.club_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  seats INTEGER NOT NULL DEFAULT 0 CHECK (seats >= 0),
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT club_subscriptions_one_per_club UNIQUE (club_id)
);

GRANT SELECT ON public.club_subscriptions TO authenticated;
GRANT ALL ON public.club_subscriptions TO service_role;

ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club admins can read club subscription"
  ON public.club_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

CREATE POLICY "Club members can read club subscription"
  ON public.club_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_subscriptions.club_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'accepted'
    )
  );

CREATE OR REPLACE FUNCTION public.touch_club_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER club_subscriptions_touch
  BEFORE UPDATE ON public.club_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_club_subscriptions_updated_at();