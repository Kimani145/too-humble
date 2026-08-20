import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { checkDonorStatus, getBannerAdUnitId } from '../services/adService';

// Module-level try/catch — runs once at load time, not on every render.
// In an EAS build: succeeds, BannerAd and BannerAdSize are populated.
// In Expo Go:      fails silently, component returns null everywhere.
let BannerAdComponent: React.ComponentType<{
  unitId: string;
  size: string;
  requestOptions?: { requestNonPersonalizedAdsOnly: boolean };
}> | null = null;
let BANNER_SIZE: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-google-mobile-ads') as {
    BannerAd: typeof BannerAdComponent;
    BannerAdSize: { BANNER: string };
  };
  BannerAdComponent = mod.BannerAd;
  BANNER_SIZE = mod.BannerAdSize.BANNER;
} catch {
  // Expo Go: react-native-google-mobile-ads native module not registered
}

export function AdBanner(): React.JSX.Element | null {
  const [isDonor, setIsDonor] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    checkDonorStatus()
      .then((status) => {
        setIsDonor(status);
        setChecked(true);
      })
      .catch(() => {
        setChecked(true);
      });
  }, []);

  if (!BannerAdComponent || !BANNER_SIZE) return null; // Expo Go
  if (!checked || isDonor) return null; // Not ready or donor

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <BannerAdComponent
        unitId={getBannerAdUnitId()}
        size={BANNER_SIZE}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
