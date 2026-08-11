// =============================================================================
// TOO HUMBLE - CALENDAR WIDGET
// 30-day horizontal date strip, prop-driven with no internal data fetching.
// Used by HomeScreen on mobile and HomeDesktopLayout on desktop.
// =============================================================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants/theme';

export interface CalendarDay {
  date: Date;
  label: string;   // e.g. 'Mon'
  dayNum: number;  // e.g. 28
  month: string;   // e.g. 'Jul'
}

interface CalendarWidgetProps {
  days: CalendarDay[];
  selectedIndex: number;
  todayIndex: number;
  onSelectDay: (index: number) => void;
}

export default function CalendarWidget({
  days,
  selectedIndex,
  todayIndex,
  onSelectDay,
}: CalendarWidgetProps): React.JSX.Element {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: todayIndex * 70, animated: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [todayIndex]);

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.wrapper}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {days.map((day, index) => {
          const isSelected = index === selectedIndex;
          const isToday = index === todayIndex;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected ? [styles.dayCellActive, { backgroundColor: colors.accent }] : null,
              ]}
              onPress={() => onSelectDay(index)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.monthLabel,
                  isSelected ? styles.activeText : null,
                ]}
              >
                {day.month}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected ? styles.activeText : null,
                  isToday && !isSelected ? { color: colors.accent } : null,
                ]}
              >
                {day.dayNum}
              </Text>
              {isToday && (
                <View
                  style={[
                    styles.todayDot,
                    { backgroundColor: isSelected ? '#0A0D16' : colors.accent },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  strip: {
    marginBottom: 0,
  },
  stripContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  dayCell: {
    alignItems: 'center',
    width: 60,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  dayCellActive: {
    // backgroundColor set dynamically
  },
  monthLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeText: {
    color: '#0A0D16',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
});
