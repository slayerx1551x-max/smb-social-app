// Choices shown during profile setup. The stored strings feed the AI later.

export const BUSINESS_TYPES = [
  'Restaurant',
  'Café',
  'Retail shop',
  'Salon / Spa',
  'Gym / Fitness',
  'Creator / Influencer',
  'Services',
  'Other',
] as const;

export const TONES = [
  { label: 'Friendly', hint: 'Warm and welcoming' },
  { label: 'Professional', hint: 'Polished and clear' },
  { label: 'Playful', hint: 'Fun and casual' },
  { label: 'Upscale', hint: 'Elegant and refined' },
  { label: 'Bold', hint: 'Energetic and punchy' },
] as const;

export type Palette = { name: string; colors: string[] };

export const PALETTES: Palette[] = [
  { name: 'Violet', colors: ['#6D28D9', '#A78BFA', '#1E1B4B'] },
  { name: 'Sunset', colors: ['#FF6B6B', '#FFD166', '#1F2937'] },
  { name: 'Fresh', colors: ['#2ECC71', '#27AE60', '#14532D'] },
  { name: 'Ocean', colors: ['#2563EB', '#22D3EE', '#0B2447'] },
  { name: 'Berry', colors: ['#DB2777', '#F472B6', '#2D0A31'] },
  { name: 'Mono', colors: ['#111827', '#6B7280', '#E5E7EB'] },
];
