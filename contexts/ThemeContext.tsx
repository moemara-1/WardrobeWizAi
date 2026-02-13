import { ColorTheme, DarkColors, LightColors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    colors: ColorTheme;
    isDark: boolean;
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const STORAGE_KEY = 'wardrobewiz_theme_mode';

const ThemeContext = createContext<ThemeContextValue>({
    colors: DarkColors,
    isDark: true,
    mode: 'system',
    setMode: () => { },
    toggleTheme: () => { },
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [loaded, setLoaded] = useState(false);

    // Load persisted preference
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((val) => {
            if (val === 'light' || val === 'dark' || val === 'system') {
                setModeState(val);
            }
            setLoaded(true);
        });
    }, []);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        AsyncStorage.setItem(STORAGE_KEY, newMode);
    }, []);

    const isDark =
        mode === 'system'
            ? systemScheme !== 'light'
            : mode === 'dark';

    const toggleTheme = useCallback(() => {
        setMode(isDark ? 'light' : 'dark');
    }, [isDark, setMode]);

    const colors = isDark ? DarkColors : LightColors;

    return (
        <ThemeContext.Provider value={{ colors, isDark, mode, setMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/** Returns the currently active color palette */
export function useThemeColors(): ColorTheme {
    return useContext(ThemeContext).colors;
}

/** Returns full theme context (colors, isDark, toggle, etc.) */
export function useTheme() {
    return useContext(ThemeContext);
}
