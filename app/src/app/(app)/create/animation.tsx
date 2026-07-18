import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBusiness } from '@/lib/business';
import {
  type AnimationItem,
  type AnimationPlan,
  type AnimationTemplate,
  TEMPLATES,
  deleteAnimation,
  fetchRecentAnimations,
  planAnimation,
  renderAnimation,
  renderServiceUrl,
} from '@/lib/animations';
import { brandColors } from '@/lib/graphics';
import { colors } from '@/lib/theme';

const TEMPLATE_META = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));

function AnimatedPreview({
  plan,
  brand,
  logoUrl,
}: {
  plan: AnimationPlan;
  brand: string[];
  logoUrl?: string | null;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [plan, progress]);

  const fade = (a: number, b: number) =>
    progress.interpolate({ inputRange: [0, a, b, 0.9, 1], outputRange: [0, 0, 1, 1, 0], extrapolate: 'clamp' });
  const rise = (a: number) =>
    progress.interpolate({ inputRange: [0, a], outputRange: [18, 0], extrapolate: 'clamp' });

  const bg = brand[0];
  const accent = brand[1];
  const meta = TEMPLATE_META[plan.template];

  return (
    <View style={[styles.canvas, { backgroundColor: bg }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.canvasInner}>
        <View style={styles.badgeRow}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.pvLogo} resizeMode="contain" />
          ) : null}
          <View style={[styles.templateBadge, { backgroundColor: accent }]}>
            <Text style={styles.templateBadgeText}>
              {meta?.emoji} {meta?.label}
            </Text>
          </View>
        </View>

        <View style={styles.canvasBody}>
          <Animated.Text
            style={[styles.pvHeadline, { opacity: fade(0.05, 0.18), transform: [{ translateY: rise(0.18) }] }]}
          >
            {plan.headline}
          </Animated.Text>
          <Animated.Text
            style={[styles.pvSub, { opacity: fade(0.22, 0.35), transform: [{ translateY: rise(0.35) }] }]}
          >
            {plan.subline}
          </Animated.Text>
        </View>

        <Animated.View
          style={[
            styles.pvCta,
            { backgroundColor: accent, opacity: fade(0.42, 0.55), transform: [{ translateY: rise(0.55) }] },
          ]}
        >
          <Text style={styles.pvCtaText}>{plan.cta}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export default function AnimationGenerator() {
  const router = useRouter();
  const { business } = useBusiness();
  const businessId = business?.id;
  const brand = brandColors(business?.brand_colors);

  const [prompt, setPrompt] = useState('');
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<AnimationPlan | null>(null);
  const [rendering, setRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recents, setRecents] = useState<AnimationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRecents = useCallback(async () => {
    if (!businessId) return;
    try {
      setRecents(await fetchRecentAnimations(businessId));
    } catch {
      // non-fatal
    }
  }, [businessId]);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  async function onPlan() {
    if (!businessId || prompt.trim().length < 2) return;
    setError(null);
    setVideoUrl(null);
    setPlanning(true);
    try {
      setPlan(await planAnimation(businessId, prompt.trim()));
      await loadRecents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Planning failed');
    } finally {
      setPlanning(false);
    }
  }

  async function onRender() {
    if (!plan || !businessId) return;
    setError(null);
    setRendering(true);
    try {
      const res = await renderAnimation({
        contentId: plan.id,
        businessId,
        template: plan.template,
        headline: plan.headline,
        subline: plan.subline,
        cta: plan.cta,
        colors: brand,
        logoUrl: business?.logo_url,
      });
      setVideoUrl(res.videoUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Render failed');
    } finally {
      setRendering(false);
    }
  }

  async function onDelete(id: string) {
    setRecents((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteAnimation(id);
    } catch {
      await loadRecents();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Create</Text>
        </Pressable>

        <Text style={styles.title}>Animation studio</Text>
        <Text style={styles.subtitle}>
          Describe a video and AI picks a template + writes the on-screen text. Rendered to a 9:16 MP4.
        </Text>

        <Text style={styles.label}>What&apos;s the video about?</Text>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="e.g. Weekend sale — 25% off everything, Sat & Sun"
          placeholderTextColor={colors.textFaint}
          multiline
          editable={!planning}
        />

        <Pressable
          onPress={onPlan}
          disabled={planning || prompt.trim().length < 2}
          style={({ pressed }) => [
            styles.generate,
            (planning || prompt.trim().length < 2) && styles.generateDisabled,
            pressed && styles.pressed,
          ]}
        >
          {planning ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.generateText}>✨ Plan animation</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {plan ? (
          <>
            <View style={styles.previewWrap}>
              <AnimatedPreview plan={plan} brand={brand} logoUrl={business?.logo_url} />
            </View>

            {videoUrl ? (
              <Text style={styles.videoReady}>✓ Rendered: {videoUrl}</Text>
            ) : (
              <Pressable
                onPress={onRender}
                disabled={rendering}
                style={({ pressed }) => [styles.render, pressed && styles.pressed]}
              >
                {rendering ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.renderText}>🎬 Render MP4</Text>
                )}
              </Pressable>
            )}

            {!renderServiceUrl ? (
              <Text style={styles.note}>
                The preview above is live. To export a real MP4, run the Remotion render service
                (see <Text style={styles.mono}>render-service/README.md</Text>) and set
                {' '}<Text style={styles.mono}>EXPO_PUBLIC_RENDER_URL</Text>.
              </Text>
            ) : null}
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
  canvas: { width: 270, aspectRatio: 9 / 16, borderRadius: 16, overflow: 'hidden' },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  canvasInner: { flex: 1, padding: 22, justifyContent: 'space-between' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pvLogo: { width: 44, height: 44 },
  templateBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  templateBadgeText: { color: '#0B0D12', fontSize: 11, fontWeight: '700' },
  canvasBody: { gap: 10 },
  pvHeadline: { fontSize: 30, fontWeight: '800', lineHeight: 34, color: '#FFFFFF' },
  pvSub: { fontSize: 13, lineHeight: 18, color: '#FFFFFF', opacity: 0.9 },
  pvCta: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  pvCtaText: { fontSize: 13, fontWeight: '700', color: '#0B0D12' },
  render: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  renderText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  videoReady: { color: colors.success, fontSize: 13, marginTop: 12, textAlign: 'center' },
  note: { fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  mono: { fontFamily: 'monospace', color: colors.textMuted, fontSize: 11 },
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
