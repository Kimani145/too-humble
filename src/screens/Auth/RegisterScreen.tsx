// =============================================================================
// TOO HUMBLE - REGISTER SCREEN
// Strong validation, full_name capture, role default 'client'
// Split-panel layout on web/desktop (width >= 768); unchanged on mobile/native
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme, AppColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import BrandText from '../../components/BrandText';

// -----------------------------------------------------------------------
// Rotating verse data (desktop right panel only — subset)
// -----------------------------------------------------------------------
interface PanelQuote {
  text: string;
  reference: string;
}

const PANEL_QUOTES: PanelQuote[] = [
  { text: 'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!', reference: '2 Corinthians 5:17' },
  { text: 'For we are God\'s handiwork, created in Christ Jesus to do good works.', reference: 'Ephesians 2:10' },
  { text: 'Start children off on the way they should go, and even when they are old they will not turn from it.', reference: 'Proverbs 22:6' },
];

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
  if (!/[!@#$%^&*()_+\-=[\]{}|;':",.< >?/]/.test(password))
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
  if (/[!@#$%^&*()_+\-=[\]{}|;':",.< >?/]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score; // 0-5
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const { register, loginWithGoogle, isLoading } = useAuth();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  const styles = getStyles(colors);
  const regDesktopStyles = getDesktopStyles(colors);

  const isDesktop: boolean = Platform.OS === 'web' && width >= 768;

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
  const strengthColors = [
    colors.danger,
    colors.danger,
    colors.warning,
    colors.warning,
    colors.success,
    colors.success,
  ];

  // Rotating verse state (desktop only)
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const fadeAnim = useRef<Animated.Value>(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isDesktop) return;
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setQuoteIndex((prev) => (prev + 1) % PANEL_QUOTES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }).start();
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [isDesktop, fadeAnim]);

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
  // Form content (shared between mobile and desktop)
  // ----------------------------------------------------------------
  const formContent = (
    <>
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
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
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
                          ? strengthColors[strength]
                          : colors.lightGray,
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[styles.strengthLabel, { color: strengthColors[strength] }]}
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
            placeholderTextColor={colors.textMuted}
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
          <ActivityIndicator color={colors.white} />
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
        style={[styles.googleButton, isDesktop ? styles.googleButtonDesktop : null]}
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
    </>
  );

  // ----------------------------------------------------------------
  // Desktop split-panel layout
  // ----------------------------------------------------------------
  if (isDesktop) {
    const currentQuote: PanelQuote = PANEL_QUOTES[quoteIndex];
    return (
      <View style={regDesktopStyles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        {/* Left panel — form */}
        <View style={regDesktopStyles.leftPanel}>
          <ScrollView
            contentContainerStyle={regDesktopStyles.leftContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {formContent}
          </ScrollView>
        </View>

        {/* Right panel — brand + rotating verse */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={regDesktopStyles.rightPanel}
        >
          <BrandText size={42} colorMode="dark" style={{ marginBottom: SPACING.md }} />
          <Text style={regDesktopStyles.brandTagline}>Join Too Humble Community</Text>

          <Animated.View style={[regDesktopStyles.verseContainer, { opacity: fadeAnim }]}>
            <Text style={regDesktopStyles.verseText}>"{currentQuote.text}"</Text>
            <Text style={regDesktopStyles.verseRef}>— {currentQuote.reference}</Text>
          </Animated.View>

          {/* Dot indicators */}
          <View style={regDesktopStyles.dotsRow}>
            {PANEL_QUOTES.map((_q, i) => (
              <View
                key={i}
                style={[
                  regDesktopStyles.dot,
                  i === quoteIndex ? regDesktopStyles.dotActive : null,
                ]}
              />
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Mobile / native layout (unchanged)
  // ----------------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.headerGradient}
      >
        <BrandText size={36} colorMode="dark" style={{ marginBottom: SPACING.sm }} />
        <Text style={styles.brandTagline}>Join Too Humble Community</Text>
      </LinearGradient>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formContent}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// -----------------------------------------------------------------------
// Mobile / shared styles
// -----------------------------------------------------------------------
const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.backgroundPrimary },
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
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    crossHorizontal: {
      position: 'absolute',
      width: 36,
      height: 8,
      backgroundColor: colors.accent,
      borderRadius: 4,
      top: 8,
    },
    brandName: {
      fontSize: TYPOGRAPHY.fontSize.xl,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 3,
    },
    brandTagline: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.accentLight,
      marginTop: 4,
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
      marginBottom: SPACING['2xl'],
    },
    fieldGroup: { marginBottom: SPACING.base },
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
    eyeButton: { padding: SPACING.xs },
    eyeIcon: { fontSize: 18 },
    errorText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: colors.danger,
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
      backgroundColor: colors.primary,
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
      color: colors.white,
      letterSpacing: 0.5,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: SPACING.xl,
      gap: SPACING.md,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.textMuted },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      height: 54,
      backgroundColor: colors.backgroundCard,
      ...SHADOWS.sm,
    },
    googleButtonDesktop: {
      width: '100%' as unknown as number,
    },
    googleIcon: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: '800',
      color: '#4285F4',
    },
    googleButtonText: {
      fontSize: TYPOGRAPHY.fontSize.base,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: SPACING['2xl'],
    },
    loginText: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.textMuted },
    loginLink: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.primary,
      fontWeight: '700',
    },
  });

// -----------------------------------------------------------------------
// Desktop-only styles
// -----------------------------------------------------------------------
const getDesktopStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.primary,
    },
    leftPanel: {
      flex: 1,
      maxWidth: 480,
      backgroundColor: colors.backgroundPrimary,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    leftContent: {
      paddingHorizontal: SPACING['3xl'],
      paddingVertical: SPACING['2xl'],
    },
    rightPanel: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING['3xl'],
    },
    crossMotif: {
      fontSize: 64,
      color: colors.accent,
      marginBottom: SPACING['2xl'],
    },
    brandName: {
      fontSize: TYPOGRAPHY.fontSize['3xl'],
      fontWeight: '800',
      color: colors.white,
      letterSpacing: 3,
      marginBottom: SPACING.sm,
    },
    brandTagline: {
      fontSize: TYPOGRAPHY.fontSize.md,
      color: colors.accentLight,
      marginBottom: SPACING['4xl'],
    },
    verseContainer: {
      paddingHorizontal: SPACING['2xl'],
      alignItems: 'center',
      maxWidth: 420,
    },
    verseText: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      color: colors.white,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: TYPOGRAPHY.fontSize.lg * TYPOGRAPHY.lineHeight.relaxed,
      marginBottom: SPACING.md,
    },
    verseRef: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: colors.accentLight,
      fontWeight: '600',
    },
    dotsRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING['3xl'],
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotActive: {
      backgroundColor: colors.accent,
      width: 24,
    },
  });
