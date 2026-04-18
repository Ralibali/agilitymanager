ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legacy_pricing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_price_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.legacy_pricing IS 'True if user is grandfathered on old pricing (19 kr/mån or 99 kr/år). Never auto-migrate.';
COMMENT ON COLUMN public.profiles.legacy_price_locked_at IS 'Timestamp when user was locked to legacy pricing.';