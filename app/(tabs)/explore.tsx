// app/(tabs)/explore.tsx
import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StickyVerse from '../../src/components/StickyVerse';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';

export default function ExploreScreen(): React.JSX.Element {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.backgroundPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Discover, grow and strengthen your faith</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: SPACING.base }}>
        <StickyVerse />
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonEmoji}>🔍</Text>
          <Text style={styles.comingSoonTitle}>Explore Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            Search prayers, verses, videos, and topics — launching in the next update.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
  title: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: COLORS.white },
  subtitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.accentLight, marginTop: 4 },
  comingSoon: { alignItems: 'center', paddingTop: SPACING['5xl'] },
  comingSoonEmoji: { fontSize: 48, marginBottom: SPACING.md },
  comingSoonTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.sm },
  comingSoonText: { fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.midGray, textAlign: 'center', lineHeight: 24 },
});
