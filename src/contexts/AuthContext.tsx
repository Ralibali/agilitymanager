import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const PLANS = {
  monthly: {
    priceId: 'price_1T9AioHzffTezY82OrEqKflT',
    productId: 'prod_U7PXVAq6hRWosI',
    label: 'Månadsplan',
    price: '19 kr/mån',
    amount: 19,
  },
  yearly: {
    priceId: 'price_1T9AomHzffTezY82vtiObR7E',
    productId: 'prod_U7Pe1Hsfd0nyji',
    label: 'Årsplan',
    price: '99 kr/år',
    amount: 99,
  },
} as const;

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
                if (diffDays <= 7) {
                  const trialEnd = new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, subscription, checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
