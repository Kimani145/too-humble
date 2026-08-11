import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonBox } from './SkeletonBase';

export function BookRowSkeleton(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <SkeletonBox width="55%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonBox width="35%" height={12} borderRadius={4} />
      </View>
      <SkeletonBox width={40} height={14} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  left: {
    flex: 1,
  },
});
