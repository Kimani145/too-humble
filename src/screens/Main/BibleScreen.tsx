// =============================================================================
// TOO HUMBLE - BIBLE SCREEN
// Dual-tab (Old Testament / New Testament) with adjustable font size
// =============================================================================

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  OLD_TESTAMENT_BOOKS,
  NEW_TESTAMENT_BOOKS,
  fetchChapter,
} from '../../services/bibleService';
import {
  BibleBook,
  BibleVerse,
  BibleChapter,
} from '../../types/database.types';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';

const { width } = Dimensions.get('window');

type Testament = 'old' | 'new';

// -----------------------------------------------------------------------
// Chapter selector modal
// -----------------------------------------------------------------------
interface ChapterModalProps {
  book: BibleBook;
  onSelect: (chapter: number) => void;
  onClose: () => void;
}

function ChapterModal({ book, onSelect, onClose }: ChapterModalProps): React.JSX.Element {
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{book.name}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={modalStyles.subtitle}>Select a chapter</Text>
          <ScrollView contentContainerStyle={modalStyles.grid} showsVerticalScrollIndicator={false}>
            {chapters.map((ch) => (
              <TouchableOpacity
                key={ch}
                style={modalStyles.chapterBtn}
                onPress={() => onSelect(ch)}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.chapterNum}>{ch}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, color: COLORS.darkGray, fontWeight: '700' },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  chapterBtn: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.offWhite,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNum: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

// -----------------------------------------------------------------------
// Verse item
// -----------------------------------------------------------------------
interface VerseItemProps {
  verse: BibleVerse;
  fontSize: number;
}

function VerseItem({ verse, fontSize }: VerseItemProps): React.JSX.Element {
  return (
    <View style={verseStyles.container}>
      <Text style={[verseStyles.verseNum, { fontSize: fontSize - 2 }]}>
        {verse.verse}
      </Text>
      <Text style={[verseStyles.verseText, { fontSize, lineHeight: fontSize * 1.7 }]}>
        {verse.text}
      </Text>
    </View>
  );
}

const verseStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    alignItems: 'flex-start',
  },
  verseNum: {
    color: COLORS.primary,
    fontWeight: '800',
    marginRight: SPACING.sm,
    minWidth: 24,
    marginTop: 2,
  },
  verseText: {
    flex: 1,
    color: COLORS.charcoal,
  },
});

// -----------------------------------------------------------------------
// BibleScreen
// -----------------------------------------------------------------------
export default function BibleScreen(): React.JSX.Element {
  const [testament, setTestament] = useState<Testament>('old');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [showChapterModal, setShowChapterModal] = useState<boolean>(false);
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);

  const books = testament === 'old' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;

  // ----------------------------------------------------------------
  // Load chapter
  // ----------------------------------------------------------------
  const loadChapter = useCallback(
    async (book: BibleBook, chapter: number): Promise<void> => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterData(null);
      try {
        const data = await fetchChapter(book.name, chapter);
        setChapterData(data);
        setSelectedChapter(chapter);
      } catch (err: unknown) {
        setChapterError(
          err instanceof Error ? err.message : 'Failed to load chapter.'
        );
      } finally {
        setIsLoadingChapter(false);
      }
    },
    []
  );

  const handleBookPress = useCallback((book: BibleBook): void => {
    setSelectedBook(book);
    setShowChapterModal(true);
  }, []);

  const handleChapterSelect = useCallback(
    (chapter: number): void => {
      setShowChapterModal(false);
      if (selectedBook) {
        loadChapter(selectedBook, chapter);
      }
    },
    [selectedBook, loadChapter]
  );

  const handleBack = useCallback((): void => {
    setChapterData(null);
    setSelectedChapter(null);
    setChapterError(null);
  }, []);

  // ----------------------------------------------------------------
  // Render book list
  // ----------------------------------------------------------------
  const renderBook = useCallback(
    ({ item }: ListRenderItemInfo<BibleBook>): React.JSX.Element => (
      <TouchableOpacity
        style={bibleStyles.bookRow}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.75}
      >
        <View style={bibleStyles.bookIcon}>
          <Text style={bibleStyles.bookIconText}>📖</Text>
        </View>
        <View style={bibleStyles.bookInfo}>
          <Text style={bibleStyles.bookName}>{item.name}</Text>
          <Text style={bibleStyles.bookChapters}>{item.chapters} chapters</Text>
        </View>
        <Text style={bibleStyles.chevron}>›</Text>
      </TouchableOpacity>
    ),
    [handleBookPress]
  );

  const renderVerse = useCallback(
    ({ item }: ListRenderItemInfo<BibleVerse>): React.JSX.Element => (
      <VerseItem verse={item} fontSize={fontSize} />
    ),
    [fontSize]
  );

  // ----------------------------------------------------------------
  // Render chapter view
  // ----------------------------------------------------------------
  if (chapterData && selectedBook && selectedChapter) {
    return (
      <View style={bibleStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={bibleStyles.chapterHeader}
        >
          <TouchableOpacity onPress={handleBack} style={bibleStyles.backBtn}>
            <Text style={bibleStyles.backText}>← Books</Text>
          </TouchableOpacity>
          <Text style={bibleStyles.chapterTitle}>
            {selectedBook.name} {selectedChapter}
          </Text>
          {/* Font size controls */}
          <View style={bibleStyles.fontControls}>
            <TouchableOpacity
              onPress={() => setFontSize((s) => Math.max(12, s - 2))}
              style={bibleStyles.fontBtn}
            >
              <Text style={bibleStyles.fontBtnText}>A-</Text>
            </TouchableOpacity>
            <Text style={bibleStyles.fontSizeDisplay}>{fontSize}</Text>
            <TouchableOpacity
              onPress={() => setFontSize((s) => Math.min(28, s + 2))}
              style={bibleStyles.fontBtn}
            >
              <Text style={bibleStyles.fontBtnText}>A+</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Navigation */}
        <View style={bibleStyles.chapterNav}>
          <TouchableOpacity
            style={[
              bibleStyles.navBtn,
              selectedChapter <= 1 ? bibleStyles.navBtnDisabled : null,
            ]}
            disabled={selectedChapter <= 1}
            onPress={() => loadChapter(selectedBook, selectedChapter - 1)}
          >
            <Text style={bibleStyles.navBtnText}>‹ Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowChapterModal(true)}
            style={bibleStyles.chapterPill}
          >
            <Text style={bibleStyles.chapterPillText}>
              Chapter {selectedChapter}/{selectedBook.chapters}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              bibleStyles.navBtn,
              selectedChapter >= selectedBook.chapters
                ? bibleStyles.navBtnDisabled
                : null,
            ]}
            disabled={selectedChapter >= selectedBook.chapters}
            onPress={() => loadChapter(selectedBook, selectedChapter + 1)}
          >
            <Text style={bibleStyles.navBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>

        <FlatList<BibleVerse>
          data={chapterData.verses}
          renderItem={renderVerse}
          keyExtractor={(v) => `${v.chapter}:${v.verse}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={bibleStyles.versesContent}
        />

        {selectedBook && showChapterModal && (
          <ChapterModal
            book={selectedBook}
            onSelect={handleChapterSelect}
            onClose={() => setShowChapterModal(false)}
          />
        )}
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Loading chapter
  // ----------------------------------------------------------------
  if (isLoadingChapter) {
    return (
      <View style={bibleStyles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={bibleStyles.loadingText}>
          Loading {selectedBook?.name} {selectedChapter}...
        </Text>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Chapter error
  // ----------------------------------------------------------------
  if (chapterError) {
    return (
      <View style={bibleStyles.centered}>
        <Text style={bibleStyles.errorEmoji}>📵</Text>
        <Text style={bibleStyles.errorText}>{chapterError}</Text>
        <TouchableOpacity
          style={bibleStyles.retryBtn}
          onPress={() =>
            selectedBook && selectedChapter
              ? loadChapter(selectedBook, selectedChapter)
              : undefined
          }
        >
          <Text style={bibleStyles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBack} style={{ marginTop: SPACING.md }}>
          <Text style={{ color: COLORS.primary }}>← Back to books</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Book list view
  // ----------------------------------------------------------------
  return (
    <View style={bibleStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={bibleStyles.header}
      >
        <Text style={bibleStyles.headerTitle}>Bible</Text>
        <Text style={bibleStyles.headerSubtitle}>World English Bible</Text>

        {/* Testament Tabs */}
        <View style={bibleStyles.tabRow}>
          <TouchableOpacity
            style={[bibleStyles.tab, testament === 'old' ? bibleStyles.tabActive : null]}
            onPress={() => setTestament('old')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                bibleStyles.tabText,
                testament === 'old' ? bibleStyles.tabTextActive : null,
              ]}
            >
              Old Testament
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[bibleStyles.tab, testament === 'new' ? bibleStyles.tabActive : null]}
            onPress={() => setTestament('new')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                bibleStyles.tabText,
                testament === 'new' ? bibleStyles.tabTextActive : null,
              ]}
            >
              New Testament
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList<BibleBook>
        data={books}
        renderItem={renderBook}
        keyExtractor={(b) => String(b.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={bibleStyles.bookList}
        ListHeaderComponent={
          <Text style={bibleStyles.bookCount}>
            {books.length} books · Tap to read
          </Text>
        }
      />

      {selectedBook && showChapterModal && (
        <ChapterModal
          book={selectedBook}
          onSelect={handleChapterSelect}
          onClose={() => setShowChapterModal(false)}
        />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const bibleStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: {
    paddingTop: 48,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '800',
    color: COLORS.white,
    paddingHorizontal: SPACING.base,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accentLight,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.md,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.base,
    backgroundColor: COLORS.overlayLight,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: { color: COLORS.primary },
  bookCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  bookList: { paddingBottom: SPACING['4xl'] },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  bookIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  bookIconText: { fontSize: 22 },
  bookInfo: { flex: 1 },
  bookName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  bookChapters: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.midGray,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.midGray,
    fontWeight: '300',
  },
  chapterHeader: {
    paddingTop: 48,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.base,
  },
  backBtn: { marginBottom: SPACING.sm },
  backText: {
    color: COLORS.accentLight,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600',
  },
  chapterTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  fontBtn: {
    backgroundColor: COLORS.overlayLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  fontBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  fontSizeDisplay: {
    color: COLORS.accentLight,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  chapterNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  navBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  chapterPill: {
    backgroundColor: COLORS.offWhite,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  chapterPillText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '700',
  },
  versesContent: { paddingBottom: SPACING['4xl'] },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundPrimary,
    paddingHorizontal: SPACING['2xl'],
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.midGray,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  errorEmoji: { fontSize: 40, marginBottom: SPACING.md },
  errorText: {
    color: COLORS.darkGray,
    fontSize: TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
    marginBottom: SPACING.base,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});
