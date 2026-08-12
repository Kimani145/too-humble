import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { checkDonorStatus, getBannerAdUnitId } from '../services/adService';

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
        setChecked(true); // on error, allow ad to show
      });
  }, []);

  // Never render on web
  if (Platform.OS === 'web') return null;
  // Wait until donor check resolves
  if (!checked) return null;
  // Donors see no ads
  if (isDonor) return null;

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
