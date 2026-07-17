-- Klubb Pro: en klubbadmin köper N platser (per-seat Stripe-prenumeration),
-- alla accepterade medlemmar i klubben får Pro så länge medlemsantalet
-- ryms inom antalet platser.
--
-- Skrivning sker endast via service_role (Stripe-webhook). Klienter läser.

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
  -- En aktiv prenumeration per klubb räcker
  CONSTRAINT club_subscriptions_one_per_club UNIQUE (club_id)
);

ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

-- Klubbadmin får läsa sin klubbs prenumeration
CREATE POLICY "Club admins can read club subscription"
  ON public.club_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- Accepterade medlemmar får läsa (visar "Pro via klubb")
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

-- Inga INSERT/UPDATE/DELETE-policys: endast service_role (webhooken) skriver.

-- updated_at-trigger
CREATE OR REPLACE FUNCTION public.touch_club_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
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
