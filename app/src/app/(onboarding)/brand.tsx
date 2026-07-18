import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen, PrimaryButton, TextButton } from '@/components/onboarding';
import { colors } from '@/lib/theme';
import { useBusiness } from '@/lib/business';
import { supabase } from '@/lib/supabase';
import { PALETTES } from '@/lib/onboarding-options';

export default function Brand() {
  const router = useRouter();
  const { business, refresh } = useBusiness();

  const current = Array.isArray(business?.brand_colors) ? (business?.brand_colors as string[]) : [];
  const initial = PALETTES.findIndex((p) => p.colors.join() === current.join());
  const [selected, setSelected] = useState<number>(initial >= 0 ? initial : 0);
  const [logoUrl, setLogoUrl] = useState<string | null>(business?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickLogo() {
    setError(null);
    if (!business) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo permission is needed to add a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const res = await fetch(asset.uri);
      const bytes = await res.arrayBuffer();
      const ext = (asset.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
      const path = `${business.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('brand-logos')
        .upload(path, bytes, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('brand-logos').getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function onContinue() {
    if (!business) return;
    setSaving(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from('businesses')
        .update({ brand_colors: PALETTES[selected]?.colors ?? [], logo_url: logoUrl })
        .eq('id', business.id);
      if (e) throw e;
      await refresh();
      router.push('/(onboarding)/done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={2}
      title="Your brand look"
      subtitle="Pick a color palette and add your logo. These style your graphics and videos."
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Continue" onPress={onContinue} loading={saving} />
          <TextButton label="Skip for now" onPress={() => router.push('/(onboarding)/done')} />
        </>
      }
    >
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.logoPlaceholder}>Logo</Text>
          )}
        </View>
        <Pressable
          onPress={pickLogo}
          disabled={uploading}
          style={({ pressed }) => [styles.logoBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.logoBtnText}>
            {uploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Add logo'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Color palette</Text>
      <View style={styles.grid}>
        {PALETTES.map((p, i) => {
          const isSel = selected === i;
          return (
            <Pressable
              key={p.name}
              onPress={() => setSelected(i)}
              style={[styles.card, isSel ? styles.cardSelected : styles.cardDefault]}
            >
              <View style={styles.swatches}>
                {p.colors.map((c) => (
                  <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={[styles.name, isSel && styles.nameSelected]}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  logoBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', borderRadius: 16, padding: 14, borderWidth: 2, gap: 10 },
  cardDefault: { borderColor: colors.cardBorder, backgroundColor: colors.card },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  swatches: { flexDirection: 'row', gap: 6 },
  swatch: { flex: 1, height: 44, borderRadius: 8 },
  name: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  nameSelected: { color: colors.text },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: 4 },
});
