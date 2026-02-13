import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

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

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppThemeProvider>
        <ThemedApp fontsLoaded={loaded} />
      </AppThemeProvider>
    </AuthProvider>
  );
}

function ThemedApp({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, isDark } = useTheme();

  const navTheme = isDark
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.cardSurface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accentGreen,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.cardSurface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.accentGreen,
      },
    };

  return (
    <ThemeProvider value={navTheme}>
      <RootNavigator fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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

  return (
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
      <Stack.Screen
        name="privacy-policy"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="closet-value"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
