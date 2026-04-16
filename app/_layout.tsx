import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/Colors';

export { ErrorBoundary } from 'expo-router';

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

function RootNav() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, isOnboarded } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && !isOnboarded && (segments as string[])[1] !== 'onboarding') {
      router.replace('/(auth)/onboarding' as any);
    } else if (user && isOnboarded && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [user, isLoading, isOnboarded, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="recipe/[id]"
        options={{ headerShown: true, title: 'Recipe', presentation: 'card' }}
      />
      <Stack.Screen
        name="cooking/[id]"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="waste-dashboard" options={{ headerShown: true }} />
      <Stack.Screen name="meal-plan" options={{ headerShown: true }} />
      <Stack.Screen name="household" options={{ headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initialize().finally(() => {
      if (loaded) SplashScreen.hideAsync();
    });
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <RootNav />
    </QueryClientProvider>
  );
}
