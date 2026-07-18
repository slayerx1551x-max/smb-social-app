import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type Platform = Enums<'platform'>;
export type CaptionItem = Tables<'content_items'>;

export type GeneratedCaption = {
  source: 'claude' | 'sample';
  id: string;
  caption: string;
  hashtags: string[];
};

export async function generateCaption(
  businessId: string,
  platform: Platform,
  topic: string,
): Promise<GeneratedCaption> {
  const { data, error } = await supabase.functions.invoke<GeneratedCaption>('generate-caption', {
    body: { businessId, platform, topic },
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

export async function fetchRecentCaptions(businessId: string, limit = 20): Promise<CaptionItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('business_id', businessId)
    .eq('type', 'caption')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteCaption(id: string) {
  const { error } = await supabase.from('content_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
