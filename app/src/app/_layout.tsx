import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { BusinessProvider } from '@/lib/business';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BusinessProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#070B14' } }} />
        </BusinessProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
