
-- Add Stripe subscription cache fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamp with time zone;

-- Index for quick lookup by stripe customer id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles (stripe_customer_id);

-- Enable realtime for profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
