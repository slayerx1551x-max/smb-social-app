import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen, PrimaryButton } from '@/components/onboarding';
import { colors } from '@/lib/theme';

const STEPS = [
  { emoji: '🏢', text: 'Tell us about your business' },
  { emoji: '🎨', text: 'Set your brand look' },
  { emoji: '🔗', text: 'Connect your social accounts (next)' },
];

export default function Welcome() {
  const router = useRouter();
  return (
    <OnboardingScreen
      step={0}
      title="Welcome 👋"
      subtitle="Let's set up your brand profile. It takes about 2 minutes and powers every tool in the app."
      footer={
        <PrimaryButton label="Get started" onPress={() => router.push('/(onboarding)/profile')} />
      }
    >
      <View style={styles.list}>
        {STEPS.map((s, i) => (
          <View key={s.text} style={styles.row}>
            <Text style={styles.emoji}>{s.emoji}</Text>
            <View style={styles.rowText}>
              <Text style={styles.step}>Step {i + 1}</Text>
              <Text style={styles.label}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 18,
  },
  emoji: { fontSize: 28 },
  rowText: { gap: 2 },
  step: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
});
