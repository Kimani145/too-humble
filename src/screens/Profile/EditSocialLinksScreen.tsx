import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, AppColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function EditSocialLinksScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Social Links</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Ministry Social Presence</Text>
        <Text style={styles.sectionSubtitle}>
          Ministry social links are managed by church administrators and presented to all community members. Use the Share button on posts to share content directly to your social apps.
        </Text>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.backgroundPrimary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 52,
      paddingBottom: SPACING.base,
      paddingHorizontal: SPACING.base,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.overlayLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: { fontSize: 20, color: colors.white, fontWeight: '700' },
    headerTitle: {
      flex: 1,
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: '700',
      color: colors.white,
      textAlign: 'center',
    },
    headerRight: { width: 40 },
    body: { flex: 1, backgroundColor: colors.backgroundPrimary },
    bodyContent: {
      paddingHorizontal: SPACING['2xl'],
      paddingTop: SPACING['2xl'],
      paddingBottom: SPACING['5xl'],
    },
    sectionTitle: {
      fontSize: TYPOGRAPHY.fontSize.xl,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    sectionSubtitle: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.fontSize.base * 1.5,
      marginBottom: SPACING['2xl'],
    },
  });
