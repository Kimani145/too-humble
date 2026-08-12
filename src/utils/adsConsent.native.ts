import { NativeModules, Platform } from 'react-native';

export function requestAdsConsent(): void {
  if (Platform.OS === 'web') return;
  // Guard NativeModule check to avoid Expo Go crash
  if (!NativeModules.RNGoogleMobileAdsModule) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AdsConsent, AdsConsentStatus } = require('react-native-google-mobile-ads');
    AdsConsent.requestInfoUpdate()
      .then((consentInfo: { isConsentFormAvailable: boolean; status: string }) => {
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          return AdsConsent.showForm();
        }
      })
      .catch(() => {
        // Non-fatal consent error
      });
  } catch {
    // Native module not registered in Expo Go
  }
}
