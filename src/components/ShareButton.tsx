import React, { useState } from 'react';
import { Share, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ShareButtonProps {
  title:   string;   // post title or content title
  message: string;   // body text — shown in the share preview
  url?:    string;   // optional URL if there's a media_url or deep link
  size?:   'small' | 'normal';
}

export function ShareButton({ title, message, url, size = 'normal' }: ShareButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState<boolean>(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const content: Parameters<typeof Share.share>[0] = {
        title,
        message: url ? `${message}\n\n${url}` : message,
      };
      // On iOS, url is a separate field for better preview
      if (Platform.OS === 'ios' && url) {
        (content as Record<string, unknown>).url = url;
      }
      await Share.share(content, { dialogTitle: title });
    } catch {
      // User dismissed — not an error
    } finally {
      setSharing(false);
    }
  };

  const isSmall = size === 'small';

  return (
    <TouchableOpacity
      onPress={handleShare}
      disabled={sharing}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isSmall ? 10 : 14,
        paddingVertical:   isSmall ? 6  : 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundCard,
        gap: 6,
      }}
    >
      {sharing
        ? <ActivityIndicator size="small" color={colors.textMuted} />
        : <Text style={{ fontSize: isSmall ? 14 : 16 }}>↗</Text>
      }
      <Text style={{
        fontSize: isSmall ? 12 : 14,
        color: colors.textMuted,
        fontWeight: '500',
      }}>
        Share
      </Text>
    </TouchableOpacity>
  );
}
