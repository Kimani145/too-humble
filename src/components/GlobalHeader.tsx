// =============================================================================
// TOO HUMBLE - GLOBAL HEADER COMPONENT
// Top bar row: Logo ==> Theme Switcher (Sun/Moon) ==> Notification Bell
// Centered on baseline, 16px side margin, clears dynamic island crowding
// =============================================================================

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import BrandText from './BrandText';
import { SPACING } from '../constants/theme';

export default function GlobalHeader(): React.JSX.Element {
  const router = useRouter();
  const { isDark, colors, toggleTheme } = useTheme();

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.appBar}
    >
      <View style={styles.appBarContent}>
        {/* Logo */}
        <BrandText size={22} colorMode="dark" />

        {/* Right side actions */}
        <View style={styles.actionsRow}>
          {/* Theme switcher */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.iconButton}
            accessibilityLabel="Toggle Theme"
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Notification bell */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  appBar: {
    paddingTop: 52, // Clears dynamic island / status bar
    paddingBottom: SPACING.md,
  },
  appBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // Standard 16px side margin
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
