import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  type CaptionItem,
  type GeneratedCaption,
  type Platform,
  deleteCaption,
  fetchRecentCaptions,
  generateCaption,
} from '@/lib/captions';
import { PLATFORM_META, colors } from '@/lib/theme';

const PLATFORMS: Platform[] = ['instagram', 'youtube', 'tiktok', 'facebook'];

function captionText(caption: string | null, hashtags: string[] | null) {
  const tags = (hashtags ?? []).map((h) => `#${h}`).join(' ');
  return [caption ?? '', tags].filter(Boolean).join('\n\n');
}

export default function CaptionGenerator() {
  const router = useRouter();
  const { business } = useBusiness();
  const businessId = business?.id;

  const [platform, setPlatform] = useState<Platform>('instagram');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedCaption | null>(null);
  const [recents, setRecents] = useState<CaptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadRecents = useCallback(async () => {
    if (!businessId) return;
    try {
      setRecents(await fetchRecentCaptions(businessId));
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
      const res = await generateCaption(businessId, platform, topic.trim());
      setResult(res);
      await loadRecents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function copy(id: string, text: string) {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }

  async function onDelete(id: string) {
    setRecents((prev) => prev.filter((r) => r.id !== id));
    if (result?.id === id) setResult(null);
    try {
      await deleteCaption(id);
    } catch {
      await loadRecents();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ Create</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Caption generator</Text>
        <Text style={styles.subtitle}>
          Write a caption + hashtags for a post, tuned to the platform and your brand voice.
        </Text>

        <Text style={styles.label}>Platform</Text>
        <View style={styles.chipRow}>
          {PLATFORMS.map((p) => (
            <Chip
              key={p}
              label={`${PLATFORM_META[p].emoji} ${PLATFORM_META[p].label}`}
              selected={platform === p}
              onPress={() => setPlatform(p)}
            />
          ))}
        </View>

        <Text style={styles.label}>What&apos;s the post about?</Text>
        <TextInput
          style={styles.input}
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. weekend brunch special — bottomless coffee"
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
            <Text style={styles.generateText}>✨ Generate caption</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHead}>
              <Text style={styles.resultTag}>
                {PLATFORM_META[platform].label}
                {result.source === 'sample' ? ' · sample' : ' · Claude'}
              </Text>
              <Pressable
                onPress={() => copy(result.id, captionText(result.caption, result.hashtags))}
                hitSlop={8}
              >
                <Text style={styles.copy}>{copiedId === result.id ? 'Copied ✓' : 'Copy'}</Text>
              </Pressable>
            </View>
            <Text style={styles.caption}>{result.caption}</Text>
            {result.hashtags.length > 0 ? (
              <Text style={styles.hashtags}>{result.hashtags.map((h) => `#${h}`).join('  ')}</Text>
            ) : null}
          </View>
        ) : null}

        {recents.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Recent</Text>
            <View style={styles.list}>
              {recents.map((r) => (
                <View key={r.id} style={styles.recentCard}>
                  <View style={styles.resultHead}>
                    <Text style={styles.recentTag}>
                      {r.platform ? PLATFORM_META[r.platform].label : 'Caption'}
                    </Text>
                    <View style={styles.recentActions}>
                      <Pressable onPress={() => copy(r.id, captionText(r.caption, r.hashtags))} hitSlop={8}>
                        <Text style={styles.copy}>{copiedId === r.id ? 'Copied ✓' : 'Copy'}</Text>
                      </Pressable>
                      <Pressable onPress={() => onDelete(r.id)} hitSlop={8}>
                        <Text style={styles.delete}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.caption}>{r.caption}</Text>
                  {r.hashtags.length > 0 ? (
                    <Text style={styles.hashtags}>{r.hashtags.map((h) => `#${h}`).join('  ')}</Text>
                  ) : null}
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
  header: { paddingBottom: 4 },
  back: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
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
    minHeight: 84,
    textAlignVertical: 'top',
  },
  generate: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  generateDisabled: { backgroundColor: colors.primaryDisabled },
  generateText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.85 },
  error: { color: colors.danger, fontSize: 14, marginTop: 4 },
  resultCard: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 6,
  },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTag: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  copy: { fontSize: 13, fontWeight: '700', color: colors.primary },
  caption: { fontSize: 15, lineHeight: 22, color: colors.text },
  hashtags: { fontSize: 13, color: colors.primary, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  list: { gap: 12 },
  recentCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  recentTag: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  recentActions: { flexDirection: 'row', gap: 16 },
  delete: { fontSize: 13, fontWeight: '600', color: colors.textFaint },
});
