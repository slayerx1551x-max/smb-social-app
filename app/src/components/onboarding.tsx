import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

const TOTAL_STEPS = 3;

export function OnboardingScreen({
  step,
  title,
  subtitle,
  children,
  footer,
}: PropsWithChildren<{
  step: number; // 1-based; 0 hides progress dots
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.safe}>
      {step > 0 ? (
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < step ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {hint ? (
        <Text style={[styles.chipHint, selected && styles.chipHintSelected]}>{hint}</Text>
      ) : null}
    </Pressable>
  );
}

export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: 12, paddingBottom: 4 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 6, backgroundColor: colors.cardBorder },
  body: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  content: { marginTop: 16, gap: 16 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 4,
  },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { backgroundColor: colors.primaryDisabled },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  textButton: { paddingVertical: 12, alignItems: 'center' },
  textButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  chip: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1 },
  chipDefault: { backgroundColor: colors.card, borderColor: colors.cardBorder },
  chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  chipTextSelected: { color: colors.text },
  chipHint: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  chipHintSelected: { color: colors.primary },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
});
