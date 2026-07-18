import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type GraphicItem = Tables<'content_items'>;
export type GraphicCopy = {
  source: 'claude' | 'sample';
  id: string;
  headline: string;
  subheadline: string;
  cta: string;
};

export type GraphicStyle = 'bold' | 'dark' | 'light';
export const STYLES: { key: GraphicStyle; label: string }[] = [
  { key: 'bold', label: 'Bold' },
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
];

const FALLBACK_BRAND = ['#2F80FF', '#22D3EE', '#0B2447'];

export function brandColors(raw: unknown): string[] {
  const c = Array.isArray(raw) ? (raw as string[]) : [];
  return c.length >= 3 ? c : FALLBACK_BRAND;
}

export function stylePalette(style: GraphicStyle, brand: string[]) {
  switch (style) {
    case 'bold':
      return { bg: brand[0], text: '#FFFFFF', accent: brand[1], ctaText: '#0B0D12' };
    case 'dark':
      return { bg: brand[2] ?? '#0B0D12', text: '#FFFFFF', accent: brand[1], ctaText: '#0B0D12' };
    case 'light':
      return { bg: '#F4F4F7', text: brand[2] ?? '#111111', accent: brand[0], ctaText: '#FFFFFF' };
  }
}

export async function generateGraphicCopy(businessId: string, topic: string): Promise<GraphicCopy> {
  const { data, error } = await supabase.functions.invoke<GraphicCopy>('generate-graphic', {
    body: { businessId, topic },
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

export async function fetchRecentGraphics(businessId: string, limit = 20): Promise<GraphicItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('business_id', businessId)
    .eq('type', 'graphic')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteGraphic(id: string) {
  const { error } = await supabase.from('content_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- SVG composition (1080 x 1920, 9:16) ----

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string),
  );
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

export type GraphicDesign = {
  headline: string;
  subheadline: string;
  cta: string;
  style: GraphicStyle;
  brand: string[];
  logoDataUri?: string | null;
};

export function buildSvg(d: GraphicDesign): string {
  const W = 1080;
  const H = 1920;
  const pal = stylePalette(d.style, d.brand);
  const M = 96;

  const headLines = wrap(d.headline, 14);
  const headSize = headLines.length >= 3 ? 118 : 140;
  const headStartY = 900 - (headLines.length - 1) * headSize * 0.5;
  const headTspans = headLines
    .map((l, i) => `<tspan x="${M}" y="${headStartY + i * headSize * 1.02}">${escapeXml(l)}</tspan>`)
    .join('');

  const subLines = wrap(d.subheadline, 30);
  const subStartY = headStartY + headLines.length * headSize + 40;
  const subTspans = subLines
    .map((l, i) => `<tspan x="${M}" y="${subStartY + i * 62}">${escapeXml(l)}</tspan>`)
    .join('');

  const logo = d.logoDataUri
    ? `<image href="${d.logoDataUri}" x="${M}" y="120" width="180" height="180" preserveAspectRatio="xMidYMid meet"/>`
    : '';

  const ctaY = 1660;
  const ctaW = 44 + d.cta.length * 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${pal.bg}"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${pal.accent}"/>
  ${logo}
  <rect x="${M}" y="${headStartY - headSize - 30}" width="90" height="10" rx="5" fill="${pal.accent}"/>
  <text font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${headSize}" fill="${pal.text}">${headTspans}</text>
  <text font-family="Helvetica, Arial, sans-serif" font-weight="400" font-size="46" fill="${pal.text}" opacity="0.85">${subTspans}</text>
  <rect x="${M}" y="${ctaY}" width="${ctaW}" height="96" rx="48" fill="${pal.accent}"/>
  <text x="${M + ctaW / 2}" y="${ctaY + 62}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="42" fill="${pal.ctaText}">${escapeXml(d.cta)}</text>
</svg>`;
}

/** Fetch the logo and inline it as a data URI (avoids canvas cross-origin taint). */
export async function logoToDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Rasterize the SVG to a PNG and download it (web only). */
export async function downloadPng(svg: string, name: string): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('render failed'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, 1080, 1920);
  URL.revokeObjectURL(url);
  canvas.toBlob((png) => {
    if (!png) return;
    const pngUrl = URL.createObjectURL(png);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${name}.png`;
    a.click();
    URL.revokeObjectURL(pngUrl);
  }, 'image/png');
}
