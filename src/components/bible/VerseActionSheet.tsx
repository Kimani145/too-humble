import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BibleHighlight } from '../../types/database.types';
import { HIGHLIGHT_COLORS } from '../../constants/bibleAnnotations';

export interface VerseActionSheetProps {
  visible: boolean;
  verseNumber: number;
  verseText: string;
  existingHighlight: BibleHighlight | null;
  hasNote: boolean;
  onHighlight: (color: string) => void;
  onRemoveHighlight: () => void;
  onAddNote: () => void;
  onClose: () => void;
}

export function VerseActionSheet({
  visible,
  verseNumber,
  verseText,
  existingHighlight,
  hasNote,
  onHighlight,
  onRemoveHighlight,
  onAddNote,
  onClose,
}: VerseActionSheetProps): React.JSX.Element {
  const { colors } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Bible Verse',
        message: `"${verseText}" — ${verseNumber}\n\nShared from Too Humble 🙏`,
      });
    } catch {
      // ignore
    } finally {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.backdrop, { backgroundColor: colors.overlayDark }]}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.backgroundCard,
          },
        ]}
      >
        <View
          style={[styles.handle, { backgroundColor: colors.border }]}
        />

        <Text
          numberOfLines={2}
          style={[styles.versePreview, { color: colors.textMuted }]}
        >
          "{verseText}"
        </Text>

        <Text
          style={[styles.sectionHeader, { color: colors.textMuted }]}
        >
          Highlight
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorStrip}
        >
          {HIGHLIGHT_COLORS.map((color) => {
            const isSelected = existingHighlight?.color === color.hex;
            return (
              <TouchableOpacity
                key={color.id}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex },
                ]}
                activeOpacity={0.8}
                onPress={() => onHighlight(color.hex)}
              >
                {isSelected ? (
                  <Text style={styles.checkMark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {existingHighlight ? (
          <TouchableOpacity
            style={[
              styles.removeHighlightBtn,
              { borderTopColor: colors.border },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              onRemoveHighlight();
              onClose();
            }}
          >
            <Text style={[styles.removeHighlightText, { color: colors.danger }]}>
              ✕  Remove Highlight
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.7}
          onPress={onAddNote}
        >
          <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>
            {hasNote ? '✏️  Edit Note' : '✏️  Add Note'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.7}
          onPress={handleShare}
        >
          <Text style={[styles.actionRowText, { color: colors.textPrimary }]}>
            ↗  Share Verse
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  versePreview: {
    fontSize: 13,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  colorStrip: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  removeHighlightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  removeHighlightText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
