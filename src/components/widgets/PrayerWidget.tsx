// =============================================================================
// TOO HUMBLE - PRAYER WIDGET
// Context panel widget showing today's prayer focus topic and prompt.
// Extracted from the inline JSX in HomeScreen — now a proper reusable component.
// =============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// Day-of-week prayer topics: 0 = Sunday, 6 = Saturday
const PRAYER_FOCUS: Record<number, { topic: string; prompt: string; icon: string }> = {
  0: { topic: 'Rest & Gratitude',   prompt: 'Give thanks for this week and rest in His peace.',                           icon: 'heart' },
  1: { topic: 'Work & Purpose',     prompt: 'Ask for clarity and diligence in today\'s tasks.',                           icon: 'briefcase' },
  2: { topic: 'Relationships',      prompt: 'Pray for the people in your life who need encouragement.',                   icon: 'people' },
  3: { topic: 'Wisdom',             prompt: 'Seek discernment for the decisions ahead of you.',                           icon: 'bulb' },
  4: { topic: 'Strength',           prompt: 'Ask for perseverance to finish the week well.',                              icon: 'flash' },
  5: { topic: 'Community',          prompt: 'Pray for your church and the Too Humble community.',                         icon: 'home' },
  6: { topic: 'Renewal',            prompt: 'Come before God in worship and surrender this Sunday.',                      icon: 'sunny' },
};

interface PrayerWidgetProps {
  /** Optional: override the day-of-week (0–6). Defaults to today. */
  dayOverride?: number;
  onPrayPress?: () => void;
}

export default function PrayerWidget({
  dayOverride,
  onPrayPress,
}: PrayerWidgetProps): React.JSX.Element {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const dayIndex = dayOverride ?? new Date().getDay();
  const focus = PRAYER_FOCUS[dayIndex] ?? PRAYER_FOCUS[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="hand-right" size={15} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.label}>PRAYER FOCUS</Text>
      </View>

      {/* Topic */}
      <View style={styles.topicRow}>
        <Ionicons
          name={focus.icon as any}
          size={18}
          color={colors.accent}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.topic}>{focus.topic}</Text>
      </View>

      {/* Prompt */}
      <Text style={styles.prompt}>{focus.prompt}</Text>

      {/* CTA */}
      {onPrayPress && (
        <TouchableOpacity
          style={[styles.prayBtn, { backgroundColor: colors.primary }]}
          onPress={onPrayPress}
          activeOpacity={0.8}
        >
          <Ionicons name="hand-right-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.prayBtnText}>Pray Now</Text>
        </TouchableOpacity>
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
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    topic: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: '700',
      color: colors.charcoal,
    },
    prompt: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.darkGray,
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.7,
      marginBottom: SPACING.md,
    },
    prayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.full,
      alignSelf: 'flex-start',
    },
    prayBtnText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
