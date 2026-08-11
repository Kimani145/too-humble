// =============================================================================
// TOO HUMBLE - EDIT SOCIAL LINKS SCREEN
// Lets users update their Facebook profile link (fb_link on profiles table)
// Validates URL format against the DB check constraint before writing
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { ProfileUpdate } from '../../types/database.types';
import { supabase } from '../../lib/supabase';
import { useTheme, AppColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// DB CHECK constraint pattern: https://(www\.)?facebook\.com/[A-Za-z0-9\._\-]+
const FACEBOOK_REGEX = /^https:\/\/(www\.)?facebook\.com\/[A-Za-z0-9._\-]+$/;

function validateFbLink(link: string): string | null {
  if (!link.trim()) return null; // Empty is allowed (nullable field)
  if (!FACEBOOK_REGEX.test(link.trim())) {
    return 'Must be a valid Facebook URL — e.g. https://facebook.com/yourname';
  }
  return null;
}

export default function EditSocialLinksScreen(): React.JSX.Element {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [fbLink, setFbLink] = useState<string>(profile?.fb_link ?? '');
  const [fbError, setFbError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Sync if profile loads async
  useEffect(() => {
    if (profile?.fb_link !== undefined) {
      setFbLink(profile.fb_link ?? '');
    }
  }, [profile?.fb_link]);

  const handleSave = useCallback(async (): Promise<void> => {
    const err = validateFbLink(fbLink);
    setFbError(err);
    if (err) return;

    if (!user) { Alert.alert('Not authenticated'); return; }

    setIsSaving(true);
    try {
      const payload: ProfileUpdate = {
        fb_link: fbLink.trim() || null,
      };
      const { error } = await supabase
        .from('profiles')
        .update(payload as ProfileUpdate)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('Saved ✅', 'Your social links have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [fbLink, user, refreshProfile, router]);

  const handleClear = useCallback((): void => {
    setFbLink('');
    setFbError(null);
    setIsDirty(true);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Connect Your Profiles</Text>
        <Text style={styles.sectionSubtitle}>
          Your social links are visible to other community members.
        </Text>

        {/* Facebook */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.socialIcon}>📘</Text>
            <Text style={styles.label}>Facebook Profile URL</Text>
          </View>
          <View style={[styles.inputWrapper, fbError ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              value={fbLink}
              onChangeText={(t) => {
                setFbLink(t);
                setIsDirty(true);
                if (fbError) setFbError(null);
              }}
              placeholder="https://facebook.com/yourname"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              autoComplete="url"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              editable={!isSaving}
            />
            {fbLink.length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                style={styles.clearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {fbError && <Text style={styles.errorText}>{fbError}</Text>}
          <Text style={styles.hint}>
            Only facebook.com URLs are accepted. Leave empty to remove.
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!isDirty || isSaving) ? styles.saveBtnDisabled : null]}
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          🔒 Your data is stored securely and only shared within the Too Humble community.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
    fieldGroup: { marginBottom: SPACING['2xl'] },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
      gap: SPACING.sm,
    },
    socialIcon: { fontSize: 22 },
    label: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundCard,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: SPACING.base,
      ...SHADOWS.sm,
    },
    inputError: { borderColor: colors.danger },
    input: {
      flex: 1,
      height: 52,
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.textPrimary,
    },
    clearBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.lightGray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearIcon: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
    errorText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.danger,
      marginTop: 4,
      marginLeft: 2,
    },
    hint: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.textMuted,
      marginTop: SPACING.xs,
      marginLeft: 2,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING['2xl'],
      ...SHADOWS.md,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: '700',
      color: colors.white,
      letterSpacing: 0.5,
    },
    privacyNote: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.fontSize.xs * 1.6,
    },
  });
