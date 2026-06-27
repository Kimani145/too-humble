// =============================================================================
// TOO HUMBLE - ADMIN: CREATE CONTENT SCREEN
// Admin-only. Creates home_feed posts: quote | video | verse
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ContentType, HomeFeedInsert } from '../../types/database.types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const CONTENT_TYPES: Array<{ type: ContentType; label: string; icon: string; hint: string }> = [
  { type: 'verse', label: 'Scripture Verse', icon: '📖', hint: 'Daily scripture or devotional text' },
  { type: 'quote', label: 'Inspirational Quote', icon: '💬', hint: 'Quote from a pastor, theologian, or scripture' },
  { type: 'video', label: 'Video / Media', icon: '▶️', hint: 'YouTube or media content (paste media URL)' },
];

function validateMediaUrl(url: string): boolean {
  if (!url.trim()) return true; // Optional
  return /^https:\/\/.+/.test(url.trim());
}

export default function AdminCreateContentScreen(): React.JSX.Element {
  const router = useRouter();
  const { user, role } = useAuth();

  const [selectedType, setSelectedType] = useState<ContentType>('verse');
  const [title, setTitle] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [authorRef, setAuthorRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errors, setErrors] = useState<{
    title: string | null;
    mediaUrl: string | null;
  }>({ title: null, mediaUrl: null });

  // Guard: non-admins can't access this screen
  if (role !== 'admin') {
    return (
      <View style={styles.forbidden}>
        <Text style={styles.forbiddenEmoji}>🚫</Text>
        <Text style={styles.forbiddenText}>Admin access required</Text>
      </View>
    );
  }

  const handleSubmit = useCallback(async (): Promise<void> => {
    const newErrors = {
      title: !title.trim() ? 'Title is required.' : title.trim().length > 255 ? 'Title must be under 255 characters.' : null,
      mediaUrl: !validateMediaUrl(mediaUrl) ? 'Media URL must start with https://' : null,
    };
    setErrors(newErrors);
    if (newErrors.title || newErrors.mediaUrl) return;

    if (!user) { Alert.alert('Not authenticated'); return; }

    setIsSubmitting(true);
    try {
      const payload: HomeFeedInsert = {
        content_type: selectedType,
        title: title.trim(),
        body_text: bodyText.trim() || undefined,
        media_url: mediaUrl.trim() || undefined,
        author_reference: authorRef.trim() || undefined,
      };

      const { error } = await supabase.from('home_feed').insert(payload as HomeFeedInsert);
      if (error) throw error;

      Alert.alert('Published ✅', 'Content has been added to the Home Feed.', [
        { text: 'Create Another', onPress: resetForm },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Failed to Publish', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, title, bodyText, mediaUrl, authorRef, user]);

  const resetForm = useCallback((): void => {
    setTitle('');
    setBodyText('');
    setMediaUrl('');
    setAuthorRef('');
    setErrors({ title: null, mediaUrl: null });
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Content</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Content type selector */}
        <Text style={styles.sectionLabel}>Content Type</Text>
        <View style={styles.typeRow}>
          {CONTENT_TYPES.map(({ type, label, icon }) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, selectedType === type ? styles.typeBtnActive : null]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.8}
            >
              <Text style={styles.typeBtnIcon}>{icon}</Text>
              <Text style={[styles.typeBtnLabel, selectedType === type ? styles.typeBtnLabelActive : null]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.typeHint}>
          {CONTENT_TYPES.find((c) => c.type === selectedType)?.hint}
        </Text>

        {/* Title */}
        <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.title ? styles.inputError : null]}
          value={title}
          onChangeText={(t) => { setTitle(t); if (errors.title) setErrors((p) => ({ ...p, title: null })); }}
          placeholder="Enter a clear, meaningful title..."
          placeholderTextColor={COLORS.midGray}
          maxLength={255}
          editable={!isSubmitting}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        <Text style={styles.charCount}>{title.length}/255</Text>

        {/* Body Text */}
        <Text style={styles.fieldLabel}>Body / Verse Text</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bodyText}
          onChangeText={setBodyText}
          placeholder="Scripture text, quote body, or description..."
          placeholderTextColor={COLORS.midGray}
          multiline
          textAlignVertical="top"
          editable={!isSubmitting}
        />

        {/* Author / Reference */}
        <Text style={styles.fieldLabel}>Author / Reference</Text>
        <TextInput
          style={styles.input}
          value={authorRef}
          onChangeText={(t) => { if (t.length <= 150) setAuthorRef(t); }}
          placeholder="e.g. John 3:16 or — C.S. Lewis"
          placeholderTextColor={COLORS.midGray}
          maxLength={150}
          editable={!isSubmitting}
        />

        {/* Media URL */}
        <Text style={styles.fieldLabel}>Media URL{selectedType === 'video' ? <Text style={styles.required}> *</Text> : ' (optional)'}</Text>
        <TextInput
          style={[styles.input, errors.mediaUrl ? styles.inputError : null]}
          value={mediaUrl}
          onChangeText={(t) => { setMediaUrl(t); if (errors.mediaUrl) setErrors((p) => ({ ...p, mediaUrl: null })); }}
          placeholder="https://..."
          placeholderTextColor={COLORS.midGray}
          autoCapitalize="none"
          keyboardType="url"
          editable={!isSubmitting}
        />
        {errors.mediaUrl && <Text style={styles.errorText}>{errors.mediaUrl}</Text>}

        {/* Publish */}
        <TouchableOpacity
          style={[styles.publishBtn, isSubmitting ? styles.publishBtnDisabled : null]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.publishBtnText}>🚀 Publish to Home Feed</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: SPACING.base,
    paddingHorizontal: SPACING.base,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.overlayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: COLORS.white, fontWeight: '700' },
  headerTitle: {
    flex: 1, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700',
    color: COLORS.white, textAlign: 'center',
  },
  headerRight: { width: 40 },
  content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: COLORS.midGray,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.md,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeBtn: {
    flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.lightGray, ...SHADOWS.sm,
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnIcon: { fontSize: 24, marginBottom: 4 },
  typeBtnLabel: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '600', color: COLORS.darkGray, textAlign: 'center' },
  typeBtnLabelActive: { color: COLORS.white },
  typeHint: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginBottom: SPACING['2xl'], textAlign: 'center' },
  fieldLabel: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600', color: COLORS.darkGray, marginBottom: SPACING.xs, marginTop: SPACING.base },
  required: { color: COLORS.error },
  input: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.charcoal, ...SHADOWS.sm,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.error, marginTop: 4, marginLeft: 2 },
  charCount: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, textAlign: 'right', marginTop: 4 },
  publishBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING['2xl'], ...SHADOWS.md,
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnText: { color: COLORS.white, fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },
  forbidden: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundPrimary },
  forbiddenEmoji: { fontSize: 48, marginBottom: SPACING.base },
  forbiddenText: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: '700', color: COLORS.charcoal },
});
