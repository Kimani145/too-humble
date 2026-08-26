import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface NoteEditorModalProps {
  visible:          boolean;
  verseNumber:      number;
  verseText:        string;
  existingNote:     string;     // '' if no note yet
  totalVerses:      number;     // chapter's total verse count — for range picker upper bound
  existingVerseEnd?: number;    // pre-populated when editing an existing range note
  isSaving:         boolean;
  onSave:           (text: string, verseEnd: number) => void;
  onDelete:         () => void;
  onClose:          () => void;
}

export function NoteEditorModal({
  visible,
  verseNumber,
  verseText,
  existingNote,
  totalVerses,
  existingVerseEnd,
  isSaving,
  onSave,
  onDelete,
  onClose,
}: NoteEditorModalProps): React.JSX.Element {
  const { colors } = useTheme();
  const [noteText, setNoteText] = useState<string>(existingNote);
  const [verseEnd, setVerseEnd] = useState<number>(
    existingVerseEnd ?? verseNumber
  );

  useEffect(() => {
    if (visible) {
      setNoteText(existingNote);
      setVerseEnd(existingVerseEnd ?? verseNumber);
    }
  }, [visible, existingNote, existingVerseEnd, verseNumber]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header row */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border, backgroundColor: colors.backgroundCard }]}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {verseNumber === verseEnd
                ? `Note (v. ${verseNumber})`
                : `Note (vv. ${verseNumber}–${verseEnd})`}
            </Text>

            <TouchableOpacity
              onPress={() => onSave(noteText, verseEnd)}
              disabled={isSaving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.saveText,
                    { color: isSaving ? colors.textMuted : colors.primary },
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Verse context */}
          <View style={[styles.verseContext, { borderBottomColor: colors.border, backgroundColor: colors.backgroundCard }]}>
            <Text
              numberOfLines={3}
              style={[styles.verseText, { color: colors.textMuted }]}
            >
              "{verseText}"
            </Text>
          </View>

          {/* Verse range selector row */}
          <View
            style={[
              styles.rangeRow,
              { borderBottomColor: colors.border, backgroundColor: colors.backgroundCard },
            ]}
          >
            <Text style={[styles.rangeLabel, { color: colors.textPrimary }]}>
              Verse {verseNumber}
            </Text>
            <Text style={[styles.rangeToText, { color: colors.textMuted }]}>
              {' to '}
            </Text>
            <View style={styles.rangeControls}>
              <TouchableOpacity
                onPress={() => setVerseEnd((v) => Math.max(verseNumber, v - 1))}
                disabled={verseEnd <= verseNumber}
                style={[
                  styles.rangeBtn,
                  { backgroundColor: colors.lightGray },
                  verseEnd <= verseNumber && styles.rangeBtnDisabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.rangeBtnText, { color: colors.textPrimary }]}>−</Text>
              </TouchableOpacity>

              <Text style={[styles.rangeValueText, { color: colors.primary }]}>
                {verseEnd}
              </Text>

              <TouchableOpacity
                onPress={() => setVerseEnd((v) => Math.min(totalVerses, v + 1))}
                disabled={verseEnd >= totalVerses}
                style={[
                  styles.rangeBtn,
                  { backgroundColor: colors.lightGray },
                  verseEnd >= totalVerses && styles.rangeBtnDisabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.rangeBtnText, { color: colors.textPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Helper text */}
          <View style={{ backgroundColor: colors.backgroundCard }}>
            <Text style={[styles.rangeHelperText, { color: colors.textMuted }]}>
              Highlight covers {verseNumber === verseEnd
                ? 'verse ' + verseNumber
                : 'verses ' + verseNumber + '–' + verseEnd}
            </Text>
          </View>

          {/* Text Input */}
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.textPrimary,
                backgroundColor: colors.backgroundPrimary,
              },
            ]}
            multiline
            textAlignVertical="top"
            autoFocus={true}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Write your thoughts on this verse..."
            placeholderTextColor={colors.textMuted}
          />

          {/* Delete Button */}
          {existingNote !== '' ? (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderTopColor: colors.border, backgroundColor: colors.backgroundCard }]}
              onPress={onDelete}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteText, { color: colors.danger }]}>
                🗑  Delete Note
              </Text>
            </TouchableOpacity>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  verseContext: {
    padding: 20,
    borderBottomWidth: 1,
  },
  verseText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rangeToText: {
    fontSize: 13,
  },
  rangeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeBtnDisabled: {
    opacity: 0.4,
  },
  rangeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  rangeValueText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  rangeHelperText: {
    fontSize: 11,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    lineHeight: 22,
  },
  deleteBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
