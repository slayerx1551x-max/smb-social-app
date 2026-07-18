import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, Field, OnboardingScreen, PrimaryButton } from '@/components/onboarding';
import { colors } from '@/lib/theme';
import { useBusiness } from '@/lib/business';
import { supabase } from '@/lib/supabase';
import { BUSINESS_TYPES, TONES } from '@/lib/onboarding-options';

export default function Profile() {
  const router = useRouter();
  const { business, refresh } = useBusiness();

  const [name, setName] = useState(business?.name ?? '');
  const [type, setType] = useState<string | null>(business?.type ?? null);
  const [description, setDescription] = useState(business?.description ?? '');
  const [tone, setTone] = useState<string | null>(business?.tone ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = name.trim().length > 1;

  async function onContinue() {
    setError(null);
    setSaving(true);
    try {
      if (business) {
        const { error: e } = await supabase
          .from('businesses')
          .update({
            name: name.trim(),
            type: type ?? null,
            description: description.trim() || null,
            tone: tone ?? null,
          })
          .eq('id', business.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.rpc('create_business', {
          p_name: name.trim(),
          p_type: type ?? undefined,
          p_description: description.trim() || undefined,
          p_tone: tone ?? undefined,
        });
        if (e) throw e;
      }
      await refresh();
      router.push('/(onboarding)/brand');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingScreen
      step={1}
      title="About your business"
      subtitle="This is what the AI tools read to write and design on-brand content."
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Continue" onPress={onContinue} disabled={!canContinue} loading={saving} />
        </>
      }
    >
      <Field label="Business name">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bella's Trattoria"
          placeholderTextColor={colors.textFaint}
          editable={!saving}
        />
      </Field>

      <Field label="What kind of business?">
        <View style={styles.wrap}>
          {BUSINESS_TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </Field>

      <Field label="Describe it in a sentence or two">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Family-run Italian spot known for wood-fired pizza and fresh pasta."
          placeholderTextColor={colors.textFaint}
          multiline
          editable={!saving}
        />
      </Field>

      <Field label="Brand voice">
        <View style={styles.wrap}>
          {TONES.map((t) => (
            <Chip
              key={t.label}
              label={t.label}
              hint={t.hint}
              selected={tone === t.label}
              onPress={() => setTone(t.label)}
            />
          ))}
        </View>
      </Field>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
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
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: 4 },
});
