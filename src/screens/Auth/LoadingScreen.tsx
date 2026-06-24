// =============================================================================
// TOO HUMBLE - LOADING SCREEN
// Cold-boot session fetch with animated cross logo
// =============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = 'Growing in faith daily...',
}: LoadingScreenProps): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Fade in hero content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse cross icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animated dots
    const animateDot = (
      anim: Animated.Value,
      delay: number
    ): Animated.CompositeAnimation =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

    animateDot(dotAnim1, 0).start();
    animateDot(dotAnim2, 200).start();
    animateDot(dotAnim3, 400).start();
  }, [fadeAnim, translateY, pulseAnim, dotAnim1, dotAnim2, dotAnim3]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY }] },
        ]}
      >
        {/* Cross Icon */}
        <Animated.View
          style={[styles.crossContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.crossVertical} />
          <View style={styles.crossHorizontal} />
        </Animated.View>

        {/* Brand name */}
        <Text style={styles.brandName}>TOO HUMBLE</Text>
        <Text style={styles.tagline}>Grow in faith daily</Text>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          {[dotAnim1, dotAnim2, dotAnim3].map((dot, index) => (
            <Animated.View
              key={index}
              style={[styles.dot, { opacity: dot }]}
            />
          ))}
        </View>

        <Text style={styles.message}>{message}</Text>
      </Animated.View>

      {/* Bottom decoration */}
      <View style={styles.bottomDecoration}>
        <View style={styles.decorLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    width,
    height,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  crossContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING['2xl'],
  },
  crossVertical: {
    position: 'absolute',
    width: 14,
    height: 80,
    backgroundColor: COLORS.accent,
    borderRadius: 7,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 60,
    height: 14,
    backgroundColor: COLORS.accent,
    borderRadius: 7,
    top: 16,
  },
  brandName: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.accentLight,
    letterSpacing: 1,
    marginBottom: SPACING['3xl'],
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentLight,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.overlayLight,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  decorLine: {
    width: 48,
    height: 4,
    backgroundColor: COLORS.overlayLight,
    borderRadius: 2,
  },
});
