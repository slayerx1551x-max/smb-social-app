import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/onboarding';
import { useBusiness } from '@/lib/business';
import {
  type GraphicCopy,
  type GraphicItem,
  type GraphicStyle,
  STYLES,
  brandColors,
  buildSvg,
  deleteGraphic,
  downloadPng,
  fetchRecentGraphics,
  generateGraphicCopy,
  logoToDataUri,
  stylePalette,
} from '@/lib/graphics';
import { colors } from '@/lib/theme';

export default function GraphicGenerator() {
  const router = useRouter();
  const { business } = useBusiness();
  const businessId = business?.id;

  const brand = brandColors(business?.brand_colors);
  const [style, setStyle] = useState<GraphicStyle>('bold');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [design, setDesign] = useState<GraphicCopy | null>(null);
  const [recents, setRecents] = useState<GraphicItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadRecents = useCallback(async () => {
    if (!businessId) return;
    try {
      setRecents(await fetchRecentGraphics(businessId));
    } catch {
      // non-fatal
    }
  }, [businessId]);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  async function onGenerate() {
    if (!businessId || topic.trim().length < 2) return;
    setError(null);
    setGenerating(true);
    try {
      setDesign(await generateGraphicCopy(businessId, topic.trim()));
      await loadRecents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function onDownload() {
    if (!design) return;
    setDownloading(true);
    try {
      const logoDataUri = await logoToDataUri(business?.logo_url);
      const svg = buildSvg({
        headline: design.headline,
        subheadline: design.subheadline,
        cta: design.cta,
        style,
        brand,
        logoDataUri,
      });
      await downloadPng(svg, (design.headline || 'graphic').slice(0, 24).replace(/\s+/g, '-'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function copyText() {
    if (!design) return;
    await Clipboard.setStringAsync(`${design.headline}\n${design.subheadline}\n${design.cta}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onDelete(id: string) {
    setRecents((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteGraphic(id);
    } catch {
      await loadRecents();
    }
  }

  const pal = stylePalette(style, brand);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Create</Text>
        </Pressable>

        <Text style={styles.title}>Graphic designer</Text>
        <Text style={styles.subtitle}>
          A branded 9:16 graphic from your colors + logo. AI writes the copy.
        </Text>

        <Text style={styles.label}>Style</Text>
        <View style={styles.chipRow}>
          {STYLES.map((s) => (
            <Chip key={s.key} label={s.label} selected={style === s.key} onPress={() => setStyle(s.key)} />
          ))}
        </View>

        <Text style={styles.label}>What&apos;s the graphic about?</Text>
        <TextInput
          style={styles.input}
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Grand opening this Saturday — 20% off"
          placeholderTextColor={colors.textFaint}
          multiline
          editable={!generating}
        />

        <Pressable
          onPress={onGenerate}
          disabled={generating || topic.trim().length < 2}
          style={({ pressed }) => [
            styles.generate,
            (generating || topic.trim().length < 2) && styles.generateDisabled,
            pressed && styles.pressed,
          ]}
        >
          {generating ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.generateText}>✨ Generate graphic</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {design ? (
          <>
            {/* 9:16 live preview */}
            <View style={styles.previewWrap}>
              <View style={[styles.canvas, { backgroundColor: pal.bg }]}>
                <View style={[styles.accentBar, { backgroundColor: pal.accent }]} />
                <View style={styles.canvasInner}>
                  {business?.logo_url ? (
                    <Image source={{ uri: business.logo_url }} style={styles.previewLogo} resizeMode="contain" />
                  ) : null}
                  <View style={styles.canvasBody}>
                    <View style={[styles.tick, { backgroundColor: pal.accent }]} />
                    <Text style={[styles.pvHeadline, { color: pal.text }]}>{design.headline}</Text>
                    <Text style={[styles.pvSub, { color: pal.text }]}>{design.subheadline}</Text>
                  </View>
                  <View style={[styles.pvCta, { backgroundColor: pal.accent }]}>
                    <Text style={[styles.pvCtaText, { color: pal.ctaText }]}>{design.cta}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={copyText}
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              >
                <Text style={styles.ghostText}>{copied ? 'Copied ✓' : 'Copy text'}</Text>
              </Pressable>
              {Platform.OS === 'web' ? (
                <Pressable
                  onPress={onDownload}
                  disabled={downloading}
                  style={({ pressed }) => [styles.dlBtn, pressed && styles.pressed]}
                >
                  {downloading ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.dlText}>⬇ Download PNG</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
            {Platform.OS !== 'web' ? (
              <Text style={styles.note}>
                PNG export runs on web (and the render service later). On device you can copy the text for now.
              </Text>
            ) : null}
            <Text style={styles.sourceNote}>Copy by {design.source === 'sample' ? 'template' : 'Claude'}</Text>
          </>
        ) : null}

        {recents.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Recent</Text>
            <View style={styles.list}>
              {recents.map((r) => (
                <View key={r.id} style={styles.recentCard}>
                  <Text style={styles.recentHeadline} numberOfLines={1}>
                    {(r.caption ?? '').split('\n')[0]}
                  </Text>
                  <Pressable onPress={() => onDelete(r.id)} hitSlop={8}>
                    <Text style={styles.delete}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 10 },
  back: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  generate: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  generateDisabled: { backgroundColor: colors.primaryDisabled },
  generateText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.85 },
  error: { color: colors.danger, fontSize: 14, marginTop: 4 },
  previewWrap: { alignItems: 'center', marginTop: 12 },
  canvas: {
    width: 270,
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  canvasInner: { flex: 1, padding: 22, justifyContent: 'space-between' },
  previewLogo: { width: 46, height: 46 },
  canvasBody: { gap: 10 },
  tick: { width: 32, height: 4, borderRadius: 2 },
  pvHeadline: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
  pvSub: { fontSize: 13, lineHeight: 18, opacity: 0.9 },
  pvCta: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  pvCtaText: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ghostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  dlBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dlText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
  note: { fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  sourceNote: { fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  list: { gap: 10 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  recentHeadline: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, marginRight: 12 },
  delete: { fontSize: 13, fontWeight: '600', color: colors.textFaint },
});
