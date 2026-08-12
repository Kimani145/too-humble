import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface SkeletonBoxProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width, height, borderRadius = 6, style }: SkeletonBoxProps): React.JSX.Element {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0.35, duration: 850, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  return (
    <Animated.View style={[{
      width, height, borderRadius,
      backgroundColor: isDark ? '#1E2A3A' : '#DDE3F0',
      opacity: shimmer,
    }, style]} />
  );
}
