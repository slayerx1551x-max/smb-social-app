import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import { z } from 'zod';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT = '8787',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
}

const RenderRequest = z.object({
  contentId: z.string().uuid().optional(),
  businessId: z.string().uuid(),
  template: z.enum(['promo', 'product', 'event', 'hours', 'review']),
  headline: z.string(),
  subline: z.string(),
  cta: z.string(),
  colors: z.array(z.string()).min(1),
  logoUrl: z.string().nullable().optional(),
});

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(express.json());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'authorization, content-type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  next();
});
app.options('/render', (_req, res) => res.sendStatus(204));
app.get('/health', (_req, res) => res.json({ ok: true }));

// Bundle the Remotion project once at startup (expensive).
let serveUrlPromise: Promise<string> | null = null;
function getBundle() {
  if (!serveUrlPromise) {
    serveUrlPromise = bundle({ entryPoint: join(process.cwd(), 'src/index.ts') });
  }
  return serveUrlPromise;
}

app.post('/render', async (req, res) => {
  try {
    // 1. Verify the caller (Supabase JWT) and business membership.
    const token = (req.header('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing Authorization' });
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const spec = RenderRequest.parse(req.body);
    const { data: biz } = await authed
      .from('businesses')
      .select('id')
      .eq('id', spec.businessId)
      .maybeSingle();
    if (!biz) return res.status(403).json({ error: 'Not a member of this business' });

    // 2. Render the composition to a temp MP4.
    const serveUrl = await getBundle();
    const inputProps = {
      headline: spec.headline,
      subline: spec.subline,
      cta: spec.cta,
      colors: spec.colors,
      logoUrl: spec.logoUrl ?? null,
    };
    const composition = await selectComposition({
      serveUrl,
      id: spec.template,
      inputProps,
    });
    const outPath = join(tmpdir(), `${randomUUID()}.mp4`);
    await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: outPath, inputProps });

    // 3. Upload to Supabase storage (service role) and get the public URL.
    const bytes = await readFile(outPath);
    const path = `${spec.businessId}/animations/${randomUUID()}.mp4`;
    const { error: upErr } = await admin.storage
      .from('media')
      .upload(path, bytes, { contentType: 'video/mp4', upsert: true });
    await rm(outPath, { force: true });
    if (upErr) return res.status(500).json({ error: upErr.message });
    const videoUrl = admin.storage.from('media').getPublicUrl(path).data.publicUrl;

    // 4. Attach the video to the content item.
    if (spec.contentId) {
      await admin
        .from('content_items')
        .update({ media_url: videoUrl, status: 'published' })
        .eq('id', spec.contentId);
    }

    return res.json({ videoUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Render error';
    return res.status(500).json({ error: message });
  }
});

app.listen(Number(PORT), () => {
  console.log(`Render service listening on :${PORT}`);
});
