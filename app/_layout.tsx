import { AuthProvider } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_400Regular, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={APP_DARK_THEME}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" options={{ headerShown: false }} />
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
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
