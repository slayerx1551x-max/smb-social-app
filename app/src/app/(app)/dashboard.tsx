import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBusiness } from '@/lib/business';
import { fetchConnections } from '@/lib/connections';
import { type DashboardData, type Platform, fetchDashboard, syncMetrics } from '@/lib/metrics';
import { PLATFORM_META, colors } from '@/lib/theme';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STATS: { key: keyof DashboardData['totals']; label: string; emoji: string }[] = [
  { key: 'followers', label: 'Followers', emoji: '👥' },
  { key: 'reach', label: 'Reach', emoji: '📡' },
  { key: 'engagement', label: 'Engagement', emoji: '❤️' },
  { key: 'views', label: 'Views', emoji: '▶️' },
];

export default function Dashboard() {
  const router = useRouter();
  const { business } = useBusiness();
  const businessId = business?.id;

  const [data, setData] = useState<DashboardData | null>(null);
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSynced, setAutoSynced] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [dash, conns] = await Promise.all([
        fetchDashboard(businessId),
        fetchConnections(businessId),
      ]);
      setData(dash);
      setAccountCount(conns.length);
      setError(null);
      return { dash, conns };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const sync = useCallback(async () => {
    if (!businessId) return;
    setSyncing(true);
    setError(null);
    try {
      await syncMetrics(businessId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [businessId, load]);

  useEffect(() => {
    void load();
  }, [load]);

  // First visit with accounts but no metrics yet → pull one sample automatically.
  useEffect(() => {
    if (autoSynced || loading || !data || accountCount === null) return;
    const hasMetrics = Object.keys(data.byPlatform).length > 0;
    if (accountCount > 0 && !hasMetrics) {
      setAutoSynced(true);
      void sync();
    }
  }, [autoSynced, loading, data, accountCount, sync]);

  const connectedPlatforms = data ? (Object.keys(data.byPlatform) as Platform[]) : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.textMuted} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              {data?.collectedAt
                ? `Updated ${new Date(data.collectedAt).toLocaleString()}`
                : 'Your numbers across all platforms'}
            </Text>
          </View>
          <Pressable
            onPress={sync}
            disabled={syncing}
            style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
          >
            {syncing ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.refreshText}>↻ Refresh</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !data ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
        ) : accountCount === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔗</Text>
            <Text style={styles.emptyTitle}>No accounts yet</Text>
            <Text style={styles.emptyText}>
              Connect a social account to start tracking followers, reach, and engagement.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/connect')}
              style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
            >
              <Text style={styles.emptyBtnText}>Connect accounts</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.statGrid}>
              {STATS.map((s) => (
                <View key={s.key} style={styles.statCard}>
                  <Text style={styles.statEmoji}>{s.emoji}</Text>
                  <Text style={styles.statValue}>{fmt(data?.totals[s.key] ?? 0)}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>By platform</Text>
            <View style={styles.list}>
              {connectedPlatforms.map((p) => {
                const meta = PLATFORM_META[p];
                const m = data?.byPlatform[p];
                if (!m) return null;
                return (
                  <View key={p} style={styles.platformCard}>
                    <View style={styles.platformHeader}>
                      <View style={[styles.icon, { backgroundColor: meta.color + '22' }]}>
                        <Text style={styles.iconEmoji}>{meta.emoji}</Text>
                      </View>
                      <Text style={styles.platformName}>{meta.label}</Text>
                      <Text style={styles.platformFollowers}>{fmt(m.followers ?? 0)} followers</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Mini label="Reach" value={fmt(m.reach ?? 0)} />
                      <Mini label="Engagement" value={fmt(m.engagement ?? 0)} />
                      <Mini label="Views" value={fmt(m.views ?? 0)} />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.topPosts}>
              <Text style={styles.sectionTitle}>Top posts</Text>
              <Text style={styles.topPostsHint}>
                Your best-performing posts will appear here once you publish content.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  refresh: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 90,
    alignItems: 'center',
  },
  refreshText: { color: colors.onPrimary, fontWeight: '600', fontSize: 13 },
  pressed: { opacity: 0.8 },
  error: { color: colors.danger, fontSize: 13 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  statEmoji: { fontSize: 18 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  list: { gap: 12 },
  platformCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  platformHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 19 },
  platformName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  platformFollowers: { fontSize: 13, color: colors.textMuted },
  metricRow: { flexDirection: 'row', gap: 10 },
  mini: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  miniValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  miniLabel: { fontSize: 11, color: colors.textFaint },
  topPosts: { gap: 6, marginTop: 4 },
  topPostsHint: { fontSize: 13, color: colors.textFaint, lineHeight: 19 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
