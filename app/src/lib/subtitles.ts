import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Cue = { index: number; start: number; end: number; text: string };
export type SubtitleItem = Tables<'content_items'>;
export type SubtitleResult = { source: 'whisper' | 'sample'; id: string; srt: string; cues: Cue[] };

/** Upload a picked video to the `media` bucket and return its public URL. */
export async function uploadVideo(
  businessId: string,
  uri: string,
  mimeType?: string | null,
): Promise<string> {
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const ext = (mimeType?.split('/')[1] ?? 'mp4').replace('quicktime', 'mov');
  const path = `${businessId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(path, bytes, { contentType: mimeType ?? 'video/mp4', upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export async function generateSubtitles(
  businessId: string,
  mediaUrl: string,
): Promise<SubtitleResult> {
  const { data, error } = await supabase.functions.invoke<SubtitleResult>('generate-subtitles', {
    body: { businessId, mediaUrl },
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

export async function fetchRecentSubtitles(businessId: string, limit = 20): Promise<SubtitleItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('business_id', businessId)
    .eq('type', 'subtitle')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteSubtitle(id: string) {
  const { error } = await supabase.from('content_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Parse an SRT string back into cues for display. */
export function parseSrt(srt: string): Cue[] {
  const blocks = srt.trim().split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    const index = parseInt(lines[0], 10) || cues.length + 1;
    const time = lines[1].split('-->');
    const text = lines.slice(2).join('\n');
    cues.push({ index, start: srtToSec(time[0]), end: srtToSec(time[1] ?? ''), text });
  }
  return cues;
}

function srtToSec(t: string): number {
  const m = t.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!m) return 0;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

export function formatTime(sec: number): string {
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
