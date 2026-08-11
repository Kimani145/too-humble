import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import WebSidebar from './WebSidebar';
import { useTheme } from '../../context/ThemeContext';
import { WEB_GRID } from '../../constants/webLayout';
import { useWebLayout } from '../../hooks/useWebLayout';

export default function WebLayout(): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colors } = useTheme();
  const { isWide } = useWebLayout();

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Wrapper style to fill the whole screen and prevent white bars on ultra-wide monitors
  const pageWrapperStyle = {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    height: '100vh' as any,
  };

  // Outer container: fills 100% of screen width, flush against left/right edges
  const containerStyle = {
    flexDirection: 'row' as const,
    flex: 1,
    width: '100%' as const,
    height: '100%' as const,
  };

  // Content area on the right: Slot fills remaining space naturally
  const contentAreaStyle = {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    paddingLeft: WEB_GRID.CONTENT_PADDING,
    paddingRight: isWide ? 0 : WEB_GRID.CONTENT_PADDING,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overflow: 'auto' as any,
  };

  return (
    <View style={pageWrapperStyle}>
      <View style={containerStyle}>
        {/* Sidebar on the Left */}
        <WebSidebar isCollapsed={isCollapsed} onToggle={handleToggle} />

        {/* Content Area on the Right */}
        <View style={contentAreaStyle}>
          <Slot />
        </View>
      </View>
    </View>
  );
}
