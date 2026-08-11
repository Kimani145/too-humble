// =============================================================================
// TOO HUMBLE - VERSE WIDGET
// Desktop hero treatment for the daily verse. Full-width, generous typography.
// Wraps the existing getDailyVerse() service — same data, intentional layout.
// =============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getDailyVerse } from '../../services/bibleService';
import { DailyVerse } from '../../types/database.types';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// -----------------------------------------------------------------------
// Skeleton loader — communicates loading without an empty region
// -----------------------------------------------------------------------
function VerseSkeleton({ colors }: { colors: any }): React.JSX.Element {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const skeletonBg = { backgroundColor: colors.lightGray, borderRadius: 4 };

  return (
    <Animated.View style={{ opacity: pulse }}>
      <View style={[skeletonBg, { height: 14, width: '30%', marginBottom: 16 }]} />
      <View style={[skeletonBg, { height: 20, width: '90%', marginBottom: 8 }]} />
      <View style={[skeletonBg, { height: 20, width: '75%', marginBottom: 8 }]} />
      <View style={[skeletonBg, { height: 20, width: '60%', marginBottom: 16 }]} />
      <View style={[skeletonBg, { height: 14, width: '25%' }]} />
    </Animated.View>
  );
}

// -----------------------------------------------------------------------
// Main widget
// -----------------------------------------------------------------------
export default function VerseWidget(): React.JSX.Element {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);

  const [verse, setVerse] = useState<DailyVerse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadVerse = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setHasError(false);
    try {
      const daily = await getDailyVerse();
      setVerse(daily);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadVerse();
  }, [loadVerse]);

  const handleShare = useCallback(async (): Promise<void> => {
    if (!verse) return;
    try {
      await Share.share({
        message: `"${verse.text}" — ${verse.reference}\n\nShared via Too Humble 🙏`,
        title: 'Verse of the Day',
      });
    } catch {
      // Dismissed
    }
  }, [verse]);

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Ionicons name="book" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.label}>VERSE OF THE DAY</Text>
        </View>
        {!isLoading && !hasError && verse && (
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareBtn}
            activeOpacity={0.7}
            accessibilityLabel="Share verse"
          >
            <Ionicons name="share-social-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <VerseSkeleton colors={colors} />
      ) : hasError || !verse ? (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>
            "Seek the Lord and his strength; seek his presence continually."
          </Text>
          <Text style={styles.errorReference}>— Psalm 105:4</Text>
          <TouchableOpacity onPress={loadVerse} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.verseText}>"{verse.text}"</Text>
          <Text style={styles.reference}>— {verse.reference}</Text>
        </Animated.View>
      )}

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaRow}
        onPress={() => router.push('/(tabs)/bible')}
        activeOpacity={0.75}
      >
        <Text style={styles.ctaText}>Open in Bible</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.lightGray,
      ...SHADOWS.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    label: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
    },
    shareBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.lightGray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verseText: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      color: colors.charcoal,
      lineHeight: TYPOGRAPHY.fontSize.lg * 1.7,
      fontStyle: 'italic',
      marginBottom: SPACING.sm,
      fontWeight: '400',
    },
    reference: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: SPACING.md,
    },
    errorState: {
      marginBottom: SPACING.md,
    },
    errorText: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.charcoal,
      lineHeight: TYPOGRAPHY.fontSize.base * 1.7,
      fontStyle: 'italic',
      marginBottom: SPACING.xs,
    },
    errorReference: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: SPACING.sm,
    },
    retryBtn: {
      alignSelf: 'flex-start',
    },
    retryText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.accent,
      fontWeight: '700',
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: SPACING.sm,
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: colors.lightGray,
    },
    ctaText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: colors.primary,
    },
  });
