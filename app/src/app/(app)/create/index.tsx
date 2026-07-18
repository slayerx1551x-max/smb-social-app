import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

type Tool = {
  emoji: string;
  title: string;
  sub: string;
  route?: string;
  phase?: string;
};

const TOOLS: Tool[] = [
  { emoji: '✍️', title: 'Caption generator', sub: 'Post titles + hashtags, per platform', route: '/(app)/create/caption' },
  { emoji: '💬', title: 'Subtitle generator', sub: 'Transcribe a video into subtitles', route: '/(app)/create/subtitle' },
  { emoji: '🎨', title: 'Graphic designer', sub: 'Branded 9:16 post images', route: '/(app)/create/graphic' },
  { emoji: '🎬', title: 'Animation studio', sub: 'Remotion motion graphics → MP4', route: '/(app)/create/animation' },
];

export default function CreateMenu() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create</Text>
        <Text style={styles.subtitle}>AI tools that use your brand profile.</Text>

        <View style={styles.list}>
          {TOOLS.map((t) => {
            const ready = !!t.route;
            const Row = (
              <View style={[styles.card, !ready && styles.cardDisabled]}>
                <Text style={styles.emoji}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.cardSub}>{t.sub}</Text>
                </View>
                {ready ? (
                  <Text style={styles.arrow}>›</Text>
                ) : (
                  <Text style={styles.phase}>{t.phase}</Text>
                )}
              </View>
            );
            return ready ? (
              <Pressable
                key={t.title}
                onPress={() => router.push(t.route as never)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                {Row}
              </Pressable>
            ) : (
              <View key={t.title}>{Row}</View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 6 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
  },
  cardDisabled: { opacity: 0.55 },
  emoji: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 26, color: colors.primary, fontWeight: '300' },
  phase: { fontSize: 11, fontWeight: '700', color: colors.textFaint },
  pressed: { opacity: 0.85 },
});
