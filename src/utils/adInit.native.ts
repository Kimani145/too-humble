import { NativeModules } from 'react-native';

export async function initializeMobileAds(): Promise<void> {
  if (!NativeModules.RNGoogleMobileAdsModule) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: mobileAds } = require('react-native-google-mobile-ads') as {
      default: () => { initialize: () => Promise<void> };
    };
    await mobileAds().initialize();
  } catch {
    // Expo Go or native module unavailable — non-fatal
  }
}
