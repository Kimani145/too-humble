// =============================================================================
// TOO HUMBLE - FORGOT PASSWORD SCREEN
// Sends Supabase password reset email; shows confirmation state
// =============================================================================

import React, { useState, useCallback } from 'react';
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
import { supabase } from '../../lib/supabase';
import { useTheme, AppColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import BrandText from '../../components/BrandText';

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export default function ForgotPasswordScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);

  const handleSendReset = useCallback(async (): Promise<void> => {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setIsSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'toohumble://auth/reset-password',
      });
      if (error) throw error;
      setIsSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email.';
      Alert.alert('Error', message);
    } finally {
      setIsSending(false);
    }
  }, [email]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.headerGradient}>
        <BrandText size={36} colorMode="dark" style={{ marginBottom: SPACING.sm }} />
        <Text style={styles.brandTagline}>Password Recovery</Text>
      </LinearGradient>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSent ? (
          /* ---- Confirmation state ---- */
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successBody}>
              We've sent a password reset link to{'\n'}
              <Text style={styles.successEmail}>{email.trim()}</Text>
            </Text>
            <Text style={styles.successNote}>
              The link expires in 60 minutes. Check your spam folder if you don't see it.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/auth/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resendLink}
              onPress={() => { setIsSent(false); setEmail(''); }}
            >
              <Text style={styles.resendText}>Try a different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ---- Form state ---- */
          <>
            <Text style={styles.heading}>Forgot Password?</Text>
            <Text style={styles.subheading}>
              Enter your registered email and we'll send you a link to reset your password.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(null); }}
                  placeholder="yourname@email.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSendReset}
                  editable={!isSending}
                />
              </View>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSending ? styles.buttonDisabled : null]}
              onPress={handleSendReset}
              disabled={isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelText}>← Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.backgroundPrimary },
    headerGradient: {
      alignItems: 'center',
      paddingTop: 60,
      paddingBottom: SPACING['3xl'],
    },
    headerIcon: { fontSize: 40, marginBottom: SPACING.md },
    brandName: {
      fontSize: TYPOGRAPHY.fontSize['2xl'],
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 3,
    },
    brandTagline: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.accentLight,
      marginTop: SPACING.xs,
    },
    formContainer: { flex: 1, backgroundColor: colors.backgroundPrimary },
    formContent: {
      paddingHorizontal: SPACING['2xl'],
      paddingTop: SPACING['2xl'],
      paddingBottom: SPACING['5xl'],
    },
    heading: {
      fontSize: TYPOGRAPHY.fontSize['2xl'],
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    subheading: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
      marginBottom: SPACING['2xl'],
    },
    fieldGroup: { marginBottom: SPACING.lg },
    label: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: SPACING.xs,
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
    errorText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.danger,
      marginTop: 4,
      marginLeft: 2,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.md,
    },
    buttonDisabled: { opacity: 0.6 },
    submitButtonText: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: '700',
      color: colors.white,
      letterSpacing: 0.5,
    },
    cancelLink: {
      alignItems: 'center',
      marginTop: SPACING['2xl'],
    },
    cancelText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.primary,
      fontWeight: '600',
    },
    // Success state
    successContainer: {
      alignItems: 'center',
      paddingTop: SPACING['2xl'],
    },
    successIcon: { fontSize: 64, marginBottom: SPACING['2xl'] },
    successTitle: {
      fontSize: TYPOGRAPHY.fontSize['2xl'],
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: SPACING.base,
      textAlign: 'center',
    },
    successBody: {
      fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.fontSize.base * 1.6,
      marginBottom: SPACING.base,
    },
    successEmail: {
      color: colors.primary,
      fontWeight: '700',
    },
    successNote: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.6,
      marginBottom: SPACING['3xl'],
      paddingHorizontal: SPACING.xl,
    },
    backButton: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      height: 54,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.md,
    },
    backButtonText: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: '700',
      color: colors.white,
    },
    resendLink: {
      marginTop: SPACING['2xl'],
      alignItems: 'center',
    },
    resendText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.primary,
      fontWeight: '600',
    },
  });
