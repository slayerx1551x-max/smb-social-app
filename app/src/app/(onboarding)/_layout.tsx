import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useBusiness } from '@/lib/business';

export default function OnboardingLayout() {
  const { session, initializing } = useAuth();
  const { loading, needsOnboarding } = useBusiness();

  if (initializing || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!needsOnboarding) return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
