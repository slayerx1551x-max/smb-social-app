import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen, PrimaryButton } from '@/components/onboarding';
import { colors } from '@/lib/theme';
import { useBusiness } from '@/lib/business';
import { supabase } from '@/lib/supabase';

export default function Done() {
  const router = useRouter();
  const { business, refresh } = useBusiness();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (!business) return;
    setError(null);
    setFinishing(true);
    const { error: e } = await supabase
      .from('businesses')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', business.id);
    if (e) {
      setError(e.message);
      setFinishing(false);
      return;
    }
    await refresh();
    router.replace('/(app)');
  }

  return (
    <OnboardingScreen
      step={3}
      title="You're all set! 🎉"
      subtitle={`${business?.name ?? 'Your business'}'s profile is ready. Next you'll connect your social accounts, then the dashboards and content tools open up.`}
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Go to app" onPress={finish} loading={finishing} />
        </>
      }
    >
      <View style={styles.card}>
        <Text style={styles.heading}>What&apos;s next</Text>
        <Text style={styles.body}>
          Connect Instagram, YouTube, TikTok, and Facebook to unlock your dashboards and
          publish the graphics, captions, subtitles, and animations you create.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 20, gap: 8 },
  heading: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: 4 },
});
