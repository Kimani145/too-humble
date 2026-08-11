import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppColors {
  primary:           string;
  primaryLight:      string;
  primaryDark:       string;
  accent:            string;
  accentLight:       string;
  white:             string;
  offWhite:          string;
  backgroundPrimary: string;
  backgroundCard:    string;
  textPrimary:       string;
  textSecondary:     string;
  textMuted:         string;
  border:            string;
  lightGray:         string;
  midGray:           string;
  darkGray:          string;
  charcoal:          string;
  overlayDark:       string;
  overlayLight:      string;
  danger:            string;
  success:           string;
  warning:           string;
}

const LIGHT_COLORS: AppColors = {
  primary:           '#1A2B5E',
  primaryLight:      '#2C4A9E',
  primaryDark:       '#0E1B3D',
  accent:            '#FFB347',
  accentLight:       '#FFD166',
  white:             '#FFFFFF',
  offWhite:          '#F8F9FF',
  backgroundPrimary: '#F0F4FF',
  backgroundCard:    '#FFFFFF',
  textPrimary:       '#1A2B5E',
  textSecondary:     '#2C4A9E',
  textMuted:         '#8892B0',
  border:            '#D1D9F0',
  lightGray:         '#E8ECF4',
  midGray:           '#8892B0',
  darkGray:          '#4A5578',
  charcoal:          '#2D3561',
  overlayDark:       'rgba(10,13,22,0.7)',
  overlayLight:      'rgba(255,255,255,0.12)',
  danger:            '#E74C3C',
  success:           '#27AE60',
  warning:           '#F39C12',
};

const DARK_COLORS: AppColors = {
  primary:           '#4A7CF7',
  primaryLight:      '#6B94FF',
  primaryDark:       '#2D5BD4',
  accent:            '#FFB347',
  accentLight:       '#FFD166',
  white:             '#0D1117',
  offWhite:          '#161B22',
  backgroundPrimary: '#0D1117',
  backgroundCard:    '#161B22',
  textPrimary:       '#E6EDF3',
  textSecondary:     '#8B949E',
  textMuted:         '#6E7681',
  border:            '#30363D',
  lightGray:         '#21262D',
  midGray:           '#6E7681',
  darkGray:          '#8B949E',
  charcoal:          '#C9D1D9',
  overlayDark:       'rgba(0,0,0,0.8)',
  overlayLight:      'rgba(255,255,255,0.08)',
  danger:            '#F85149',
  success:           '#3FB950',
  warning:           '#D29922',
};

interface ThemeContextValue {
  isDark: boolean;
  colors: AppColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load persisted theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === 'true') {
          setIsDark(true);
        } else {
          setIsDark(false);
        }
      } catch (err) {
        console.error('[ThemeContext] Failed to load theme:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = useCallback(async () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'true' : 'false').catch((err) => {
        console.error('[ThemeContext] Failed to save theme:', err);
      });
      return next;
    });
  }, []);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value: ThemeContextValue = {
    isDark,
    colors,
    toggleTheme,
  };

  // Prevent flash of light theme during load if possible (optional, but keep it clean)
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
