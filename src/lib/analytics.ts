/**
 * Typad Plausible-analytics-helper för AgilityManager.
 *
 * Regler:
 * - Endast fördefinierade events får skickas (union nedan).
 * - Endast lågkardinalitets-properties tillåts (plan, billing_interval, sport, source).
 * - Inga personuppgifter, fritext, e-post, namn, hundnamn, klubbnamn, id:n eller resultatdata skickas någonsin.
 * - Ingen spårning på localhost eller Lovable preview – filtreras i analyticsLoader.
 * - Inget skickas utan giltigt cookie-samtycke – hanteras i analyticsLoader.
 */

import { PLANS } from '@/contexts/AuthContext';

export type AnalyticsEventName =
  | 'signup_completed'
  | 'trial_started'
  | 'pro_checkout_started'
  | 'pro_purchased'
  | 'first_training_logged';

export type BillingInterval = 'monthly' | 'yearly' | 'unknown';
export type SportProp = 'agility' | 'hoopers';
export type PlanProp = 'pro' | 'trial' | 'free';

export interface AnalyticsProps {
  plan?: PlanProp;
  billing_interval?: BillingInterval;
  sport?: SportProp;
  source?: string;
}

const ALLOWED_KEYS: ReadonlyArray<keyof AnalyticsProps> = [
  'plan',
  'billing_interval',
  'sport',
  'source',
];

// Vitlista för `source` för att undvika oavsiktlig hög-kardinalitet från öppna länkar.
const SAFE_SOURCES = new Set([
  'landing',
  'landing_hero',
  'landing_nav',
  'features',
  'blog',
  'hoopers_landing',
  'competitions',
  'competition_detail',
  'free_course_planner',
  'course_planner',
  'invite',
  'club_invite',
  'settings',
  'premium_gate',
  'pro_value_card',
  'trial_banner',
  'friend_invite',
]);

function sanitizeSource(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.toLowerCase().slice(0, 40);
  return SAFE_SOURCES.has(v) ? v : 'other';
}

function sanitizeProps(props?: AnalyticsProps): Record<string, string> | undefined {
  if (!props) return undefined;
  const out: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    const raw = props[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== 'string') continue;
    if (key === 'source') {
      const safe = sanitizeSource(raw);
      if (safe) out.source = safe;
      continue;
    }
    // Övriga är strikt typed unions ovan – skicka rå string, klippt till säker längd.
    out[key] = raw.slice(0, 24);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Härled billing_interval från Stripe price-id via PLANS + legacy-list.
 * Okänt price-id → 'unknown' (låg kardinalitet, inga rå id:n läcker).
 */
export function billingIntervalFromPriceId(priceId: string | null | undefined): BillingInterval {
  if (!priceId) return 'unknown';
  if (priceId === PLANS.monthly.priceId) return 'monthly';
  if (priceId === PLANS.yearly.priceId) return 'yearly';
  // Legacy grandfathered
  if (priceId === 'price_1T9AioHzffTezY82OrEqKflT') return 'monthly';
  if (priceId === 'price_1T9AomHzffTezY82vtiObR7E') return 'yearly';
  return 'unknown';
}

/**
 * Skicka ett typsäkert Plausible-event.
 * No-op om `window.plausible` saknas (t.ex. utan samtycke, i tester eller på preview-hostar).
 */
export function trackAnalyticsEvent(name: AnalyticsEventName, props?: AnalyticsProps): void {
  try {
    if (typeof window === 'undefined') return;
    const plausible = (window as unknown as { plausible?: (...args: unknown[]) => void }).plausible;
    if (typeof plausible !== 'function') return;
    const safe = sanitizeProps(props);
    plausible(name, safe ? { props: safe } : undefined);
  } catch {
    /* aldrig blockera användaren pga tracking */
  }
}

/** Skicka en SPA-pageview manuellt. Används av PageviewTracker för route-byten. */
export function trackPageview(): void {
  try {
    if (typeof window === 'undefined') return;
    const plausible = (window as unknown as { plausible?: (...args: unknown[]) => void }).plausible;
    if (typeof plausible !== 'function') return;
    plausible('pageview');
  } catch {
    /* ignore */
  }
}
