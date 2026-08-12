import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface DraftQueueBadgeProps {
  count:       number;
  isFlushing:  boolean;
  onPress:     () => void; // retry flush manually
}

export function DraftQueueBadge({
  count,
  isFlushing,
  onPress,
}: DraftQueueBadgeProps): React.JSX.Element | null {
  const { colors } = useTheme();

  if (count === 0) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isFlushing}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        backgroundColor: isFlushing ? colors.primaryLight : (colors.warning ? `${colors.warning}22` : 'rgba(234, 179, 8, 0.15)'),
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isFlushing ? colors.primary : (colors.warning || '#EAB308'),
      }}
    >
      <Text style={{ fontSize: 18 }}>{isFlushing ? '⏳' : '📤'}</Text>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={{ fontWeight: '600', fontSize: 13, color: colors.textPrimary }}>
          {isFlushing
            ? 'Publishing your drafts...'
            : `${count} post${count > 1 ? 's' : ''} waiting to upload`}
        </Text>
        {!isFlushing && (
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            Tap to retry
          </Text>
        )}
      </View>
      {isFlushing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
      )}
    </TouchableOpacity>
  );
}
