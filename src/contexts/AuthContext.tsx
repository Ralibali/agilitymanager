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
      // Sync succeeded — update state
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

  // Auto-refresh every 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60_000);
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
