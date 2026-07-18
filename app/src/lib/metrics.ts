import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type Metric = Tables<'metrics'>;
export type Platform = Enums<'platform'>;

export type DashboardData = {
  byPlatform: Partial<Record<Platform, Metric>>;
  totals: { followers: number; reach: number; engagement: number; views: number };
  collectedAt: string | null;
};

/** Trigger a fresh metrics sample for every connected account. */
export async function syncMetrics(businessId: string) {
  const { data, error } = await supabase.functions.invoke<{ synced: number }>('sync-metrics', {
    body: { businessId },
  });
  if (error) throw new Error(error.message);
  return data!;
}

/** Latest sample per platform + aggregate totals. */
export async function fetchDashboard(businessId: string): Promise<DashboardData> {
  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('business_id', businessId)
    .order('collected_at', { ascending: false });
  if (error) throw new Error(error.message);

  const byPlatform: Partial<Record<Platform, Metric>> = {};
  for (const m of data ?? []) {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = m; // first = latest
  }

  const totals = { followers: 0, reach: 0, engagement: 0, views: 0 };
  let collectedAt: string | null = null;
  for (const m of Object.values(byPlatform)) {
    if (!m) continue;
    totals.followers += m.followers ?? 0;
    totals.reach += m.reach ?? 0;
    totals.engagement += m.engagement ?? 0;
    totals.views += m.views ?? 0;
    if (!collectedAt || m.collected_at > collectedAt) collectedAt = m.collected_at;
  }

  return { byPlatform, totals, collectedAt };
}
