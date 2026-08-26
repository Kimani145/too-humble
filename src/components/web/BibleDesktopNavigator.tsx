import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TouchableOpacityProps,
  Share,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchBooks,
  fetchChapter,
  fetchAvailableTranslations,
  loadBiblePreferences,
  saveBiblePreferences,
  preCacheEssentialChapters,
  getCachedChapterManifest,
  BOOK_NAME_TO_ID,
} from '../../services/bibleService';
import {
  AOLabBook,
  AOLabChapter,
  AOLabContentItem,
  ChapterAnnotations,
  BibleHighlight,
  BibleNote,
} from '../../types/database.types';
import {
  getChapterAnnotations,
  upsertHighlightRange,
  removeHighlightRange,
  upsertNote,
  removeNote,
} from '../../services/annotationService';
import { FloatingActionBar } from '../bible/FloatingActionBar';
import { NoteEditorModal } from '../bible/NoteEditorModal';
import { recordChapterRead } from '../../services/streakService';
import { BUNDLED_TRANSLATIONS, DEUTEROCANONICAL_COMMON_NAMES, DEFAULT_TRANSLATION_ID, BibleTranslationMeta } from '../../constants/bibleTranslations';
import BibleOfflineState from '../BibleOfflineState';
import NetInfo from '@react-native-community/netinfo';

interface HoverableOpacityProps extends TouchableOpacityProps {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const HoverableOpacity = TouchableOpacity as unknown as React.ComponentType<HoverableOpacityProps>;

export interface BibleDesktopNavigatorProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  otBooks?: AOLabBook[];
  ntBooks?: AOLabBook[];
  availableTranslations?: BibleTranslationMeta[];
  targetBook?: string;
  targetChapter?: number;
  targetVerse?: number;
}

type DesktopView = 'browse' | 'chapters' | 'reading';

interface BookRowProps {
  book: AOLabBook;
  onPress: (book: AOLabBook) => void;
}

function BookRow({ book, onPress }: BookRowProps): React.JSX.Element {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <HoverableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(book)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.bookRow,
        {
          borderBottomColor: colors.border,
          backgroundColor: hovered ? colors.lightGray : 'transparent',
        },
      ]}
    >
      <View style={styles.bookRowLeft}>
        <Text style={[styles.bookName, { color: colors.textPrimary }]}>
          {book.name}
        </Text>
        <Text style={[styles.bookTestament, { color: colors.textMuted }]}>
          {book.testament === 'old' ? 'Old Testament' : 'New Testament'}
        </Text>
      </View>
      <Text style={[styles.bookChapters, { color: colors.textMuted }]}>
        {`${book.numberOfChapters} ch`}
      </Text>
      <Text style={[styles.bookChevron, { color: colors.textMuted }]}>›</Text>
    </HoverableOpacity>
  );
}

interface VerseRowProps {
  item: AOLabContentItem;
  fontSize: number;
  isHighlighted?: boolean;
  highlightColor?: string;
  isSelected?: boolean;
  hasNote?: boolean;
  onPress?: (number: number, text: string) => void;
  onLongPress?: (number: number, text: string) => void;
}

function VerseRow({
  item,
  fontSize,
  isHighlighted,
  highlightColor,
  isSelected,
  hasNote,
  onPress,
  onLongPress,
}: VerseRowProps): React.JSX.Element {
  const { colors } = useTheme();

  if (item.type === 'verse') {
    const text = item.content
      .map((c) => (typeof c === 'string' ? c : c.text || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const hasHighlight = Boolean(highlightColor);

    let backgroundColor = 'transparent';
    let borderLeftColor = 'transparent';
    let borderLeftWidth = 0;
    let borderTopWidth = 0;
    let borderRightWidth = 0;
    let borderBottomWidth = 1;
    let borderBottomColor = colors.border;
    let borderTopColor = 'transparent';
    let borderRightColor = 'transparent';

    if (isSelected) {
      backgroundColor = colors.primary + '22';
      borderLeftColor = highlightColor || colors.primary;
      borderLeftWidth = 4;
      borderTopWidth = 1.5;
      borderRightWidth = 1.5;
      borderBottomWidth = 1.5;
      borderTopColor = colors.primary;
      borderRightColor = colors.primary;
      borderBottomColor = colors.primary;
    } else if (hasHighlight) {
      backgroundColor = `${highlightColor}30`;
      borderLeftColor = highlightColor!;
      borderLeftWidth = 4;
      borderBottomWidth = 1;
      borderBottomColor = colors.border;
    } else if (isHighlighted) {
      backgroundColor = colors.primary + '18';
      borderLeftColor = colors.primary;
      borderLeftWidth = 4;
      borderBottomWidth = 1;
      borderBottomColor = colors.border;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress?.(item.number, text)}
        onLongPress={() => onLongPress?.(item.number, text)}
        style={[
          styles.verseRow,
          {
            backgroundColor,
            borderLeftColor,
            borderLeftWidth,
            borderTopColor,
            borderTopWidth,
            borderRightColor,
            borderRightWidth,
            borderBottomColor,
            borderBottomWidth,
            borderRadius: hasHighlight || isSelected || isHighlighted ? 6 : 0,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginVertical: hasHighlight || isSelected || isHighlighted ? 2 : 0,
          },
        ]}
      >
        <View style={{ position: 'relative', width: 32, alignItems: 'flex-start' }}>
          <Text
            style={[
              styles.verseNumber,
              {
                color: isSelected ? colors.primary : colors.textMuted,
                fontWeight: isHighlighted || isSelected ? '800' : '600',
              },
            ]}
          >
            {item.number} {isHighlighted ? '📍' : ''}
          </Text>
          {hasNote ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
          ) : null}
        </View>
        <Text
          style={[
            styles.verseText,
            {
              fontSize,
              lineHeight: fontSize * 1.7,
              color: colors.textPrimary,
            },
          ]}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );
  }

  if (item.type === 'heading') {
    const text = item.content
      .map((c) => (typeof c === 'string' ? c : c.text || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return (
      <View style={{ paddingVertical: 12, paddingBottom: 6 }}>
        <Text style={{ fontSize: fontSize + 2, fontWeight: '700', color: colors.textPrimary }}>
          {text}
        </Text>
      </View>
    );
  }

  return <View style={{ height: 12 }} />;
}

export default function BibleDesktopNavigator({
  fontSize,
  onFontSizeChange,
  otBooks: propOtBooks = [],
  ntBooks: propNtBooks = [],
  availableTranslations: propAvailableTranslations = BUNDLED_TRANSLATIONS,
  targetBook,
  targetChapter,
  targetVerse,
}: BibleDesktopNavigatorProps): React.JSX.Element {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [view, setView] = useState<DesktopView>('browse');

  const [translationId, setTranslationId] = useState<string>(DEFAULT_TRANSLATION_ID);
  const [otBooks, setOtBooks] = useState<AOLabBook[]>(propOtBooks);
  const [ntBooks, setNtBooks] = useState<AOLabBook[]>(propNtBooks);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<AOLabBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [highlightVerseNum, setHighlightVerseNum] = useState<number | null>(targetVerse ?? null);
  const [chapterData, setChapterData] = useState<AOLabChapter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTranslations, setAvailableTranslations] = useState<BibleTranslationMeta[]>(propAvailableTranslations);

  const [annotations, setAnnotations] = useState<ChapterAnnotations>({ highlights: [], notes: [] });
  const [selectedRange, setSelectedRange] = useState<{ startVerse: number; endVerse: number } | null>(null);
  const [pendingStartVerse, setPendingStartVerse] = useState<number | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState<boolean>(false);
  const [noteTarget, setNoteTarget] = useState<{ number: number; text: string; verseEnd?: number } | null>(null);
  const [isSavingAnnotation, setIsSavingAnnotation] = useState<boolean>(false);

  const loadAnnotationsForChapter = useCallback(
    async (bookId: string, chapter: number, tId: string = translationId) => {
      if (user) {
        try {
          const ann = await getChapterAnnotations(user.id, tId, bookId, chapter);
          setAnnotations(ann);
        } catch {
          // ignore
        }
      }
    },
    [user, translationId]
  );

  const handleVersePress = useCallback(
    (verseNum: number) => {
      if (pendingStartVerse === null) {
        setPendingStartVerse(verseNum);
        setSelectedRange({ startVerse: verseNum, endVerse: verseNum });
      } else if (pendingStartVerse === verseNum) {
        if (selectedRange?.startVerse === verseNum && selectedRange?.endVerse === verseNum) {
          setPendingStartVerse(null);
          setSelectedRange(null);
        } else {
          setSelectedRange({ startVerse: verseNum, endVerse: verseNum });
          setPendingStartVerse(null);
        }
      } else {
        const start = Math.min(pendingStartVerse, verseNum);
        const end = Math.max(pendingStartVerse, verseNum);
        setSelectedRange({ startVerse: start, endVerse: end });
        setPendingStartVerse(null);
      }
    },
    [pendingStartVerse, selectedRange]
  );

  const clearSelection = useCallback(() => {
    setPendingStartVerse(null);
    setSelectedRange(null);
  }, []);

  const highlightMap = new Map<number, BibleHighlight>(
    annotations.highlights.map((h) => [h.verse_number, h])
  );
  const noteMap = new Map<number, BibleNote>();
  for (const note of annotations.notes) {
    const end = note.verse_end ?? note.verse_number;
    for (let v = note.verse_number; v <= end; v++) {
      noteMap.set(v, note);
    }
  }

  const getSelectedVerseTexts = useCallback((): { verseNumber: number; verseText: string }[] => {
    if (!selectedRange || !chapterData) return [];
    const results: { verseNumber: number; verseText: string }[] = [];
    for (const item of chapterData.content) {
      if (
        item.type === 'verse' &&
        item.number >= selectedRange.startVerse &&
        item.number <= selectedRange.endVerse
      ) {
        const text = item.content
          .map((c) => (typeof c === 'string' ? c : c.text || ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        results.push({ verseNumber: item.number, verseText: text });
      }
    }
    return results;
  }, [selectedRange, chapterData]);

  const handleApplyHighlightRange = useCallback(
    async (colorHex: string) => {
      if (!selectedBook || selectedChapter === null || !selectedRange) return;
      const verses = getSelectedVerseTexts();
      if (verses.length === 0) return;
      clearSelection();

      // 1. Optimistic instant visual update
      setAnnotations((prev) => {
        const verseNums = verses.map((v) => v.verseNumber);
        const filtered = prev.highlights.filter((h) => !verseNums.includes(h.verse_number));
        const added = verses.map((v) => ({
          id: `opt-${Date.now()}-${v.verseNumber}`,
          user_id: user?.id ?? 'guest',
          translation_id: translationId,
          book_id: selectedBook.id,
          book_name: selectedBook.commonName,
          chapter: selectedChapter,
          verse_number: v.verseNumber,
          verse_text: v.verseText,
          color: colorHex,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        }));
        return { ...prev, highlights: [...filtered, ...added] };
      });

      // 2. Persistent storage sync
      setIsSavingAnnotation(true);
      try {
        await upsertHighlightRange(
          user?.id ?? 'guest',
          translationId,
          selectedBook.id,
          selectedBook.commonName,
          selectedChapter,
          verses,
          colorHex
        );
        const updated = await getChapterAnnotations(
          user?.id ?? 'guest',
          translationId,
          selectedBook.id,
          selectedChapter
        );
        setAnnotations(updated);
      } finally {
        setIsSavingAnnotation(false);
      }
    },
    [user, selectedBook, selectedChapter, selectedRange, getSelectedVerseTexts, translationId, clearSelection]
  );

  const handleRemoveHighlightRange = useCallback(async () => {
    if (!selectedBook || selectedChapter === null || !selectedRange) return;
    const verseNumbers = Array.from(
      { length: selectedRange.endVerse - selectedRange.startVerse + 1 },
      (_, i) => selectedRange.startVerse + i
    );
    clearSelection();

    // Optimistic removal
    setAnnotations((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((h) => !verseNumbers.includes(h.verse_number)),
    }));

    setIsSavingAnnotation(true);
    try {
      await removeHighlightRange(
        user?.id ?? 'guest',
        translationId,
        selectedBook.id,
        selectedChapter,
        verseNumbers
      );
      const updated = await getChapterAnnotations(
        user?.id ?? 'guest',
        translationId,
        selectedBook.id,
        selectedChapter
      );
      setAnnotations(updated);
    } finally {
      setIsSavingAnnotation(false);
    }
  }, [user, selectedBook, selectedChapter, selectedRange, translationId, clearSelection]);

  const handleShareRange = useCallback(async () => {
    if (!selectedBook || selectedChapter === null || !selectedRange) return;
    const verses = getSelectedVerseTexts();
    const joinedText = verses.map((v) => `${v.verseNumber}. ${v.verseText}`).join(' ');
    const rangeLabel =
      selectedRange.startVerse === selectedRange.endVerse
        ? `v. ${selectedRange.startVerse}`
        : `vv. ${selectedRange.startVerse}–${selectedRange.endVerse}`;

    try {
      await Share.share({
        title: `${selectedBook.commonName} ${selectedChapter}:${rangeLabel}`,
        message: `"${joinedText}"\n— ${selectedBook.commonName} ${selectedChapter}:${rangeLabel} (${translationId})\n\nShared from Too Humble 🙏`,
      });
    } catch {
      // ignore
    } finally {
      clearSelection();
    }
  }, [selectedBook, selectedChapter, selectedRange, getSelectedVerseTexts, translationId, clearSelection]);

  React.useEffect(() => {
    if (propOtBooks.length > 0) setOtBooks(propOtBooks);
    if (propNtBooks.length > 0) setNtBooks(propNtBooks);
    if (propAvailableTranslations.length > 0) setAvailableTranslations(propAvailableTranslations);
  }, [propOtBooks, propNtBooks, propAvailableTranslations]);
  const [showPickerDropdown, setShowPickerDropdown] = useState<boolean>(false);

  const [isOffline, setIsOffline] = useState(false);
  const [offlineManifest, setOfflineManifest] = useState<Array<{ translationId: string; bookId: string; chapter: number; bookName: string }>>([]);

  const loadBooks = async (tId: string, restoreBookId?: string | null, restoreChapter?: number | null) => {
    setIsLoadingBooks(true);
    setBooksError(null);
    try {
      const allBooks = await fetchBooks(tId);
      const ot = allBooks.filter((b) => b.testament === 'old');
      const nt = allBooks.filter((b) => b.testament === 'new');
      setOtBooks(ot);
      setNtBooks(nt);

      // Restore preferences if valid
      if (restoreBookId) {
        const found = allBooks.find((b) => b.id === restoreBookId);
        if (found) {
          setSelectedBook(found);
          if (restoreChapter) {
            setSelectedChapter(restoreChapter);
            setIsLoading(true);
            try {
              const data = await fetchChapter(tId, found.id, restoreChapter);
              setChapterData(data);
              loadAnnotationsForChapter(found.id, restoreChapter, tId);
              setView('reading');
              setIsOffline(false);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to load chapter.';
              if (msg === 'OFFLINE_NO_CACHE') {
                const manifest = await getCachedChapterManifest();
                setOfflineManifest(manifest);
                setIsOffline(true);
              } else {
                setError(msg);
              }
            } finally {
              setIsLoading(false);
            }
          } else {
            setView('chapters');
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load books.';
      if (msg === 'OFFLINE_NO_CACHE') {
        const manifest = await getCachedChapterManifest();
        setOfflineManifest(manifest);
        setIsOffline(true);
      } else {
        setBooksError(msg);
      }
    } finally {
      setIsLoadingBooks(false);
    }
  };

  React.useEffect(() => {
    async function init() {
      try {
        const prefs = await loadBiblePreferences();
        setTranslationId(prefs.translationId);

        // Pre-cache essential chapters
        preCacheEssentialChapters(prefs.translationId).catch(() => {});

        const translations = await fetchAvailableTranslations();
        setAvailableTranslations(translations);

        await loadBooks(prefs.translationId, prefs.selectedBookId, prefs.selectedChapter);
      } catch (err) {
        setBooksError('Failed to load Bible.');
        setIsLoadingBooks(false);
      }
    }
    init();
  }, []);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected;
      if (isConnected === false && view === 'browse') {
        getCachedChapterManifest().then((manifest) => {
          setOfflineManifest(manifest);
          setIsOffline(true);
        }).catch(() => {});
      } else if (isConnected === true) {
        setIsOffline(false);
      }
    });
    return () => unsubscribe();
  }, [view]);

  const handleTranslationChange = async (newTranslationId: string) => {
    setShowPickerDropdown(false);
    setTranslationId(newTranslationId);

    // Save preferences
    await saveBiblePreferences({
      translationId: newTranslationId,
      selectedBookId: selectedBook ? selectedBook.id : null,
      selectedChapter,
    });

    // Safety reset
    if (selectedBook && DEUTEROCANONICAL_COMMON_NAMES.has(selectedBook.commonName)) {
      setSelectedBook(null);
      setSelectedChapter(null);
      setChapterData(null);
      setView('browse');
      await saveBiblePreferences({
        translationId: newTranslationId,
        selectedBookId: null,
        selectedChapter: null,
      });
    }

    // Reload books
    await loadBooks(newTranslationId, selectedBook ? selectedBook.id : null, selectedChapter);
  };

  const handleBrowseBookPress = (book: AOLabBook) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setChapterData(null);
    setError(null);
    setView('chapters');
  };

  const handleChapterSelect = async (chapter: number) => {
    if (!selectedBook) return;
    setSelectedChapter(chapter);
    clearSelection();
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchChapter(translationId, selectedBook.id, chapter);
      setChapterData(data);
      loadAnnotationsForChapter(selectedBook.id, chapter, translationId);
      recordChapterRead(selectedBook.commonName, chapter).catch(() => {});
      setView('reading');
      setIsOffline(false);
      await saveBiblePreferences({
        translationId,
        selectedBookId: selectedBook.id,
        selectedChapter: chapter,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load chapter';
      if (msg === 'OFFLINE_NO_CACHE') {
        const manifest = await getCachedChapterManifest();
        setOfflineManifest(manifest);
        setIsOffline(true);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isOffline) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <BibleOfflineState
          cachedChapters={offlineManifest}
          onSelectCached={(bookId, chapter, tId) => {
            setIsOffline(false);
            const book = [...otBooks, ...ntBooks].find((b) => b.id === bookId);
            if (book) {
              setSelectedBook(book);
              handleChapterSelect(chapter);
            }
          }}
        />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // View 1: Browse View
  // ---------------------------------------------------------------------------
  if (view === 'browse') {
    return (
      <View style={styles.browseContainer}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {/* Header row with picker */}
          <View style={[styles.browseHeader, { borderBottomColor: colors.border, backgroundColor: colors.backgroundCard }]}>
            <View>
              <Text style={[styles.browseHeaderTitle, { color: colors.textPrimary }]}>The Holy Bible</Text>
              <Text style={[styles.browseHeaderSubtitle, { color: colors.textMuted }]}>AO Lab API Edition</Text>
            </View>
            <View style={{ position: 'relative', zIndex: 100 }}>
              <TouchableOpacity
                onPress={() => setShowPickerDropdown(!showPickerDropdown)}
                style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.backgroundPrimary }]}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                  📖 {availableTranslations.find((t) => t.id === translationId)?.label || translationId}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 8 }}>▼</Text>
              </TouchableOpacity>

              {showPickerDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={true}>
                    {availableTranslations.map((item) => {
                      const isSelected = item.id === translationId;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.dropdownItem,
                            {
                              backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                              opacity: item.available ? 1 : 0.5,
                            },
                          ]}
                          disabled={!item.available}
                          onPress={() => handleTranslationChange(item.id)}
                        >
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '600', color: isSelected ? colors.primary : colors.textPrimary }}>
                              {item.label}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                              {item.languageLabel}
                            </Text>
                          </View>
                          {!item.available && (
                            <View style={{ backgroundColor: colors.lightGray, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600' }}>Soon</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Books columns row */}
          {isLoadingBooks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading books...</Text>
            </View>
          ) : booksError ? (
            <View style={styles.centered}>
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{booksError}</Text>
              <TouchableOpacity
                onPress={() => loadBooks(translationId)}
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {/* Left Column - Old Testament */}
              <View style={[styles.column, { borderRightColor: colors.border }]}>
                <View style={[styles.columnHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.columnTitle, { color: colors.textMuted }]}>
                    OLD TESTAMENT
                  </Text>
                  <Text style={[styles.columnSubtitle, { color: colors.textMuted }]}>
                    {otBooks.length} Books
                  </Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {otBooks.map((book) => (
                    <BookRow
                      key={book.id}
                      book={book}
                      onPress={handleBrowseBookPress}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Right Column - New Testament */}
              <View style={styles.column}>
                <View style={[styles.columnHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.columnTitle, { color: colors.textMuted }]}>
                    NEW TESTAMENT
                  </Text>
                  <Text style={[styles.columnSubtitle, { color: colors.textMuted }]}>
                    {ntBooks.length} Books
                  </Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {ntBooks.map((book) => (
                    <BookRow
                      key={book.id}
                      book={book}
                      onPress={handleBrowseBookPress}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // View 2: Chapters Selection
  // ---------------------------------------------------------------------------
  if (view === 'chapters' && selectedBook) {
    const chaptersArray = Array.from(
      { length: selectedBook.numberOfChapters },
      (_, i) => i + 1
    );

    return (
      <View style={styles.fullWidthContainer}>
        {/* Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={async () => {
              setView('browse');
              setSelectedBook(null);
              await saveBiblePreferences({
                translationId,
                selectedBookId: null,
                selectedChapter: null,
              });
            }}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Testaments
            </Text>
          </TouchableOpacity>
          <View style={styles.spacer} />
          <View style={styles.bookHeaderInfo}>
            <Text style={[styles.bookHeaderName, { color: colors.textPrimary }]}>
              {selectedBook.name}
            </Text>
            <Text style={[styles.bookHeaderChapters, { color: colors.textMuted }]}>
              {`${selectedBook.numberOfChapters} chapters`}
            </Text>
          </View>
        </View>

        {/* Chapters Grid */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.chaptersGrid}>
            {chaptersArray.map((ch) => (
              <TouchableOpacity
                key={ch}
                onPress={() => handleChapterSelect(ch)}
                style={[
                  styles.chapterBox,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundCard,
                  },
                ]}
              >
                <Text style={[styles.chapterBoxText, { color: colors.textPrimary }]}>
                  {ch}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // View 3: Reading View & Loading/Error states
  // ---------------------------------------------------------------------------
  if (isLoading && selectedBook && selectedChapter) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {`Loading ${selectedBook.name} ${selectedChapter}...`}
        </Text>
      </View>
    );
  }

  if (error && selectedBook && selectedChapter) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => handleChapterSelect(selectedChapter)}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (view === 'reading' && selectedBook && selectedChapter && chapterData) {
    return (
      <View style={styles.fullWidthContainer}>
        {/* Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={async () => {
              setView('chapters');
              setChapterData(null);
              setIsLoading(false);
              await saveBiblePreferences({
                translationId,
                selectedBookId: selectedBook.id,
                selectedChapter: null,
              });
            }}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              {`← ${selectedBook.name}`}
            </Text>
          </TouchableOpacity>
          <View style={styles.spacer} />
          <Text style={[styles.readingChapterTitle, { color: colors.textPrimary }]}>
            {`Chapter ${selectedChapter}`}
          </Text>
          <View style={styles.spacer} />
          {/* Font controls */}
          <View style={styles.fontControls}>
            <TouchableOpacity
              onPress={() => onFontSizeChange(Math.max(12, fontSize - 2))}
              style={[styles.fontBtn, { backgroundColor: colors.lightGray }]}
            >
              <Text style={[styles.fontBtnText, { color: colors.textPrimary }]}>A-</Text>
            </TouchableOpacity>
            <Text style={[styles.fontSizeDisplay, { color: colors.textPrimary }]}>
              {fontSize}
            </Text>
            <TouchableOpacity
              onPress={() => onFontSizeChange(Math.min(28, fontSize + 2))}
              style={[styles.fontBtn, { backgroundColor: colors.lightGray }]}
            >
              <Text style={[styles.fontBtnText, { color: colors.textPrimary }]}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Bar */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleChapterSelect(selectedChapter - 1)}
            disabled={selectedChapter <= 1}
            style={[
              styles.navBtn,
              selectedChapter <= 1 ? styles.navBtnDisabled : null,
            ]}
          >
            <Text style={[styles.navBtnText, { color: colors.primary }]}>
              ‹ Previous
            </Text>
          </TouchableOpacity>
          <Text style={[styles.navBarCenterText, { color: colors.textMuted }]}>
            {`${selectedChapter} / ${selectedBook.numberOfChapters}`}
          </Text>
          <TouchableOpacity
            onPress={() => handleChapterSelect(selectedChapter + 1)}
            disabled={selectedChapter >= selectedBook.numberOfChapters}
            style={[
              styles.navBtn,
              selectedChapter >= selectedBook.numberOfChapters ? styles.navBtnDisabled : null,
            ]}
          >
            <Text style={[styles.navBtnText, { color: colors.primary }]}>
              Next ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chapter Text */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.chapterTextContainer}>
            {chapterData.content.map((item, index) => {
              const inSelection = Boolean(
                selectedRange &&
                item.type === 'verse' &&
                item.number >= selectedRange.startVerse &&
                item.number <= selectedRange.endVerse
              );

              return (
                <VerseRow
                  key={index}
                  item={item}
                  fontSize={fontSize}
                  isHighlighted={item.type === 'verse' && item.number === highlightVerseNum}
                  highlightColor={item.type === 'verse' ? (highlightMap.get(item.number)?.color ?? undefined) : undefined}
                  isSelected={inSelection}
                  hasNote={item.type === 'verse' ? noteMap.has(item.number) : false}
                  onPress={(num) => handleVersePress(num)}
                  onLongPress={(num) => {
                    setSelectedRange({ startVerse: num, endVerse: num });
                    setPendingStartVerse(null);
                  }}
                />
              );
            })}
          </View>
        </ScrollView>

        {/* Psalmist-style Floating Action Bar */}
        {selectedRange && !showNoteEditor ? (
          <FloatingActionBar
            startVerse={selectedRange.startVerse}
            endVerse={selectedRange.endVerse}
            isHighlighted={Array.from(
              { length: selectedRange.endVerse - selectedRange.startVerse + 1 },
              (_, i) => selectedRange.startVerse + i
            ).some((v) => highlightMap.has(v))}
            hasNote={Array.from(
              { length: selectedRange.endVerse - selectedRange.startVerse + 1 },
              (_, i) => selectedRange.startVerse + i
            ).some((v) => noteMap.has(v))}
            onApplyHighlight={handleApplyHighlightRange}
            onRemoveHighlight={handleRemoveHighlightRange}
            onOpenNoteModal={() => {
              const verses = getSelectedVerseTexts();
              const snippet = verses.map((v) => v.verseText).join(' ');
              setNoteTarget({
                number: selectedRange.startVerse,
                verseEnd: selectedRange.endVerse,
                text: snippet,
              });
              setShowNoteEditor(true);
            }}
            onShare={handleShareRange}
            onClearSelection={clearSelection}
          />
        ) : null}

        {showNoteEditor && noteTarget ? (
          <NoteEditorModal
            visible={showNoteEditor}
            verseNumber={noteTarget.number}
            verseText={noteTarget.text}
            existingNote={noteMap.get(noteTarget.number)?.note_text ?? ''}
            totalVerses={chapterData.numberOfVerses ?? 150}
            existingVerseEnd={noteTarget.verseEnd}
            isSaving={isSavingAnnotation}
            onSave={async (text, verseEnd) => {
              if (!selectedBook || selectedChapter === null || !noteTarget) return;
              setIsSavingAnnotation(true);
              try {
                await upsertNote(
                  user?.id ?? 'guest',
                  translationId,
                  selectedBook.id,
                  selectedBook.commonName,
                  selectedChapter,
                  noteTarget.number,
                  noteTarget.text,
                  text,
                  verseEnd
                );
                const updated = await getChapterAnnotations(
                  user?.id ?? 'guest',
                  translationId,
                  selectedBook.id,
                  selectedChapter
                );
                setAnnotations(updated);
              } finally {
                setIsSavingAnnotation(false);
                setShowNoteEditor(false);
                setNoteTarget(null);
                clearSelection();
              }
            }}
            onDelete={async () => {
              if (!selectedBook || selectedChapter === null || !noteTarget) return;
              await removeNote(
                user?.id ?? 'guest',
                translationId,
                selectedBook.id,
                selectedChapter,
                noteTarget.number
              );
              const updated = await getChapterAnnotations(
                user?.id ?? 'guest',
                translationId,
                selectedBook.id,
                selectedChapter
              );
              setAnnotations(updated);
              setShowNoteEditor(false);
              setNoteTarget(null);
            }}
            onClose={() => {
              setShowNoteEditor(false);
              setNoteTarget(null);
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  browseContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  browseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  browseHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  browseHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 240,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    padding: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  column: {
    flex: 1,
    borderRightWidth: 1,
  },
  columnHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  columnSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  bookRowLeft: {
    flex: 1,
  },
  bookName: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookTestament: {
    fontSize: 12,
    marginTop: 2,
  },
  bookChapters: {
    fontSize: 12,
    marginRight: 8,
  },
  bookChevron: {
    fontSize: 18,
  },
  fullWidthContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  bookHeaderInfo: {
    alignItems: 'flex-end',
  },
  bookHeaderName: {
    fontSize: 18,
    fontWeight: '700',
  },
  bookHeaderChapters: {
    fontSize: 13,
    marginTop: 2,
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 10,
  },
  chapterBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterBoxText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  readingChapterTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fontSizeDisplay: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navBarCenterText: {
    fontSize: 13,
  },
  chapterTextContainer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  verseRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  verseNumber: {
    fontSize: 11,
    fontWeight: '700',
    width: 32,
    marginTop: 4,
  },
  verseText: {
    flex: 1,
  },
});
