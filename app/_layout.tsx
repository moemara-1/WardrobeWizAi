import { Colors } from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { hydrateFromSupabase, useClosetStore } from '@/stores/closetStore';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const APP_DARK_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.cardSurface,
    text: Colors.textPrimary,
    border: Colors.border,
    primary: Colors.accentGreen,
  },
};

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
      <ThemeProvider value={APP_DARK_THEME}>
        <RootNavigator fontsLoaded={loaded} />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const setUserId = useClosetStore((s) => s.setUserId);
  const hydratedRef = useRef<string | null>(null);

  // Hide splash only when both fonts AND auth are resolved
  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Wire auth session into the closet store and trigger hydration
  useEffect(() => {
    if (isLoading) return;

    const userId = session?.user?.id ?? null;
    setUserId(userId);

    if (userId && hydratedRef.current !== userId) {
      hydratedRef.current = userId;
      hydrateFromSupabase(userId);
    }

    if (!userId) {
      hydratedRef.current = null;
      // Clear local data on sign-out so next user doesn't see stale data
      useClosetStore.setState({
        items: [],
        outfits: [],
        posts: [],
        collections: [],
        savedFits: [],
        generatedLooks: [],
        digitalTwin: null,
        userProfile: { username: 'User', bio: '', pfp_url: undefined, followers: 0, following: 0 },
      });
    }
  }, [session, isLoading, setUserId]);

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
