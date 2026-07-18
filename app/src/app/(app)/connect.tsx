import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBusiness } from '@/lib/business';
import {
  type Connection,
  type Platform as SocialPlatform,
  PLATFORMS,
  beginOAuth,
  connectDemo,
  disconnect,
  exchangeOAuth,
  fetchConnections,
  getOAuthConfig,
} from '@/lib/connections';
import { PLATFORM_META, colors } from '@/lib/theme';

function redirectTarget() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return Linking.createURL('/');
}

export default function Connect() {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [connections, setConnections] = useState<Connection[]>([]);
  const [config, setConfig] = useState<Record<SocialPlatform, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [conns, cfg] = await Promise.all([fetchConnections(businessId), getOAuthConfig()]);
      setConnections(conns);
      setConfig(cfg);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byPlatform = (p: SocialPlatform) => connections.find((c) => c.platform === p);

  async function onConnect(platform: SocialPlatform) {
    if (!businessId) return;
    setError(null);
    setBusy(platform);
    try {
      if (config?.[platform]) {
        // Real OAuth: backend builds the authorize URL; after the user approves,
        // we exchange the returned code for tokens server-side.
        const redirectUri = redirectTarget();
        const url = await beginOAuth(businessId, platform, redirectUri);
        const res = await WebBrowser.openAuthSessionAsync(url, redirectUri);
        if (res.type === 'success' && res.url) {
          const code = new URL(res.url).searchParams.get('code');
          if (code) await exchangeOAuth(businessId, platform, code, redirectUri);
        }
      } else {
        await connectDemo(businessId, platform);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setBusy(null);
    }
  }

  async function onDisconnect(id: string) {
    setError(null);
    setConnections((prev) => prev.filter((c) => c.id !== id));
    try {
      await disconnect(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not disconnect');
      await load();
    }
  }

  const anyReal = config ? Object.values(config).some(Boolean) : false;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.textMuted} />
        }
      >
        <Text style={styles.title}>Connect accounts</Text>
        <Text style={styles.subtitle}>
          Link your social platforms to unlock dashboards and publishing.
        </Text>

        {!anyReal ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              🧪 Demo mode — connecting adds a placeholder account so you can explore the app.
              Real sign-in turns on per platform once its API keys are added (see README).
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.list}>
          {PLATFORMS.map((p) => {
            const meta = PLATFORM_META[p];
            const conn = byPlatform(p);
            const isReal = config?.[p];
            return (
              <View key={p} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: meta.color + '22' }]}>
                  <Text style={styles.iconEmoji}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>{meta.label}</Text>
                  {conn ? (
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: conn.status === 'demo' ? colors.primary : colors.success },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {conn.status === 'demo' ? 'Demo connected' : 'Connected'}
                        {conn.account_name ? ` · ${conn.account_name}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.notConnected}>
                      {isReal ? 'Not connected' : 'Not connected · demo available'}
                    </Text>
                  )}
                </View>

                {conn ? (
                  <Pressable
                    onPress={() => onDisconnect(conn.id)}
                    style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnGhostText}>Disconnect</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => onConnect(p)}
                    disabled={busy === p}
                    style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
                  >
                    {busy === p ? (
                      <ActivityIndicator color={colors.onPrimary} size="small" />
                    ) : (
                      <Text style={styles.btnText}>Connect</Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: 4 },
  noticeCard: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  list: { gap: 12, marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
  },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 22 },
  platformName: { fontSize: 16, fontWeight: '600', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.textMuted },
  notConnected: { fontSize: 12, color: colors.textFaint, marginTop: 3 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  btnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnGhostText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  pressed: { opacity: 0.8 },
});
