// =============================================================================
// TOO HUMBLE - BIBLE SCREEN
// Dual-tab (Old Testament / New Testament) with adjustable font size
// =============================================================================

import React, {
  useState,
  useCallback,
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
  ListRenderItemInfo,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
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
} from '../../types/database.types';
import { recordChapterRead } from '../../services/streakService';
import { BUNDLED_TRANSLATIONS, DEUTEROCANONICAL_COMMON_NAMES, DEFAULT_TRANSLATION_ID, BibleTranslationMeta } from '../../constants/bibleTranslations';
import { useTheme, AppColors } from '../../context/ThemeContext';
import GlobalHeader from '../../components/GlobalHeader';
import { useWebLayout } from '../../hooks/useWebLayout';
import ContextPanel from '../../components/web/ContextPanel';
import BibleDesktopNavigator from '../../components/web/BibleDesktopNavigator';
import BibleOfflineState from '../../components/BibleOfflineState';
import { BookRowSkeleton } from '../../components/skeletons/BookRowSkeleton';
import NetInfo from '@react-native-community/netinfo';
import {
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
} from '../../constants/theme';

type Testament = 'old' | 'new';

// -----------------------------------------------------------------------
// Chapter selector modal
// -----------------------------------------------------------------------
interface ChapterModalProps {
  book: AOLabBook;
  onSelect: (chapter: number) => void;
  onClose: () => void;
}

function ChapterModal({ book, onSelect, onClose }: ChapterModalProps): React.JSX.Element {
  const { colors } = useTheme();
  const styles = getModalStyles(colors);
  const chapters = Array.from({ length: book.numberOfChapters }, (_, i) => i + 1);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{book.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Select a chapter</Text>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {chapters.map((ch) => (
              <TouchableOpacity
                key={ch}
                style={styles.chapterBtn}
                onPress={() => onSelect(ch)}
                activeOpacity={0.8}
              >
                <Text style={styles.chapterNum}>{ch}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------
// Verse item renderer (handles headings, verses, and line breaks)
// -----------------------------------------------------------------------
interface ContentItemProps {
  item: AOLabContentItem;
  fontSize: number;
  isHighlighted?: boolean;
}

function ContentItem({ item, fontSize, isHighlighted }: ContentItemProps): React.JSX.Element {
  const { colors } = useTheme();
  const styles = getVerseStyles(colors);

  if (item.type === 'verse') {
    const text = item.content
      .map((c) => (typeof c === 'string' ? c : c.text || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return (
      <View
        style={[
          styles.container,
          isHighlighted && {
            backgroundColor: colors.primary + '1F',
            borderColor: colors.primary,
            borderWidth: 1.5,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xs,
          },
        ]}
      >
        <Text style={[styles.verseNum, { fontSize: fontSize - 2, color: colors.primary, fontWeight: isHighlighted ? '800' : '600' }]}>
          {item.number} {isHighlighted ? '📍' : ''}
        </Text>
        <Text style={[styles.verseText, { fontSize, lineHeight: fontSize * 1.7, color: colors.textPrimary }]}>
          {text}
        </Text>
      </View>
    );
  }

  if (item.type === 'heading') {
    const text = item.content
      .map((c) => (typeof c === 'string' ? c : c.text || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return (
      <View style={{ paddingHorizontal: SPACING.base, paddingTop: SPACING.md, paddingBottom: SPACING.xs }}>
        <Text style={{ fontSize: fontSize + 2, fontWeight: '700', color: colors.textPrimary }}>
          {text}
        </Text>
      </View>
    );
  }

  // line_break
  return <View style={{ height: 12 }} />;
}

interface QuickAccessProps {
  onQuickAccess: (book: AOLabBook) => void;
  otBooks: AOLabBook[];
  ntBooks: AOLabBook[];
}

function QuickAccessWidget({ onQuickAccess, otBooks, ntBooks }: QuickAccessProps) {
  const { colors } = useTheme();
  const psalmsBook = otBooks.find(b => b.id === 'PSA');
  const johnBook = ntBooks.find(b => b.id === 'JHN');
  const romansBook = ntBooks.find(b => b.id === 'ROM');

  const quickAccessBooks = [psalmsBook, johnBook, romansBook].filter(Boolean) as AOLabBook[];

  if (quickAccessBooks.length === 0) return null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>Quick Access</Text>
      </View>
      {quickAccessBooks.map((b) => (
        <TouchableOpacity
          key={b.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
          onPress={() => onQuickAccess(b)}
        >
          <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '600' }}>{b.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {b.testament === 'old' ? 'OT' : 'NT'} • {b.numberOfChapters} chs
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// -----------------------------------------------------------------------
// BibleScreen
// -----------------------------------------------------------------------
export default function BibleScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const bibleStyles = getBibleStyles(colors);
  const { isWide } = useWebLayout();

  const routeParams = useLocalSearchParams<{ book?: string; bookId?: string; chapter?: string; verse?: string }>();
  const [highlightVerseNum, setHighlightVerseNum] = useState<number | null>(null);

  const [webFontSize, setWebFontSize] = useState<number>(16);

  const [translationId, setTranslationId] = useState<string>(DEFAULT_TRANSLATION_ID);
  const [otBooks, setOtBooks] = useState<AOLabBook[]>([]);
  const [ntBooks, setNtBooks] = useState<AOLabBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [booksLoading, setBooksLoading] = useState<boolean>(true);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [testament, setTestament] = useState<Testament>('old');
  const [selectedBook, setSelectedBook] = useState<AOLabBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<AOLabChapter | null>(null);
  const [showChapterModal, setShowChapterModal] = useState<boolean>(false);
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);
  const [showTranslationModal, setShowTranslationModal] = useState<boolean>(false);
  const [availableTranslations, setAvailableTranslations] = useState<BibleTranslationMeta[]>(BUNDLED_TRANSLATIONS);

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
            setIsLoadingChapter(true);
            try {
              const data = await fetchChapter(tId, found.id, restoreChapter);
              setChapterData(data);
              setIsOffline(false);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to load chapter.';
              if (msg === 'OFFLINE_NO_CACHE') {
                const manifest = await getCachedChapterManifest();
                setOfflineManifest(manifest);
                setIsOffline(true);
              } else {
                setChapterError(msg);
              }
            } finally {
              setIsLoadingChapter(false);
            }
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
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const prefs = await loadBiblePreferences();
        setTranslationId(prefs.translationId);

        // Pre-cache essential chapters
        preCacheEssentialChapters(prefs.translationId).catch(() => {});

        // Fetch translations to update availability
        const translations = await fetchAvailableTranslations();
        setAvailableTranslations(translations);

        // Load books
        await loadBooks(prefs.translationId, prefs.selectedBookId, prefs.selectedChapter);
      } catch (err) {
        setBooksError('Failed to load Bible.');
        setIsLoadingBooks(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected;
      if (isConnected === false && !chapterData) {
        getCachedChapterManifest().then((manifest) => {
          setOfflineManifest(manifest);
          setIsOffline(true);
        }).catch(() => {});
      } else if (isConnected === true) {
        setIsOffline(false);
      }
    });
    return () => unsubscribe();
  }, [chapterData]);

  const handleTranslationChange = async (newTranslationId: string) => {
    setShowTranslationModal(false);
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
      await saveBiblePreferences({
        translationId: newTranslationId,
        selectedBookId: null,
        selectedChapter: null,
      });
    }

    // Reload books
    await loadBooks(newTranslationId, selectedBook ? selectedBook.id : null, selectedChapter);
  };

  // ----------------------------------------------------------------
  // Callbacks — declared before any early return to avoid TDZ errors.
  // Rule: all useCallback hooks and derived values must come before
  // any conditional return statement in this component.
  // ----------------------------------------------------------------
  const books = testament === 'old' ? otBooks : ntBooks;

  const loadChapter = useCallback(
    async (book: AOLabBook, chapter: number, tId: string = translationId): Promise<void> => {
      setIsLoadingChapter(true);
      setChapterError(null);
      setChapterData(null);
      try {
        const data = await fetchChapter(tId, book.id, chapter);
        setChapterData(data);
        recordChapterRead(book.commonName, chapter).catch(() => {});
        setSelectedChapter(chapter);
        setIsOffline(false);
        await saveBiblePreferences({
          translationId: tId,
          selectedBookId: book.id,
          selectedChapter: chapter,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load chapter.';
        if (msg === 'OFFLINE_NO_CACHE') {
          const manifest = await getCachedChapterManifest();
          setOfflineManifest(manifest);
          setIsOffline(true);
        } else {
          setChapterError(msg);
        }
      } finally {
        setIsLoadingChapter(false);
      }
    },
    [translationId]
  );

  const handleBookPress = useCallback((book: AOLabBook): void => {
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
  }, []);

  const handleNextChapter = useCallback((): void => {
    if (!selectedBook || selectedChapter === null) return;
    if (selectedChapter < selectedBook.numberOfChapters) {
      loadChapter(selectedBook, selectedChapter + 1);
    }
  }, [selectedBook, selectedChapter, loadChapter]);

  const handlePrevChapter = useCallback((): void => {
    if (!selectedBook || selectedChapter === null) return;
    if (selectedChapter > 1) {
      loadChapter(selectedBook, selectedChapter - 1);
    }
  }, [selectedBook, selectedChapter, loadChapter]);

  const renderBookItem = useCallback(
    ({ item }: ListRenderItemInfo<AOLabBook>): React.JSX.Element => (
      <TouchableOpacity
        style={bibleStyles.bookCard}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.7}
      >
        <View style={bibleStyles.bookLeft}>
          <Text style={bibleStyles.bookName}>{item.name}</Text>
          <Text style={bibleStyles.bookGenre}>
            {item.testament === 'old' ? 'Old Testament' : 'New Testament'}
          </Text>
        </View>
        <View style={bibleStyles.bookRight}>
          <Text style={bibleStyles.chapterCount}>
            {item.numberOfChapters} {item.numberOfChapters === 1 ? 'ch' : 'chs'}
          </Text>
          <View style={bibleStyles.arrowCircle}>
            <Text style={{ fontSize: 12, color: colors.primary }}>➔</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleBookPress, bibleStyles, colors]
  );

  useEffect(() => {
    const rawBook = routeParams.book || routeParams.bookId;
    const rawChapter = routeParams.chapter;
    const rawVerse = routeParams.verse;

    if (rawBook && rawChapter && (otBooks.length > 0 || ntBooks.length > 0)) {
      const targetChapterNum = parseInt(rawChapter, 10);
      const targetVerseNum = rawVerse ? parseInt(rawVerse, 10) : null;
      const matchedId = BOOK_NAME_TO_ID[rawBook] || rawBook.toUpperCase();

      const allBooks = [...otBooks, ...ntBooks];
      const found = allBooks.find((b) => {
        const nb = rawBook.toLowerCase().trim();
        return (
          b.id.toUpperCase() === matchedId ||
          b.name.toLowerCase() === nb ||
          b.commonName.toLowerCase() === nb ||
          (nb === 'psalm' && b.id === 'PSA') ||
          (nb === 'psalms' && b.id === 'PSA')
        );
      });

      if (found && !isNaN(targetChapterNum)) {
        setSelectedBook(found);
        setSelectedChapter(targetChapterNum);
        setHighlightVerseNum(targetVerseNum);
        loadChapter(found, targetChapterNum, translationId);
      }
    }
  }, [routeParams.book, routeParams.bookId, routeParams.chapter, routeParams.verse, otBooks, ntBooks, translationId, loadChapter]);

  const renderContentItem = useCallback(
    ({ item }: ListRenderItemInfo<AOLabContentItem>): React.JSX.Element => (
      <ContentItem
        item={item}
        fontSize={fontSize}
        isHighlighted={item.type === 'verse' && item.number === highlightVerseNum}
      />
    ),
    [fontSize, highlightVerseNum]
  );

  // ----------------------------------------------------------------
  // Platform split — desktop uses BibleDesktopNavigator, mobile uses
  // the inline book list + chapter FlatList below.
  // ----------------------------------------------------------------
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={[bibleStyles.container, { flex: 1 }]}>
          <BibleDesktopNavigator
            fontSize={webFontSize}
            onFontSizeChange={setWebFontSize}
            otBooks={otBooks}
            ntBooks={ntBooks}
            availableTranslations={availableTranslations}
          />
        </View>
        {isWide && (
          <ContextPanel>
            {/* Card 1: Reading Guide */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>Reading Guide</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                The Bible contains books across the Old and New Testaments. Discover and study scripture across multiple translations available offline.
              </Text>
            </View>

            {/* Card 2: Quick Access */}
            <QuickAccessWidget onQuickAccess={(b) => handleBookPress(b)} otBooks={otBooks} ntBooks={ntBooks} />
          </ContextPanel>
        )}
      </View>
    );
  }

  if (isOffline) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <GlobalHeader />
        <BibleOfflineState
          cachedChapters={offlineManifest}
          onSelectCached={(bookId, chapter, tId) => {
            setIsOffline(false);
            const book = [...otBooks, ...ntBooks].find((b) => b.id === bookId);
            if (book) {
              loadChapter(book, chapter, tId);
            }
          }}
        />
      </View>
    );
  }



  // ----------------------------------------------------------------
  // Render chapter view
  // ----------------------------------------------------------------
  const renderContent = () => {
    if (booksLoading || isLoadingBooks) {
      return (
        <View>
          {Array.from({ length: 12 }, (_, i) => <BookRowSkeleton key={i} />)}
        </View>
      );
    }

    if (booksError) {
      return (
        <View style={bibleStyles.centered}>
          <Text style={bibleStyles.errorEmoji}>⚠️</Text>
          <Text style={[bibleStyles.errorText, { color: colors.textPrimary }]}>{booksError}</Text>
          <TouchableOpacity
            style={[bibleStyles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => loadBooks(translationId)}
          >
            <Text style={bibleStyles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (chapterData && selectedBook && selectedChapter) {
      return (
        <View style={[bibleStyles.container, Platform.OS === 'web' && bibleStyles.webContent]}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
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

          <FlatList<AOLabContentItem>
            data={chapterData.content}
            renderItem={renderContentItem}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={bibleStyles.versesContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Navigation Bar at Bottom of Chapter */}
          <View style={bibleStyles.navBar}>
            <TouchableOpacity
              onPress={handlePrevChapter}
              disabled={selectedChapter === 1}
              style={[bibleStyles.navBtn, selectedChapter === 1 ? bibleStyles.navBtnDisabled : null]}
            >
              <Text style={bibleStyles.navBtnText}>◀ Prev</Text>
            </TouchableOpacity>

            <View style={bibleStyles.chapterPill}>
              <Text style={bibleStyles.chapterPillText}>Ch {selectedChapter}</Text>
            </View>

            <TouchableOpacity
              onPress={handleNextChapter}
              disabled={selectedChapter === selectedBook.numberOfChapters}
              style={[
                bibleStyles.navBtn,
                selectedChapter === selectedBook.numberOfChapters ? bibleStyles.navBtnDisabled : null,
              ]}
            >
              <Text style={bibleStyles.navBtnText}>Next ▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isLoadingChapter) {
      return (
        <View style={bibleStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[bibleStyles.loadingText, { color: colors.textSecondary }]}>Loading chapter...</Text>
        </View>
      );
    }

    if (chapterError) {
      return (
        <View style={bibleStyles.centered}>
          <Text style={bibleStyles.errorEmoji}>⚠️</Text>
          <Text style={[bibleStyles.errorText, { color: colors.textPrimary }]}>{chapterError}</Text>
          <TouchableOpacity
            style={[bibleStyles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => selectedBook && selectedChapter && loadChapter(selectedBook, selectedChapter)}
          >
            <Text style={bibleStyles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBack} style={{ marginTop: 20 }}>
            <Text style={{ color: colors.primary }}>← Back to books</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[bibleStyles.container, Platform.OS === 'web' && bibleStyles.webContent]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <GlobalHeader />

        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={bibleStyles.header}
        >
          {/* Translation Picker Row */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.overlayLight,
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: BORDER_RADIUS.full,
              }}
              onPress={() => setShowTranslationModal(true)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginRight: 6 }}>
                📖 {availableTranslations.find((t) => t.id === translationId)?.label || translationId}
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 10 }}>▼</Text>
            </TouchableOpacity>
          </View>

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

        <FlatList<AOLabBook>
          data={books}
          renderItem={renderBookItem}
          keyExtractor={(b) => b.id}
          contentContainerStyle={bibleStyles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {selectedBook && showChapterModal && (
          <ChapterModal
            book={selectedBook}
            onSelect={handleChapterSelect}
            onClose={() => setShowChapterModal(false)}
          />
        )}

        {showTranslationModal && (
          <Modal transparent animationType="fade" visible={showTranslationModal} onRequestClose={() => setShowTranslationModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.backgroundCard, width: '100%', maxWidth: 340, borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, textAlign: 'center' }}>
                  Select Translation
                </Text>
                <FlatList
                  data={availableTranslations}
                  keyExtractor={(t) => t.id}
                  renderItem={({ item }) => {
                    const isSelected = item.id === translationId;
                    return (
                      <TouchableOpacity
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                          opacity: item.available ? 1 : 0.5,
                        }}
                        disabled={!item.available}
                        onPress={() => handleTranslationChange(item.id)}
                      >
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: isSelected ? '700' : '600', color: isSelected ? colors.primary : colors.textPrimary }}>
                            {item.label}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                            {item.languageLabel}
                          </Text>
                        </View>
                        {!item.available && (
                          <View style={{ backgroundColor: colors.lightGray, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>Soon</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity
                  style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.lightGray, borderRadius: 8 }}
                  onPress={() => setShowTranslationModal(false)}
                >
                  <Text style={{ fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  const content = renderContent();

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>{content}</View>
        <ContextPanel>
          {/* Card 1: Reading Guide */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>Reading Guide</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              The Bible contains books across the Old and New Testaments. Discover and study scripture across multiple translations available offline.
            </Text>
          </View>

          {/* Card 2: Quick Access */}
          <QuickAccessWidget onQuickAccess={(b) => handleBookPress(b)} otBooks={otBooks} ntBooks={ntBooks} />
        </ContextPanel>
      </View>
    );
  }

  return content;
}

// -----------------------------------------------------------------------
// Styles Generator
// -----------------------------------------------------------------------
const getModalStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayDark,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.backgroundCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.lightGray,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.lightGray,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      gap: 12,
    },
    chapterBtn: {
      width: 52,
      height: 52,
      borderRadius: 8,
      backgroundColor: colors.lightGray,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterNum: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });

const getVerseStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'flex-start',
    },
    verseNum: {
      fontWeight: '800',
      marginRight: 12,
      minWidth: 24,
      marginTop: 2,
    },
    verseText: {
      flex: 1,
    },
  });

const getBibleStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    webContent: {
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center' as const,
    },
    header: {
      paddingTop: 16,
      paddingBottom: 16,
    },
    tabRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      backgroundColor: colors.overlayLight,
      borderRadius: 9999,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 9999,
    },
    tabActive: {
      backgroundColor: '#FFFFFF',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentLight,
    },
    tabTextActive: { color: colors.primary },
    listContent: {
      padding: 16,
      paddingBottom: 80,
    },
    bookCard: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    bookLeft: {
      flex: 1,
    },
    bookName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    bookGenre: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    bookRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chapterCount: {
      fontSize: 12,
      color: colors.textMuted,
      marginRight: 12,
    },
    arrowCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.overlayLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterHeader: {
      paddingTop: 48,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    backBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.overlayLight,
      borderRadius: 9999,
    },
    backText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    chapterTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    fontControls: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.overlayLight,
      borderRadius: 9999,
      padding: 2,
    },
    fontBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fontBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    fontSizeDisplay: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      marginHorizontal: 4,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.backgroundCard,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    navBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    navBtnDisabled: { opacity: 0.3 },
    navBtnText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 12,
    },
    chapterPill: {
      backgroundColor: colors.lightGray,
      borderRadius: 9999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chapterPillText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    versesContent: { paddingBottom: 80 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundPrimary,
      paddingHorizontal: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    errorEmoji: { fontSize: 40, marginBottom: 12 },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryBtn: {
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 9999,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 16,
    },
  });
