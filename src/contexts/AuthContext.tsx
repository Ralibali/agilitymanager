import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { trackAnalyticsEvent, billingIntervalFromPriceId } from '@/lib/analytics';

// Aktuella priser (v2 — 2026)
// Gamla priser (price_1T9Aio... 19 kr/mån, price_1T9Aom... 99 kr/år) är fortfarande aktiva
// i Stripe för befintliga prenumeranter (grandfathering).
export const PLANS = {
  monthly: {
    priceId: 'price_1TNX9dHzffTezY82QlVT1FEA',
    productId: 'prod_UMFe9t1BTWwPYt',
    label: 'Månadsvis',
    price: '79 kr/mån',
    amount: 79,
  },
  yearly: {
    priceId: 'price_1TNXAAHzffTezY82jUjqyL3f',
    productId: 'prod_UMFf5nHYTrrun2',
    label: 'Årsvis',
    price: '790 kr/år',
    amount: 790,
    savingsLabel: 'Spara 158 kr',
    monthlyEquivalent: '66 kr/mån',
  },
} as const;

// Legacy price IDs som fortsatt ska räknas som aktiv Pro (grandfathered)
export const LEGACY_PRO_PRICE_IDS = [
  'price_1T9AioHzffTezY82OrEqKflT', // 19 kr/mån
  'price_1T9AomHzffTezY82vtiObR7E', // 99 kr/år
] as const;

// Längd på gratis provperiod (dagar). Måste matcha check-subscription/create-checkout.
export const TRIAL_DAYS = 14;

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  isTrial: boolean;
  loading: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  subscription: SubscriptionState;
  checkSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  subscription: { subscribed: false, productId: null, priceId: null, subscriptionEnd: null, isTrial: false, loading: true },
  checkSubscription: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false, productId: null, priceId: null, subscriptionEnd: null, isTrial: false, loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubscription({
        subscribed: data?.subscribed ?? false,
        productId: data?.product_id ?? null,
        priceId: data?.price_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        isTrial: data?.is_trial ?? false,
        loading: false,
      });
    } catch (err) {
      console.error('check-subscription error:', err);
      // CRITICAL: Never downgrade if sync failed — keep current state, just stop loading
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) {
        setTimeout(() => checkSubscription(), 0);
      } else {
        setSubscription({ subscribed: false, productId: null, priceId: null, subscriptionEnd: null, isTrial: false, loading: false });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) checkSubscription();
      else setSubscription(prev => ({ ...prev, loading: false }));
    });

    return () => authSub.unsubscribe();
  }, [checkSubscription]);

  // Realtime listener on profiles table for instant subscription updates
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel('profile-subscription-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const p = payload.new as Record<string, unknown>;
          // Only react if stripe fields changed
          if (p.stripe_subscription_status !== undefined) {
            const isActive = p.stripe_subscription_status === 'active';
            console.log('[AuthContext] Realtime profile update received', {
              status: p.stripe_subscription_status,
              productId: p.stripe_product_id,
            });

            // Check admin premium first
            if (p.premium_until) {
              const premiumUntil = new Date(p.premium_until as string);
              if (premiumUntil > new Date()) {
                setSubscription(prev => ({
                  ...prev,
                  subscribed: true,
                  isTrial: false,
                  subscriptionEnd: premiumUntil.toISOString(),
                  productId: null,
                  priceId: null,
                }));
                return;
              }
            }

            if (isActive) {
              setSubscription(prev => ({
                ...prev,
                subscribed: true,
                isTrial: false,
                productId: (p.stripe_product_id as string) ?? null,
                priceId: (p.stripe_price_id as string) ?? null,
                subscriptionEnd: (p.stripe_current_period_end as string) ?? null,
              }));
            } else if (p.stripe_subscription_status === 'canceled' || p.stripe_subscription_status === 'none') {
              // Check trial before marking as unsubscribed
              const createdAt = session?.user?.created_at;
              if (createdAt) {
                const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays <= TRIAL_DAYS) {
                  const trialEnd = new Date(new Date(createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
                  setSubscription(prev => ({
                    ...prev,
                    subscribed: true,
                    isTrial: true,
                    subscriptionEnd: trialEnd.toISOString(),
                    productId: null,
                    priceId: null,
                  }));
                  return;
                }
              }
              setSubscription(prev => ({
                ...prev,
                subscribed: false,
                isTrial: false,
                productId: null,
                priceId: null,
                subscriptionEnd: null,
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, session?.user?.created_at]);

  // Fallback: refresh every 5 minutes instead of 60 seconds (webhook handles most updates now)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 300_000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  // En gång per användare: emit `trial_started` när trial upptäcks och
  // `pro_purchased` när en betald prenumeration upptäcks. Använder localStorage-
  // flaggor per user_id så vi inte dubbelrapporterar över refresh eller sessioner.
  const analyticsFiredRef = useRef<{ trial: boolean; pro: boolean; userId: string | null }>({
    trial: false,
    pro: false,
    userId: null,
  });
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId) {
      analyticsFiredRef.current = { trial: false, pro: false, userId: null };
      return;
    }
    if (subscription.loading) return;
    if (analyticsFiredRef.current.userId !== userId) {
      analyticsFiredRef.current = { trial: false, pro: false, userId };
    }
    const trialKey = `am_analytics_trial_started_${userId}`;
    const proKey = `am_analytics_pro_purchased_${userId}`;
    try {
      if (subscription.isTrial && subscription.subscribed && !analyticsFiredRef.current.trial) {
        if (!window.localStorage.getItem(trialKey)) {
          window.localStorage.setItem(trialKey, '1');
          trackAnalyticsEvent('trial_started', { plan: 'trial' });
        }
        analyticsFiredRef.current.trial = true;
      }
      if (subscription.subscribed && !subscription.isTrial && !analyticsFiredRef.current.pro) {
        if (!window.localStorage.getItem(proKey)) {
          window.localStorage.setItem(proKey, '1');
          trackAnalyticsEvent('pro_purchased', {
            plan: 'pro',
            billing_interval: billingIntervalFromPriceId(subscription.priceId),
          });
        }
        analyticsFiredRef.current.pro = true;
      }
    } catch {
      /* localStorage kan vara blockerad */
    }
  }, [
    session?.user?.id,
    subscription.loading,
    subscription.subscribed,
    subscription.isTrial,
    subscription.priceId,
  ]);


  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, subscription, checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
