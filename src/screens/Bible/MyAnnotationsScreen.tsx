import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserAnnotations } from '../../services/annotationService';
import { useAuth } from '../../context/AuthContext';
import { BibleHighlight, BibleNote } from '../../types/database.types';
import { useTheme, AppColors } from '../../context/ThemeContext';
import { BookRowSkeleton } from '../../components/skeletons/BookRowSkeleton';

export default function MyAnnotationsScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);
  const [notes, setNotes] = useState<BibleNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAnnotations = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getUserAnnotations(user.id);
      setHighlights(data.highlights);
      setNotes(data.notes);
    } catch {
      // silent catch / fallback
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const navigateToVerse = (bookId: string, chapter: number, verseNumber: number) => {
    router.push({
      pathname: '/(tabs)/bible',
      params: {
        book:    bookId,
        chapter: String(chapter),
        verse:   String(verseNumber),
        _t:      String(Date.now()),
      },
    });
  };

  const isEmpty = !isLoading && highlights.length === 0 && notes.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Annotations</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <BookRowSkeleton />
            <BookRowSkeleton />
            <BookRowSkeleton />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
              No highlights or notes yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Long-press any verse while reading to highlight or add a note.
            </Text>
          </View>
        ) : (
          <>
            {highlights.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                  Highlights
                </Text>
                {highlights.map((highlight) => (
                  <TouchableOpacity
                    key={highlight.id}
                    style={[styles.row, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => navigateToVerse(highlight.book_id, highlight.chapter, highlight.verse_number)}
                  >
                    <View style={[styles.colorBar, { backgroundColor: highlight.color }]} />
                    <View style={styles.rowMiddle}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                        {highlight.book_name} {highlight.chapter}:{highlight.verse_number}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={[styles.rowSubtitle, { color: colors.textMuted }]}
                      >
                        {highlight.verse_text}
                      </Text>
                    </View>
                    <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {notes.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                  Notes
                </Text>
                {notes.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.row, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => navigateToVerse(note.book_id, note.chapter, note.verse_number)}
                  >
                    <Text style={styles.noteIcon}>📝</Text>
                    <View style={styles.rowMiddle}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                        {note.book_name} {note.chapter}:{note.verse_number}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                      >
                        {note.note_text}
                      </Text>
                    </View>
                    <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 52 : 44,
      paddingBottom: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.overlayLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerRight: {
      width: 36,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    skeletonContainer: {
      paddingTop: 16,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 20,
    },
    emptyEmoji: {
      fontSize: 48,
      textAlign: 'center',
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 18,
    },
    section: {
      marginTop: 24,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    colorBar: {
      width: 4,
      minHeight: 40,
      height: '100%',
      borderRadius: 2,
      marginRight: 12,
    },
    noteIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    rowMiddle: {
      flex: 1,
    },
    rowTitle: {
      fontWeight: '700',
      fontSize: 14,
    },
    rowSubtitle: {
      fontSize: 13,
      marginTop: 3,
      lineHeight: 18,
    },
    chevron: {
      fontSize: 18,
      marginLeft: 8,
    },
  });
