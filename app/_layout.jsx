import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { AuthProvider, useSession } from '../contexts/AuthContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import { migrate } from '../lib/dao/Database';

function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize SQLite database on app startup
    migrate().catch(err => console.error('[SQLite] Migration failed:', err));
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ConfigProvider>
          <RootNavigator />
        </ConfigProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}