// =============================================================================
// TOO HUMBLE - REGISTER SCREEN
// Strong validation, full_name capture, role default 'client'
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
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';

const { width } = Dimensions.get('window');

// -----------------------------------------------------------------------
// Validation helpers
// -----------------------------------------------------------------------
function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Full name is required.';
  if (trimmed.length < 2) return 'Name must be at least 2 characters.';
  if (trimmed.length > 80) return 'Name must be under 80 characters.';
  return null;
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/]/.test(password))
    return 'Password must contain at least one special character.';
  return null;
}

function validateConfirmPassword(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

// Password strength indicator
function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score; // 0-5
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = [
  COLORS.error,
  COLORS.error,
  COLORS.warning,
  COLORS.warning,
  COLORS.success,
  COLORS.success,
];

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const { register, loginWithGoogle, isLoading } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errors, setErrors] = useState<{
    fullName: string | null;
    email: string | null;
    password: string | null;
    confirmPassword: string | null;
  }>({ fullName: null, email: null, password: null, confirmPassword: null });

  const strength = passwordStrength(password);

  // ----------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------
  const handleRegister = useCallback(async (): Promise<void> => {
    const newErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((e) => e !== null);
    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      await register(email.trim().toLowerCase(), password, fullName.trim());
      Alert.alert(
        'Account Created! 🎉',
        'Welcome to Too Humble! Please check your email to verify your account, then log in.',
        [{ text: 'Go to Login', onPress: () => router.replace('/auth/login') }]
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [fullName, email, password, confirmPassword, register, router]);

  const handleGoogleSignUp = useCallback(async (): Promise<void> => {
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in failed.';
      Alert.alert('Sign Up Failed', message);
    }
  }, [loginWithGoogle]);

  // ----------------------------------------------------------------
  // Field helpers
  // ----------------------------------------------------------------
  function clearError(field: keyof typeof errors): void {
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  const isBusy = isSubmitting || isLoading;

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.logoContainer}>
          <View style={styles.crossVertical} />
          <View style={styles.crossHorizontal} />
        </View>
        <Text style={styles.brandName}>TOO HUMBLE</Text>
        <Text style={styles.brandTagline}>Join Too Humble Community</Text>
      </LinearGradient>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Join Too Humble Community</Text>

        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputWrapper, errors.fullName ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={(t) => { setFullName(t); clearError('fullName'); }}
              placeholder="Your full name"
              placeholderTextColor={COLORS.midGray}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              editable={!isBusy}
            />
          </View>
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrapper, errors.email ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              placeholder="yourname@email.com"
              placeholderTextColor={COLORS.midGray}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!isBusy}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); }}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              placeholderTextColor={COLORS.midGray}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              returnKeyType="next"
              editable={!isBusy}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          strength >= level
                            ? STRENGTH_COLORS[strength]
                            : COLORS.lightGray,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}
              >
                {STRENGTH_LABELS[strength]}
              </Text>
            </View>
          )}
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.confirmPassword ? styles.inputError : null,
            ]}
          >
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
              placeholder="Re-enter your password"
              placeholderTextColor={COLORS.midGray}
              secureTextEntry={!showConfirm}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!isBusy}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((v) => !v)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signupButton, isBusy ? styles.buttonDisabled : null]}
          onPress={handleRegister}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {isBusy ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.signupButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignUp}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  headerGradient: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING['2xl'],
  },
  logoContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  crossVertical: {
    position: 'absolute',
    width: 8,
    height: 48,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 36,
    height: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    top: 8,
  },
  brandName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accentLight,
    marginTop: 4,
  },
  formContainer: { flex: 1, backgroundColor: COLORS.white },
  formContent: {
    paddingHorizontal: SPACING['2xl'],
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['5xl'],
  },
  heading: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '700',
    color: COLORS.charcoal,
    marginBottom: SPACING.xs,
  },
  subheading: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.midGray,
    marginBottom: SPACING['2xl'],
  },
  fieldGroup: { marginBottom: SPACING.base },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    paddingHorizontal: SPACING.base,
    ...SHADOWS.sm,
  },
  inputError: { borderColor: COLORS.error },
  input: {
    flex: 1,
    height: 52,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.charcoal,
  },
  eyeButton: { padding: SPACING.xs },
  eyeIcon: { fontSize: 18 },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 2,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  signupButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.6 },
  signupButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    gap: SPACING.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.lightGray },
  dividerText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.midGray },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    height: 54,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
    width: width - SPACING['2xl'] * 2,
  },
  googleIcon: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
    color: COLORS.charcoal,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING['2xl'],
  },
  loginText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.midGray },
  loginLink: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
