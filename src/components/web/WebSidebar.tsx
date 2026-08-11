import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import BrandText from '../BrandText';

interface WebSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { href: '/home',      icon: 'home', label: 'Home' },
  { href: '/explore',   icon: 'compass', label: 'Explore' },
  { href: '/bible',     icon: 'book', label: 'Bible' },
  { href: '/community', icon: 'people', label: 'Community' },
  { href: '/profile',   icon: 'person', label: 'Profile' },
] as const;

export default function WebSidebar({
  isCollapsed,
  onToggle,
}: WebSidebarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, colors, toggleTheme } = useTheme();

  // Animation for width
  const widthAnim = useRef(new Animated.Value(isCollapsed ? 64 : 240)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isCollapsed ? 64 : 240,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, widthAnim]);

  return (
    <Animated.View style={[styles.sidebarContainer, { width: widthAnim, backgroundColor: colors.primaryDark }]}>
      {/* Top section: Logo */}
      <View style={styles.logoSection}>
        {isCollapsed ? (
          <View style={{ width: 24, height: 24, overflow: 'hidden', paddingLeft: 4 }}>
            <BrandText size={18} colorMode="dark" style={{ width: 12, overflow: 'hidden' }} />
          </View>
        ) : (
          <BrandText size={18} colorMode="dark" />
        )}
      </View>

      {/* Middle section: Nav items */}
      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (pathname === '/' && item.href === '/home');
          const itemStyle: StyleProp<ViewStyle> = [
            styles.navRow,
            isActive
              ? [styles.navRowActive, { backgroundColor: colors.accent }]
              : styles.navRowInactive,
          ];

          return (
            <TouchableOpacity
              key={item.href}
              style={itemStyle}
              onPress={() => router.push(item.href)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? (item.icon as any) : (`${item.icon}-outline` as any)}
                size={20}
                color={isActive ? '#0A0D16' : 'rgba(255, 255, 255, 0.7)'}
                style={[styles.navIcon, isCollapsed && { marginRight: 0 }]}
              />
              {!isCollapsed && (
                <Text style={[styles.navLabel, { color: colors.white }]} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom section pinned to bottom */}
      <View style={styles.bottomSection}>
        {/* Theme toggle */}
        <TouchableOpacity style={styles.bottomBtn} onPress={toggleTheme} activeOpacity={0.7}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>

        {/* Collapse toggle */}
        <TouchableOpacity style={styles.bottomBtn} onPress={onToggle} activeOpacity={0.7}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: {
    height: '100%',
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoSection: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  navSection: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  navRowActive: {
    // Handled dynamically
  },
  navRowInactive: {
    backgroundColor: 'transparent',
  },
  navIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  bottomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
