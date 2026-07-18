import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useBusiness } from '@/lib/business';
import { colors } from '@/lib/theme';

const ROADMAP = [
  { emoji: '📊', title: 'Dashboards', sub: 'Followers, reach, engagement, views', phase: 'Phase 3' },
  { emoji: '✍️', title: 'Caption generator', sub: 'Post titles + hashtags', phase: 'Phase 4' },
  { emoji: '💬', title: 'Subtitle generator', sub: 'On-screen captions for videos', phase: 'Phase 5' },
  { emoji: '🎨', title: 'Graphic designer', sub: 'Branded post images', phase: 'Phase 6' },
  { emoji: '🎬', title: 'Animation studio', sub: 'Remotion motion graphics', phase: 'Phase 7' },
];

export default function Home() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { business } = useBusiness();

  const brandColors = Array.isArray(business?.brand_colors)
    ? (business?.brand_colors as string[])
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            {business?.logo_url ? (
              <Image source={{ uri: business.logo_url }} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={styles.logoInitial}>
                {(business?.name ?? '?').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Brand profile</Text>
            <Text style={styles.title}>{business?.name ?? 'Your business'}</Text>
            {business?.type ? <Text style={styles.type}>{business.type}</Text> : null}
          </View>
        </View>

        {brandColors.length > 0 ? (
          <View style={styles.swatchRow}>
            {brandColors.map((c) => (
              <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
            ))}
          </View>
        ) : null}

        {business?.description ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>About</Text>
            <Text style={styles.cardBody}>{business.description}</Text>
            {business.tone ? <Text style={styles.tone}>Voice: {business.tone}</Text> : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push('/(app)/connect')}
          style={({ pressed }) => [styles.connectCta, pressed && styles.pressed]}
        >
          <Text style={styles.connectEmoji}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.connectTitle}>Connect your accounts</Text>
            <Text style={styles.connectSub}>Instagram · YouTube · TikTok · Facebook</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Coming up</Text>
        <View style={styles.roadmap}>
          {ROADMAP.map((r) => (
            <View key={r.title} style={styles.roadRow}>
              <Text style={styles.roadEmoji}>{r.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.roadTitle}>{r.title}</Text>
                <Text style={styles.roadSub}>{r.sub}</Text>
              </View>
              <Text style={styles.phase}>{r.phase}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  logoInitial: { fontSize: 24, fontWeight: '800', color: colors.primary },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  type: { fontSize: 14, color: colors.textMuted },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 18, gap: 6 },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  cardBody: { fontSize: 14, lineHeight: 20, color: colors.text },
  tone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  connectCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
  },
  pressed: { opacity: 0.8 },
  connectEmoji: { fontSize: 22 },
  connectTitle: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
  connectSub: { fontSize: 12, color: '#D8E4FF', marginTop: 2 },
  arrow: { fontSize: 26, color: colors.onPrimary, fontWeight: '300' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  roadmap: { gap: 8 },
  roadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
  },
  roadEmoji: { fontSize: 22 },
  roadTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  roadSub: { fontSize: 12, color: colors.textMuted },
  phase: { fontSize: 11, fontWeight: '700', color: colors.textFaint },
  signOut: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
});
