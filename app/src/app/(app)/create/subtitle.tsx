import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBusiness } from '@/lib/business';
import {
  type Cue,
  type SubtitleItem,
  deleteSubtitle,
  fetchRecentSubtitles,
  formatTime,
  generateSubtitles,
  parseSrt,
  uploadVideo,
} from '@/lib/subtitles';
import { colors } from '@/lib/theme';

type Picked = { uri: string; mimeType?: string | null; name: string };
type Stage = 'idle' | 'uploading' | 'transcribing';

function downloadSrt(name: string, srt: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const blob = new Blob([srt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.srt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SubtitleGenerator() {
  const router = useRouter();
  const { business } = useBusiness();
  const businessId = business?.id;

  const [picked, setPicked] = useState<Picked | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [cues, setCues] = useState<Cue[] | null>(null);
  const [source, setSource] = useState<'whisper' | 'sample' | null>(null);
  const [lastSrt, setLastSrt] = useState<string>('');
  const [recents, setRecents] = useState<SubtitleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRecents = useCallback(async () => {
    if (!businessId) return;
    try {
      setRecents(await fetchRecentSubtitles(businessId));
    } catch {
      // non-fatal
    }
  }, [businessId]);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  async function pickVideo() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Photo/video permission is needed to pick a video.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (result.canceled) return;
    const a = result.assets[0];
    setPicked({ uri: a.uri, mimeType: a.mimeType, name: a.fileName ?? 'video' });
    setCues(null);
    setSource(null);
  }

  async function onGenerate() {
    if (!businessId || !picked) return;
    setError(null);
    try {
      setStage('uploading');
      const mediaUrl = await uploadVideo(businessId, picked.uri, picked.mimeType);
      setStage('transcribing');
      const res = await generateSubtitles(businessId, mediaUrl);
      setCues(res.cues);
      setSource(res.source);
      setLastSrt(res.srt);
      await loadRecents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate subtitles');
    } finally {
      setStage('idle');
    }
  }

  async function copySrt(srt: string) {
    await Clipboard.setStringAsync(srt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onDelete(id: string) {
    setRecents((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteSubtitle(id);
    } catch {
      await loadRecents();
    }
  }

  const busy = stage !== 'idle';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Create</Text>
        </Pressable>

        <Text style={styles.title}>Subtitle generator</Text>
        <Text style={styles.subtitle}>
          Pick a video and we&apos;ll transcribe it into a timed subtitle track (SRT).
        </Text>

        <Pressable
          onPress={pickVideo}
          disabled={busy}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <Text style={styles.pickerEmoji}>🎬</Text>
          <Text style={styles.pickerText} numberOfLines={1}>
            {picked ? picked.name : 'Choose a video'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onGenerate}
          disabled={busy || !picked}
          style={({ pressed }) => [
            styles.generate,
            (busy || !picked) && styles.generateDisabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={colors.onPrimary} />
              <Text style={styles.generateText}>
                {stage === 'uploading' ? 'Uploading…' : 'Transcribing…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.generateText}>✨ Generate subtitles</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {cues ? (
          <View style={styles.result}>
            <View style={styles.resultHead}>
              <Text style={styles.resultTag}>
                {cues.length} cues{source === 'sample' ? ' · sample' : ' · Whisper'}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={() => copySrt(lastSrt)} hitSlop={8}>
                  <Text style={styles.copy}>{copied ? 'Copied ✓' : 'Copy SRT'}</Text>
                </Pressable>
                {Platform.OS === 'web' ? (
                  <Pressable onPress={() => downloadSrt(picked?.name ?? 'subtitles', lastSrt)} hitSlop={8}>
                    <Text style={styles.copy}>Download</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {cues.map((c) => (
              <View key={c.index} style={styles.cue}>
                <Text style={styles.cueTime}>
                  {formatTime(c.start)}–{formatTime(c.end)}
                </Text>
                <Text style={styles.cueText}>{c.text.trim()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {recents.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Recent</Text>
            <View style={styles.list}>
              {recents.map((r) => {
                const n = r.caption ? parseSrt(r.caption).length : 0;
                return (
                  <View key={r.id} style={styles.recentCard}>
                    <View style={styles.resultHead}>
                      <Text style={styles.recentTag}>🎬 {n} cues</Text>
                      <View style={styles.actions}>
                        <Pressable onPress={() => r.caption && copySrt(r.caption)} hitSlop={8}>
                          <Text style={styles.copy}>Copy SRT</Text>
                        </Pressable>
                        <Pressable onPress={() => onDelete(r.id)} hitSlop={8}>
                          <Text style={styles.delete}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                    {r.caption ? (
                      <Text style={styles.recentPreview} numberOfLines={2}>
                        {parseSrt(r.caption)
                          .map((c) => c.text.trim())
                          .join(' ')}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 18,
  },
  pickerEmoji: { fontSize: 22 },
  pickerText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  generate: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  generateDisabled: { backgroundColor: colors.primaryDisabled },
  generateText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.85 },
  error: { color: colors.danger, fontSize: 14, marginTop: 4 },
  result: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 6,
  },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTag: { fontSize: 12, fontWeight: '700', color: colors.primary },
  actions: { flexDirection: 'row', gap: 16 },
  copy: { fontSize: 13, fontWeight: '700', color: colors.primary },
  cue: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    paddingVertical: 4,
    gap: 2,
  },
  cueTime: { fontSize: 11, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  cueText: { fontSize: 15, lineHeight: 21, color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  list: { gap: 12 },
  recentCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  recentTag: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  recentPreview: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  delete: { fontSize: 13, fontWeight: '600', color: colors.textFaint },
});
