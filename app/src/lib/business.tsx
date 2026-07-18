import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Business = Tables<'businesses'>;

type BusinessContextValue = {
  business: Business | null;
  loading: boolean;
  needsOnboarding: boolean;
  refresh: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: PropsWithChildren) {
  const { session, initializing } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    setBusiness(data ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (initializing) return;
    void load();
  }, [initializing, load]);

  const value = useMemo<BusinessContextValue>(
    () => ({
      business,
      loading: initializing || loading,
      needsOnboarding: !!session && (!business || !business.onboarding_completed_at),
      refresh: load,
    }),
    [business, loading, initializing, session, load],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within a <BusinessProvider>');
  return ctx;
}
