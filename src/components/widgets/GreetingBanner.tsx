// =============================================================================
// TOO HUMBLE - GREETING BANNER
// Web-only desktop dashboard greeting and date header
// Includes devotional streak badge read from AsyncStorage.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { WEB_GRID } from '../../constants/webLayout';
import { getReadingStreak } from '../../services/streakService';

interface GreetingBannerProps {
  userName: string;
  avatarUrl: string | null;
  onNotifications: () => void;
}

export default function GreetingBanner({
  userName,
  avatarUrl,
  onNotifications,
}: GreetingBannerProps): React.JSX.Element {
  const { colors } = useTheme();
  const [streakDays, setStreakDays] = useState<number>(0);

  useEffect(() => {
    getReadingStreak()
      .then((s) => setStreakDays(s.days))
      .catch(() => setStreakDays(0));
  }, []);

  // split on space, take index 0
  const firstName = userName.trim().split(' ')[0] || 'Friend';

  // Greeting based on hour
  const currentHour = new Date().getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon';
  } else if (currentHour >= 17) {
    greeting = 'Good evening';
  }

  // Get formatted date
  const getFormattedDate = (): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  };

  const initial = firstName.charAt(0).toUpperCase() || 'F';

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left side */}
      <View style={styles.left}>
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {`${greeting}, ${firstName} ✝`}
          </Text>
          {streakDays > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '44' }]}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={[styles.streakText, { color: colors.accent }]}>{streakDays}d</Text>
            </View>
          )}
        </View>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {getFormattedDate()}
        </Text>
        <Text style={{ fontSize: 12, color: colors.accent, marginTop: 4 }}>
          {streakDays > 0 ? `🔥 ${streakDays}-day streak` : 'Start your streak today →'}
        </Text>
      </View>

      {/* Right side */}
      <View style={styles.right}>
        <TouchableOpacity
          onPress={onNotifications}
          activeOpacity={0.7}
          style={styles.bellBtn}
        >
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>

        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarInitials, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.white }]}>{initial}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WEB_GRID.CONTENT_PADDING,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  left: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakFlame: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    fontSize: 13,
    marginTop: 4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    padding: 6,
  },
  bellIcon: {
    fontSize: 20,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
