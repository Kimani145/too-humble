import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { HIGHLIGHT_COLORS } from '../../constants/bibleAnnotations';
import { Ionicons } from '@expo/vector-icons';

export interface FloatingActionBarProps {
  startVerse: number;
  endVerse: number;
  isHighlighted: boolean;
  hasNote: boolean;
  onApplyHighlight: (colorHex: string) => void;
  onRemoveHighlight: () => void;
  onOpenNoteModal: () => void;
  onShare: () => void;
  onClearSelection: () => void;
}

export function FloatingActionBar({
  startVerse,
  endVerse,
  isHighlighted,
  hasNote,
  onApplyHighlight,
  onRemoveHighlight,
  onOpenNoteModal,
  onShare,
  onClearSelection,
}: FloatingActionBarProps): React.JSX.Element {
  const { colors } = useTheme();

  const verseLabel =
    startVerse === endVerse ? `v. ${startVerse}` : `vv. ${startVerse}–${endVerse}`;

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.border,
            shadowColor: '#000',
          },
        ]}
      >
        {/* Verse Reference Label */}
        <View style={[styles.labelBox, { borderRightColor: colors.border }]}>
          <Text style={[styles.labelText, { color: colors.primary }]}>
            {verseLabel}
          </Text>
        </View>

        {/* Highlight Color Swatches */}
        <View style={styles.colorRow}>
          {HIGHLIGHT_COLORS.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.7}
              onPress={() => onApplyHighlight(c.hex)}
              style={[styles.colorButton]}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.hex },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Note Action */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={onOpenNoteModal}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name={hasNote ? 'document-text' : 'document-text-outline'}
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
            Note
          </Text>
        </TouchableOpacity>

        {/* Share Action */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={onShare}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
            Share
          </Text>
        </TouchableOpacity>

        {/* Remove Highlight Button (if highlighted) */}
        {isHighlighted ? (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={onRemoveHighlight}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="color-filter-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>
              Clear
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={onClearSelection}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 520,
    width: '100%',
    justifyContent: 'space-between',
  },
  labelBox: {
    paddingRight: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  colorButton: {
    padding: 2,
  },
  colorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
