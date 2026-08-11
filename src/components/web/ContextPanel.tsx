import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { WEB_GRID } from '../../constants/webLayout';

interface ContextPanelProps {
  children: React.ReactNode;
  topOffset?: number;  // pixels from top (to clear the app bar). Default: 0.
}

interface ContextCardProps {
  children: React.ReactNode;
}

// Internal component only, do not export
function ContextCard({ children }: ContextCardProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

export default function ContextPanel({
  children,
  topOffset = 0,
}: ContextPanelProps): React.JSX.Element {
  const { colors, isDark } = useTheme();
  
  // Custom background color based on theme with ~4% opacity offset
  const panelBg = isDark ? '#12151C' : '#ECF0FA';

  // Map children to wrap them in ContextCard
  const mappedChildren = React.Children.map(children, (child) => {
    if (!child) return null;
    return <ContextCard>{child}</ContextCard>;
  });

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: panelBg,
          borderColor: colors.border,
          marginTop: topOffset,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any — web-only CSS prop
          overflowY: 'auto' as any,
        },
      ]}
    >
      <View style={styles.innerContainer}>
        {mappedChildren}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: WEB_GRID.CONTEXT_PANEL_WIDTH,
    flexShrink: 0,
    height: '100%',
    borderLeftWidth: 1,
    paddingHorizontal: WEB_GRID.CONTENT_PADDING,
    paddingVertical: 24,
  },
  innerContainer: {
    // Gap of 16px between children
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
});
