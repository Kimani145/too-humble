import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface BrandTextProps {
  size?: number;
  colorMode?: 'light' | 'dark' | 'auto';
  style?: StyleProp<ViewStyle>;
}

export default function BrandText({
  size = 24,
  colorMode = 'auto',
  style,
}: BrandTextProps): React.JSX.Element {
  const { isDarkMode, colors } = useTheme();

  // Determine colors based on mode
  let primaryTextColor: string = colors.white;
  if (colorMode === 'light') {
    primaryTextColor = '#1A2B5E'; // Navy
  } else if (colorMode === 'dark') {
    primaryTextColor = '#FFFFFF'; // White
  } else {
    primaryTextColor = isDarkMode ? colors.white : '#1A2B5E';
  }

  const goldColor = '#F0A500';

  // Proportional sizing
  const crossWidth = size * 0.65;
  const crossHeight = size * 0.95;
  const barThickness = size * 0.16;
  const barTop = size * 0.24;

  return (
    <View style={[styles.container, style]}>
      {/* Latin Cross acting as 'T' */}
      <View style={{ width: crossWidth, height: size, justifyContent: 'center', marginRight: size * 0.05 }}>
        <Svg width={crossWidth} height={crossHeight} viewBox={`0 0 ${crossWidth} ${crossHeight}`}>
          {/* Vertical Stem */}
          <Rect
            x={(crossWidth - barThickness) / 2}
            y={0}
            width={barThickness}
            height={crossHeight}
            rx={barThickness / 2}
            fill={primaryTextColor}
          />
          {/* Horizontal Crossbar */}
          <Rect
            x={0}
            y={barTop}
            width={crossWidth}
            height={barThickness}
            rx={barThickness / 2}
            fill={primaryTextColor}
          />
        </Svg>
      </View>

      {/* "oo" */}
      <Text
        style={{
          fontSize: size,
          fontWeight: '800',
          color: primaryTextColor,
          fontFamily: 'System',
          letterSpacing: -0.5,
        }}
      >
        oo
      </Text>

      {/* Space spacer */}
      <View style={{ width: size * 0.2 }} />

      {/* "Humble" */}
      <Text
        style={{
          fontSize: size,
          fontWeight: '800',
          color: goldColor,
          fontFamily: 'System',
          letterSpacing: -0.5,
        }}
      >
        Humble
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
