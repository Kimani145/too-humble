import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonBox } from './SkeletonBase';

export function CommunityPostSkeleton(): React.JSX.Element {
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
      <View style={styles.headerRow}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={styles.authorMeta}>
          <SkeletonBox width={110} height={14} borderRadius={4} />
          <View style={{ height: 5 }} />
          <SkeletonBox width={75} height={11} borderRadius={4} />
        </View>
      </View>
      <SkeletonBox width="100%" height={185} borderRadius={10} style={{ marginBottom: 14 }} />
      <SkeletonBox width="90%" height={13} borderRadius={4} style={{ marginBottom: 5 }} />
      <SkeletonBox width="60%" height={13} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  authorMeta: {
    marginLeft: 10,
  },
});
