import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type AnimationTemplate = 'promo' | 'product' | 'event' | 'hours' | 'review';
export type AnimationItem = Tables<'content_items'>;
export type AnimationPlan = {
  source: 'claude' | 'sample';
  id: string;
  template: AnimationTemplate;
  headline: string;
  subline: string;
  cta: string;
};

export const TEMPLATES: { key: AnimationTemplate; label: string; emoji: string }[] = [
  { key: 'promo', label: 'Promo / Sale', emoji: '🏷️' },
  { key: 'product', label: 'Product spotlight', emoji: '✨' },
  { key: 'event', label: 'Event', emoji: '📅' },
  { key: 'hours', label: "We're open", emoji: '🕒' },
  { key: 'review', label: 'Review highlight', emoji: '⭐' },
];

export async function planAnimation(businessId: string, prompt: string): Promise<AnimationPlan> {
  const { data, error } = await supabase.functions.invoke<AnimationPlan>('plan-animation', {
    body: { businessId, prompt },
  });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch {
        // keep generic message
      }
    }
    throw new Error(message);
  }
  return data!;
}

export async function fetchRecentAnimations(businessId: string, limit = 20): Promise<AnimationItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('business_id', businessId)
    .eq('type', 'animation')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteAnimation(id: string) {
  const { error } = await supabase.from('content_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Whether the separate Remotion render service is configured. */
export const renderServiceUrl = process.env.EXPO_PUBLIC_RENDER_URL ?? null;

/** Ask the render service to produce the 9:16 MP4 (real-ready — needs the service running). */
export async function renderAnimation(spec: {
  contentId: string;
  businessId: string;
  template: AnimationTemplate;
  headline: string;
  subline: string;
  cta: string;
  colors: string[];
  logoUrl?: string | null;
}): Promise<{ videoUrl: string }> {
  if (!renderServiceUrl) throw new Error('Render service is not configured (EXPO_PUBLIC_RENDER_URL).');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${renderServiceUrl.replace(/\/$/, '')}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(`Render failed: ${await res.text()}`);
  return res.json();
}
