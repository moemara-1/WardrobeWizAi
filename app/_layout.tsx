import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppThemeProvider, useTheme, useThemeColors } from '@/contexts/ThemeContext';
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

// Dynamic Theme wrapper component to read the context values
function ThemeWrapper({ children, fontsLoaded }: { children: React.ReactNode; fontsLoaded: boolean }) {
  const { isDark } = useTheme();
  const Colors = useThemeColors();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: Colors.background,
      card: Colors.cardSurface,
      text: Colors.textPrimary,
      border: Colors.border,
      primary: Colors.accentGreen,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      {children}
    </ThemeProvider>
  );
}

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
    <AppThemeProvider>
      <AuthProvider>
        <ThemeWrapper fontsLoaded={loaded}>
          <RootNavigator fontsLoaded={loaded} />
        </ThemeWrapper>
      </AuthProvider>
    </AppThemeProvider>
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
    </Stack>
  );
}
