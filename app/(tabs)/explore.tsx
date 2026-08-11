// app/(tabs)/explore.tsx
import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import StickyVerse from '../../src/components/StickyVerse';
import GlobalHeader from '../../src/components/GlobalHeader';
import { useTheme } from '../../src/context/ThemeContext';
import { useTranslation } from '../../src/context/LanguageContext';
import { TYPOGRAPHY, SPACING } from '../../src/constants/theme';

export default function ExploreScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContent]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <GlobalHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StickyVerse />
        <View style={styles.comingSoon}>
          <View style={styles.iconCircle}>
            <Ionicons name="search-outline" size={48} color={colors.accent} />
          </View>
          <Text style={styles.comingSoonTitle}>{t('explore.coming_soon.title')}</Text>
          <Text style={styles.comingSoonText}>{t('explore.coming_soon.text')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    webContent: {
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center' as const,
    },
    header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
    title: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: '#FFFFFF' },
    subtitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.accentLight, marginTop: 4 },
    scrollContent: { padding: SPACING.base },
    comingSoon: {
      alignItems: 'center',
      paddingTop: SPACING['5xl'],
      paddingHorizontal: SPACING.xl,
    },
    iconCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.backgroundCard,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.lightGray,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    comingSoonTitle: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: '700',
      color: colors.charcoal,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    comingSoonText: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.midGray,
      textAlign: 'center',
      lineHeight: 24,
    },
  });
