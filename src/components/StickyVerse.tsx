// =============================================================================
// TOO HUMBLE - STICKY VERSE COMPONENT
// Anchors across tab views; auto-fetches daily verse, offline fallback
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
import { getDailyVerse } from '../services/bibleService';
import { DailyVerse } from '../types/database.types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface StickyVerseProps {
  onPress?: () => void;
}

export default function StickyVerse({ onPress }: StickyVerseProps): React.JSX.Element {
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
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadVerse();
  }, [loadVerse]);

  const handleShare = useCallback(async (): Promise<void> => {
    if (!verse) return;
    try {
      await Share.share({
        message: `"${verse.text}" — ${verse.reference}\n\nShared via Too Humble App 🙏`,
        title: 'Verse of the Day',
      });
    } catch {
      // Sharing dismissed
    }
  }, [verse]);

  // ----------------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------------
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.labelIcon}>📖</Text>
          <Text style={styles.label}>Verse of the Day</Text>
        </View>
        <ActivityIndicator color={COLORS.primary} size="small" style={styles.loader} />
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Error state
  // ----------------------------------------------------------------
  if (hasError || !verse) {
    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.labelIcon}>📖</Text>
          <Text style={styles.label}>Verse of the Day</Text>
        </View>
        <Text style={styles.errorText}>Unable to load verse. </Text>
        <TouchableOpacity onPress={loadVerse}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Verse display
  // ----------------------------------------------------------------
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.labelRow}>
          <Text style={styles.labelIcon}>📖</Text>
          <Text style={styles.label}>Verse of the Day</Text>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.verseText} numberOfLines={3}>
          {verse.text}
        </Text>
        <Text style={styles.reference}>{verse.reference}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.base,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelIcon: { fontSize: 16, marginRight: 6 },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  shareButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  verseText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.charcoal,
    lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  reference: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loader: { marginVertical: SPACING.md },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
    textAlign: 'center',
  },
  retryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});
