// app/(tabs)/notifications.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

const MOCK_NOTIFICATIONS = [
  { id: '1', emoji: '📖', title: 'New quote added', time: '2 minutes ago' },
  { id: '2', emoji: '📜', title: 'New story: Noah and the Ark', time: '1 hour ago' },
  { id: '3', emoji: '▶️', title: 'New video uploaded', time: '3 hours ago' },
  { id: '4', emoji: '❤️', title: 'Your post got 10 likes', time: '5 hours ago' },
];

export default function NotificationsScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.content}>
        {MOCK_NOTIFICATIONS.map((n) => (
          <View key={n.id} style={styles.notifRow}>
            <Text style={styles.notifEmoji}>{n.emoji}</Text>
            <View style={styles.notifInfo}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifTime}>{n.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
  title: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: COLORS.white },
  content: { padding: SPACING.base },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  notifEmoji: { fontSize: 28, marginRight: SPACING.md },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '600', color: COLORS.charcoal },
  notifTime: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 4 },
});
