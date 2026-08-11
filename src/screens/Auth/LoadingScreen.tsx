// =============================================================================
// TOO HUMBLE - SPLASH / LOADING SCREEN
// Matches mockup IMG-20260621-WA0015.jpg:
// Deep dark navy blue background, centered white Latin cross with a flying dove,
// classic serif-style "TOO HUMBLE" title, and small loader spinner.
// =============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { TYPOGRAPHY, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = 'Growing in faith daily...',
}: LoadingScreenProps): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0D1A" />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Latin Cross & Dove Logo */}
        <View style={styles.logoContainer}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            {/* White Latin Cross */}
            {/* Vertical stem */}
            <Rect x={61} y={0} width={18} height={140} rx={4} fill="#FFFFFF" />
            {/* Horizontal crossbar */}
            <Rect x={20} y={38} width={100} height={18} rx={4} fill="#FFFFFF" />

            {/* Centered Dove Flying Upwards & Right */}
            {/* Body, head, spread wings, and tail of a white dove */}
            <Path
              d="M70,22 C73,19 79,18 82,21 C85,24 85,29 82,32 C76,40 68,44 65,52 C74,52 86,47 96,40 C99,38 103,38 103,42 C103,47 93,56 86,62 C76,69 67,71 63,80 C65,92 70,104 69,108 C67,108 64,101 60,90 C55,90 44,93 33,90 C30,89 30,85 34,83 C41,78 51,76 58,70 C59,61 54,49 48,40 C46,36 48,34 52,35 C59,39 65,45 68,52 C69,43 68,28 70,22 Z"
              fill="#0A0D1A" // Dark cutout to define detail over the white cross
            />
            <Path
              d="M70,22 C73,19 79,18 82,21 C85,24 85,29 82,32 C76,40 68,44 65,52 C74,52 86,47 96,40 C99,38 103,38 103,42 C103,47 93,56 86,62 C76,69 67,71 63,80 C65,92 70,104 69,108 C67,108 64,101 60,90 C55,90 44,93 33,90 C30,89 30,85 34,83 C41,78 51,76 58,70 C59,61 54,49 48,40 C46,36 48,34 52,35 C59,39 65,45 68,52 C69,43 68,28 70,22 Z"
              fill="#FFFFFF"
              transform="translate(-3, -3) scale(1.05)" // Slightly offsets and enlarges the white layer to overlay beautifully
            />
          </Svg>
        </View>

        {/* App Title in Classic Serif All Caps */}
        <Text style={styles.brandName}>TOO HUMBLE</Text>

        {/* Tagline in Clean Serif Italic */}
        <Text style={styles.tagline}>Grow in faith daily</Text>
      </Animated.View>

      {/* Loading Spinner / Progress ring at the bottom */}
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: SPACING.md }} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D1A', // Deep dark navy blue
    alignItems: 'center',
    justifyContent: 'center',
    width: Platform.OS === 'web' ? '100vw' as any : '100%',
    height: Platform.OS === 'web' ? '100vh' as any : '100%',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
    marginTop: -40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING['2xl'],
  },
  brandName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    fontFamily: 'System', // Bold clean all-caps serif style
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: 16,
    color: '#FFD166', // Accent gold/amber color
    fontStyle: 'italic',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
