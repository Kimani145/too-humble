// =============================================================================
// TOO HUMBLE - ROOT LAYOUT (Expo Router entry point)
// Wraps entire app in AuthProvider, handles cold-boot loading
// =============================================================================

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import LoadingScreen from '../src/screens/Auth/LoadingScreen';
import * as Sentry from '@sentry/react-native';

import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushOfflineQueue } from '../src/services/offlineFlushService';
import { getDraftQueue } from '../src/services/offlineQueueService';

Sentry.init({
  dsn: 'https://f8c622a303b5046ef156bade83625c9f@o4511658401005568.ingest.de.sentry.io/4511658428465232',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Keep splash visible during bootstrap
SplashScreen.preventAutoHideAsync();

function RootNavigator(): React.JSX.Element {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    AdsConsent.requestInfoUpdate()
      .then((consentInfo) => {
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          return AdsConsent.showForm();
        }
      })
      .catch(() => {
        // Consent failure is non-fatal — ads will show without personalisation
      });
  }, []);

  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isNowOnline = state.isConnected === true;
      if (wasOffline && isNowOnline) {
        // Network just came back — flush silently
        getDraftQueue().then((queue) => {
          if (queue.length > 0) {
            flushOfflineQueue().catch(() => {});
          }
        });
      }
      wasOffline = !isNowOnline;
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
});
