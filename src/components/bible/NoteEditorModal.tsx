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
  visible:       boolean;
  verseNumber:   number;
  verseText:     string;
  existingNote:  string;     // '' if no note yet
  isSaving:      boolean;
  onSave:        (text: string) => void;
  onDelete:      () => void;
  onClose:       () => void;
}

export function NoteEditorModal({
  visible,
  verseNumber,
  verseText,
  existingNote,
  isSaving,
  onSave,
  onDelete,
  onClose,
}: NoteEditorModalProps): React.JSX.Element {
  const { colors } = useTheme();
  const [noteText, setNoteText] = useState<string>(existingNote);

  useEffect(() => {
    if (visible) {
      setNoteText(existingNote);
    }
  }, [visible, existingNote]);

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
              Note (v. {verseNumber})
            </Text>

            <TouchableOpacity
              onPress={() => onSave(noteText)}
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
