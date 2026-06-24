// =============================================================================
// TOO HUMBLE - LOGIN SCREEN
// Checks active sessions, routes admin vs client, validates inputs
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
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// -----------------------------------------------------------------------
// Rotating verse data (desktop right panel only)
// -----------------------------------------------------------------------
interface PanelQuote {
  text: string;
  reference: string;
}

const PANEL_QUOTES: PanelQuote[] = [
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', reference: 'Proverbs 3:5' },
  { text: 'I can do all things through Christ who strengthens me.', reference: 'Philippians 4:13' },
  { text: 'Be still, and know that I am God.', reference: 'Psalm 46:10' },
  { text: 'The Lord is my shepherd; I shall not want.', reference: 'Psalm 23:1' },
  { text: 'For God so loved the world that he gave his one and only Son.', reference: 'John 3:16' },
  { text: 'Let your light shine before others, that they may see your good deeds.', reference: 'Matthew 5:16' },
  { text: 'Humility is the foundation of all other virtues.', reference: '— St. Augustine' },
  { text: 'The soul is made for God, and it will not rest until it rests in Him.', reference: '— St. Augustine' },
];

// -----------------------------------------------------------------------
// Validation helpers
// -----------------------------------------------------------------------
function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading, isAuthenticated, role } = useAuth();
  const { width } = useWindowDimensions();

  const isDesktop: boolean = Platform.OS === 'web' && width >= 768;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isLoading, role, router]);

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  const handleLogin = useCallback(async (): Promise<void> => {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passErr);

    if (emailErr || passErr) return;

    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation handled by useEffect above on auth state change
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, login]);

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in failed.';
      Alert.alert('Sign In Failed', message);
    }
  }, [loginWithGoogle]);

  const handleForgotPassword = useCallback((): void => {
    router.push('/auth/forgot-password' as never);
  }, [router]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const isBusy = isSubmitting || isLoading;

  // ----------------------------------------------------------------
  // Form content (shared between mobile and desktop)
  // ----------------------------------------------------------------
  const formContent = (
    <>
      <Text style={styles.heading}>Welcome Back!</Text>
      <Text style={styles.subheading}>Sign in to continue</Text>

      {/* Email field */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email or Phone</Text>
        <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError(null);
            }}
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
        {emailError && <Text style={styles.errorText}>{emailError}</Text>}
      </View>

      {/* Password field */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError(null);
            }}
            placeholder="••••••••"
            placeholderTextColor={COLORS.midGray}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
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
        {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
      </View>

      {/* Forgot password */}
      <TouchableOpacity
        onPress={handleForgotPassword}
        style={styles.forgotContainer}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {/* Login button */}
      <TouchableOpacity
        style={[styles.loginButton, isBusy ? styles.buttonDisabled : null]}
        onPress={handleLogin}
        disabled={isBusy}
        activeOpacity={0.85}
      >
        {isBusy ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google sign-in */}
      <TouchableOpacity
        style={[styles.googleButton, isDesktop ? styles.googleButtonDesktop : null]}
        onPress={handleGoogleLogin}
        disabled={isBusy}
        activeOpacity={0.85}
      >
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Register link */}
      <View style={styles.registerRow}>
        <Text style={styles.registerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.registerLink}>Sign up</Text>
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
      <View style={desktopStyles.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Left panel — form */}
        <View style={desktopStyles.leftPanel}>
          <ScrollView
            contentContainerStyle={desktopStyles.leftContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {formContent}
          </ScrollView>
        </View>

        {/* Right panel — brand + rotating verse */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={desktopStyles.rightPanel}
        >
          <Text style={desktopStyles.crossMotif}>✝</Text>

          <Text style={desktopStyles.brandName}>TOO HUMBLE</Text>
          <Text style={desktopStyles.brandTagline}>Grow in faith daily ♡</Text>

          <Animated.View style={[desktopStyles.verseContainer, { opacity: fadeAnim }]}>
            <Text style={desktopStyles.verseText}>"{currentQuote.text}"</Text>
            <Text style={desktopStyles.verseRef}>— {currentQuote.reference}</Text>
          </Animated.View>

          {/* Dot indicators */}
          <View style={desktopStyles.dotsRow}>
            {PANEL_QUOTES.map((_q, i) => (
              <View
                key={i}
                style={[
                  desktopStyles.dot,
                  i === quoteIndex ? desktopStyles.dotActive : null,
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.headerGradient}
      >
        {/* Cross logo */}
        <View style={styles.logoContainer}>
          <View style={styles.crossVertical} />
          <View style={styles.crossHorizontal} />
        </View>
        <Text style={styles.brandName}>TOO HUMBLE</Text>
        <Text style={styles.brandTagline}>Grow in faith daily ♡</Text>
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
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  headerGradient: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: SPACING['3xl'],
  },
  logoContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  crossVertical: {
    position: 'absolute',
    width: 10,
    height: 56,
    backgroundColor: COLORS.accent,
    borderRadius: 5,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 42,
    height: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 5,
    top: 10,
  },
  brandName: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accentLight,
    marginTop: SPACING.xs,
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
  fieldGroup: { marginBottom: SPACING.lg },
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
  forgotContainer: { alignSelf: 'flex-end', marginBottom: SPACING['2xl'] },
  forgotText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: {
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
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  dividerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
  },
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
    color: COLORS.charcoal,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING['2xl'],
  },
  registerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
  },
  registerLink: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '700',
  },
});

// -----------------------------------------------------------------------
// Desktop-only styles
// -----------------------------------------------------------------------
const desktopStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },
  leftPanel: {
    flex: 1,
    maxWidth: 480,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leftContent: {
    paddingHorizontal: SPACING['3xl'],
    paddingVertical: SPACING['3xl'],
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  crossMotif: {
    fontSize: 64,
    color: COLORS.accent,
    marginBottom: SPACING['2xl'],
  },
  brandName: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 3,
    marginBottom: SPACING.sm,
  },
  brandTagline: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.accentLight,
    marginBottom: SPACING['4xl'],
  },
  verseContainer: {
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
    maxWidth: 420,
  },
  verseText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.white,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: TYPOGRAPHY.fontSize.lg * TYPOGRAPHY.lineHeight.relaxed,
    marginBottom: SPACING.md,
  },
  verseRef: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accentLight,
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
    backgroundColor: COLORS.accent,
    width: 24,
  },
});
