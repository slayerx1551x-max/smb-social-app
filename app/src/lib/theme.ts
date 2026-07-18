// Central color system — black + blue dark theme.
export const colors = {
  bg: '#070B14', // near-black navy
  surface: '#0E1524',
  card: '#111A2E',
  cardBorder: '#1E2A45',

  primary: '#2F80FF', // blue
  primaryPressed: '#2467D6',
  primaryDisabled: '#24365E',
  onPrimary: '#FFFFFF',

  text: '#EAF0FB',
  textMuted: '#93A1BF',
  textFaint: '#5C6A88',

  inputBg: '#0C1322',
  inputBorder: '#243049',

  danger: '#FF5C63',
  dangerSoft: '#2A1620',
  success: '#2DD4A7',
  successSoft: '#0F241E',
  accentSoft: '#132140', // subtle blue-tinted surface
};

// Per-platform brand accents for the Connect page.
export const PLATFORM_META: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C' },
  youtube: { label: 'YouTube', emoji: '▶️', color: '#FF0000' },
  tiktok: { label: 'TikTok', emoji: '🎵', color: '#25F4EE' },
  facebook: { label: 'Facebook', emoji: '👍', color: '#1877F2' },
};
