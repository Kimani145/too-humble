import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';

type Theme = 'light' | 'dark';

type AppColors = Record<keyof typeof LIGHT_COLORS, string>;

interface ThemeContextValue {
  theme: Theme;
  colors: AppColors;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@too_humble_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');

  // Load persisted theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setTheme(storedTheme);
        } else if (systemScheme === 'dark') {
          setTheme('dark');
        }
      } catch (err) {
        console.error('[ThemeContext] Failed to load theme:', err);
      }
    };
    loadTheme();
  }, [systemScheme]);

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (err) {
      console.error('[ThemeContext] Failed to save theme:', err);
    }
  }, [theme]);

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const isDarkMode = theme === 'dark';

  const value: ThemeContextValue = {
    theme,
    colors,
    isDarkMode,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
