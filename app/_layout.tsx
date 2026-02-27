import AnimatedSplash from '@/components/AnimatedSplash';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Removed static APP_DARK_THEME to use dynamic theme inside RootNavigator

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_400Regular,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => { }), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppThemeProvider>
        <RootNavigator fontsLoaded={loaded} />
      </AppThemeProvider>
    </AuthProvider>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  // Hide splash only when both fonts AND auth are resolved
  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Auth-based routing
  useEffect(() => {
    if (isLoading) return;

    const inLoginScreen = segments[0] === 'login';

    if (!session && !inLoginScreen) {
      router.replace('/login');
    } else if (session && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.cardSurface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accentGreen,
      },
    };
  }, [isDark, colors]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="analyze"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="digital-twin"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="digital-twin-preview"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="style-chat"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="search-to-add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="import-fit-pic"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="virtual-try-on"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="virtual-try-on-result"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="trip-planner"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="trip-result"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      {fontsLoaded && showSplash && (
        <AnimatedSplash onFinish={() => setShowSplash(false)} />
      )}
    </ThemeProvider>
  );
}
