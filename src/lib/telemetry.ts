import * as Sentry from '@sentry/react-native';

export function initTelemetry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;  // dev with no DSN: silently skip
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 0 : 0.2,  // 20% of transactions in prod
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
    attachScreenshot: true,
    debug: false,
  });
}

export function captureError(
  error: unknown,
  context?: Record<string, string>
): void {
  if (__DEV__) {
    console.error('[TooHumble Error]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setTag(k, v));
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export function logEvent(
  category: 'bible' | 'auth' | 'payment' | 'community' | 'navigation',
  message: string,
  data?: Record<string, string>
): void {
  if (__DEV__) {
    console.log(`[${category}]`, message, data ?? '');
    return;
  }
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}

export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}
