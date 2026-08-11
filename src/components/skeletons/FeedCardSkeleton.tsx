import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonBox } from './SkeletonBase';

export function FeedCardSkeleton(): React.JSX.Element {
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
      <View style={styles.row}>
        <SkeletonBox width={60} height={22} borderRadius={11} />
      </View>
      <View style={{ height: 14 }} />
      <SkeletonBox width="85%" height={20} />
      <View style={{ height: 8 }} />
      <SkeletonBox width="60%" height={15} />
      <View style={{ height: 16 }} />
      <SkeletonBox width="100%" height={13} />
      <View style={{ height: 6 }} />
      <SkeletonBox width="88%" height={13} />
      <View style={{ height: 6 }} />
      <SkeletonBox width="70%" height={13} />
      <View style={{ height: 18 }} />
      <View style={styles.actionsRow}>
        <SkeletonBox width={80} height={32} borderRadius={8} />
        <SkeletonBox width={80} height={32} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
