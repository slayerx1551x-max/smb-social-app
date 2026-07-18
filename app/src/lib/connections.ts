import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type Platform = Enums<'platform'>;
export type Connection = Pick<
  Tables<'connected_accounts'>,
  'id' | 'platform' | 'account_name' | 'status' | 'created_at'
>;

export const PLATFORMS: Platform[] = ['instagram', 'youtube', 'tiktok', 'facebook'];

export async function fetchConnections(businessId: string): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('id, platform, account_name, status, created_at')
    .eq('business_id', businessId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Which platforms have real OAuth credentials configured on the backend. */
export async function getOAuthConfig(): Promise<Record<Platform, boolean>> {
  const empty: Record<Platform, boolean> = {
    instagram: false,
    youtube: false,
    tiktok: false,
    facebook: false,
  };
  try {
    const { data, error } = await supabase.functions.invoke<{
      configured: Record<Platform, boolean>;
    }>('social-oauth', { body: { action: 'config' } });
    if (error || !data) return empty;
    return { ...empty, ...data.configured };
  } catch {
    return empty;
  }
}

/** Begin real OAuth: ask the backend for the provider authorize URL. */
export async function beginOAuth(businessId: string, platform: Platform, redirectUri: string) {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('social-oauth', {
    body: { action: 'authorize', platform, businessId, redirectUri },
  });
  if (error) throw new Error(error.message);
  return data!.url;
}

/** Finish real OAuth: exchange the returned code for tokens (stored server-side). */
export async function exchangeOAuth(
  businessId: string,
  platform: Platform,
  code: string,
  redirectUri: string,
) {
  const { error } = await supabase.functions.invoke('social-oauth', {
    body: { action: 'exchange', platform, businessId, code, redirectUri },
  });
  if (error) throw new Error(error.message);
}

/** Demo connection so the UI is fully usable before real API keys exist. */
export async function connectDemo(businessId: string, platform: Platform) {
  const { error } = await supabase.from('connected_accounts').upsert(
    {
      business_id: businessId,
      platform,
      account_id: `demo-${platform}`,
      account_name: `@demo_${platform}`,
      status: 'demo',
    },
    { onConflict: 'business_id,platform,account_id' },
  );
  if (error) throw new Error(error.message);
}

export async function disconnect(id: string) {
  const { error } = await supabase.from('connected_accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
