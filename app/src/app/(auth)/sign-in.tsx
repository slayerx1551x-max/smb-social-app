import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

function redirectTarget() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return Linking.createURL('/');
}

export default function SignIn() {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function sendLink() {
    setError(null);
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: redirectTarget() },
    });
    setLoading(false);
    if (e) return setError(e.message);
    setStep('sent');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>SMB SOCIAL</Text>
            <Text style={styles.title}>Create account or sign in</Text>
            <Text style={styles.subtitle}>
              We&apos;ll email you a secure sign-in link — no password to remember.
            </Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@yourbusiness.com"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
                autoComplete="email"
                editable={!loading}
                onSubmitEditing={() => emailValid && !loading && sendLink()}
              />
              <PrimaryButton
                label="Email me a sign-in link"
                onPress={sendLink}
                disabled={!emailValid || loading}
                loading={loading}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.checkCard}>
                <Text style={styles.checkTitle}>Check your email 📬</Text>
                <Text style={styles.checkBody}>
                  We sent a sign-in link to{'\n'}
                  <Text style={styles.email}>{email.trim()}</Text>
                </Text>
                <Text style={styles.hint}>
                  Tap the <Text style={styles.bold}>Log In</Text> button in that email.
                  It&apos;s from <Text style={styles.mono}>noreply@mail.app.supabase.io</Text> —
                  check <Text style={styles.bold}>Spam</Text> / <Text style={styles.bold}>Promotions</Text> if
                  you don&apos;t see it. On desktop, open the link on the same computer as this app.
                </Text>
              </View>
              <Pressable onPress={sendLink} disabled={loading}>
                <Text style={styles.link}>{loading ? 'Resending…' : 'Resend email'}</Text>
              </Pressable>
              <Pressable onPress={() => setStep('email')} disabled={loading}>
                <Text style={styles.linkMuted}>Use a different email</Text>
              </Pressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  header: { gap: 8 },
  brand: { fontSize: 13, fontWeight: '800', letterSpacing: 2, color: colors.primary },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { backgroundColor: colors.primaryDisabled },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  checkCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 20, gap: 12 },
  checkTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  checkBody: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  email: { fontWeight: '700', color: colors.text },
  bold: { fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, lineHeight: 19, color: colors.textFaint },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: colors.textMuted },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  linkMuted: { color: colors.textFaint, fontSize: 14, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
