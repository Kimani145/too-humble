// =============================================================================
// TOO HUMBLE - READING PROGRESS WIDGET
// Context panel widget. Shows reading streak and last verse when available.
// Falls back to a purposeful placeholder state — no fake data, no empty boxes.
// Streak is tracked locally via AsyncStorage (no schema change required).
// =============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { getReadingStreak, ReadingStreak } from '../../services/streakService';

export default function ReadingProgressWidget(): React.JSX.Element {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);

  const [streak, setStreak] = useState<ReadingStreak>({
    days: 0,
    lastReference: null,
  });

  useEffect(() => {
    getReadingStreak().then(setStreak).catch(() => {});
  }, []);

  const hasProgress = streak.lastReference !== null || streak.days > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="book-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.label}>READING PROGRESS</Text>
      </View>

      {hasProgress ? (
        <>
          {/* Streak */}
          {streak.days > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakFlame}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{`${streak.days} day${streak.days !== 1 ? 's' : ''}`}</Text>
                <Text style={styles.streakCaption}>Keep it going!</Text>
              </View>
            </View>
          )}

          {/* Last read */}
          {streak.lastReference && (
            <View style={[styles.lastReadCard, { backgroundColor: colors.offWhite }]}>
              <Ionicons name="bookmark" size={14} color={colors.accent} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lastReadLabel}>Continue reading</Text>
                <Text style={styles.lastReadRef}>{streak.lastReference ?? 'Start reading'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.midGray} />
            </View>
          )}

          <TouchableOpacity
            style={styles.ctaRow}
            onPress={() => router.push('/(tabs)/bible')}
            activeOpacity={0.75}
          >
            <Text style={styles.ctaText}>Open Bible</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </>
      ) : (
        /* Placeholder state — intentional, not empty */
        <View style={styles.placeholderState}>
          <View style={[styles.placeholderIcon, { backgroundColor: colors.offWhite }]}>
            <Ionicons name="book-outline" size={28} color={colors.midGray} />
          </View>
          <Text style={styles.placeholderTitle}>No reading plan yet</Text>
          <Text style={styles.placeholderSubtext}>
            Start a daily Bible reading plan and track your progress here.
          </Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/bible')}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>Start Reading →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.lightGray,
      ...SHADOWS.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    label: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: SPACING.md,
    },
    streakFlame: {
      fontSize: 28,
    },
    streakCount: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: '700',
      color: colors.charcoal,
    },
    streakCaption: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.midGray,
      marginTop: 1,
    },
    lastReadCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    lastReadLabel: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.midGray,
      marginBottom: 2,
    },
    lastReadRef: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: colors.charcoal,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ctaText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: colors.primary,
    },
    // Placeholder state
    placeholderState: {
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    placeholderIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    placeholderTitle: {
      fontSize: TYPOGRAPHY.fontSize.base,
      fontWeight: '700',
      color: colors.charcoal,
      marginBottom: SPACING.xs,
    },
    placeholderSubtext: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.midGray,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.6,
      marginBottom: SPACING.md,
    },
    startBtn: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.full,
    },
    startBtnText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
