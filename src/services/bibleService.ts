// =============================================================================
// TOO HUMBLE - BIBLE SERVICE
// Targets the AO Lab Bible API (https://bible.helloao.org)
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BibleBook,
  BibleVerse,
  BibleChapter,
  DailyVerse,
  AOLabBook,
  AOLabChapter,
  AOLabApiChapterResponse,
  AOLabVerse,
  BiblePreferences
} from '../types/database.types';
import {
  AO_LAB_BASE,
  BUNDLED_TRANSLATIONS,
  BibleTranslationMeta,
  DEFAULT_TRANSLATION_ID
} from '../constants/bibleTranslations';

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
const CACHE_KEY_DAILY_VERSE = '@too_humble:daily_verse';
export const BIBLE_PREFERENCES_KEY = 'bible_user_preferences';

// -----------------------------------------------------------------------
// Deprecated Legacy Book List for Backward Compatibility
// -----------------------------------------------------------------------
export const OLD_TESTAMENT_BOOKS: BibleBook[] = [
  { id: 1,  name: 'Genesis',         testament: 'old', chapters: 50, abbreviation: 'gen'  },
  { id: 2,  name: 'Exodus',          testament: 'old', chapters: 40, abbreviation: 'exo'  },
  { id: 3,  name: 'Leviticus',       testament: 'old', chapters: 27, abbreviation: 'lev'  },
  { id: 4,  name: 'Numbers',         testament: 'old', chapters: 36, abbreviation: 'num'  },
  { id: 5,  name: 'Deuteronomy',     testament: 'old', chapters: 34, abbreviation: 'deu'  },
  { id: 6,  name: 'Joshua',          testament: 'old', chapters: 24, abbreviation: 'jos'  },
  { id: 7,  name: 'Judges',          testament: 'old', chapters: 21, abbreviation: 'jdg'  },
  { id: 8,  name: 'Ruth',            testament: 'old', chapters: 4,  abbreviation: 'rut'  },
  { id: 9,  name: '1 Samuel',        testament: 'old', chapters: 31, abbreviation: '1sa'  },
  { id: 10, name: '2 Samuel',        testament: 'old', chapters: 24, abbreviation: '2sa'  },
  { id: 11, name: '1 Kings',         testament: 'old', chapters: 22, abbreviation: '1ki'  },
  { id: 12, name: '2 Kings',         testament: 'old', chapters: 25, abbreviation: '2ki'  },
  { id: 13, name: '1 Chronicles',    testament: 'old', chapters: 29, abbreviation: '1ch'  },
  { id: 14, name: '2 Chronicles',    testament: 'old', chapters: 36, abbreviation: '2ch'  },
  { id: 15, name: 'Ezra',            testament: 'old', chapters: 10, abbreviation: 'ezr'  },
  { id: 16, name: 'Nehemiah',        testament: 'old', chapters: 13, abbreviation: 'neh'  },
  { id: 17, name: 'Esther',          testament: 'old', chapters: 10, abbreviation: 'est'  },
  { id: 18, name: 'Job',             testament: 'old', chapters: 42, abbreviation: 'job'  },
  { id: 19, name: 'Psalms',          testament: 'old', chapters: 150,abbreviation: 'psa'  },
  { id: 20, name: 'Proverbs',        testament: 'old', chapters: 31, abbreviation: 'pro'  },
  { id: 21, name: 'Ecclesiastes',    testament: 'old', chapters: 12, abbreviation: 'ecc'  },
  { id: 22, name: 'Song of Solomon', testament: 'old', chapters: 8,  abbreviation: 'sng'  },
  { id: 23, name: 'Isaiah',          testament: 'old', chapters: 66, abbreviation: 'isa'  },
  { id: 24, name: 'Jeremiah',        testament: 'old', chapters: 52, abbreviation: 'jer'  },
  { id: 25, name: 'Lamentations',    testament: 'old', chapters: 5,  abbreviation: 'lam'  },
  { id: 26, name: 'Ezekiel',         testament: 'old', chapters: 48, abbreviation: 'ezk'  },
  { id: 27, name: 'Daniel',          testament: 'old', chapters: 12, abbreviation: 'dan'  },
  { id: 28, name: 'Hosea',           testament: 'old', chapters: 14, abbreviation: 'hos'  },
  { id: 29, name: 'Joel',            testament: 'old', chapters: 3,  abbreviation: 'jol'  },
  { id: 30, name: 'Amos',            testament: 'old', chapters: 9,  abbreviation: 'amo'  },
  { id: 31, name: 'Obadiah',         testament: 'old', chapters: 1,  abbreviation: 'oba'  },
  { id: 32, name: 'Jonah',           testament: 'old', chapters: 4,  abbreviation: 'jon'  },
  { id: 33, name: 'Micah',           testament: 'old', chapters: 7,  abbreviation: 'mic'  },
  { id: 34, name: 'Nahum',           testament: 'old', chapters: 3,  abbreviation: 'nam'  },
  { id: 35, name: 'Habakkuk',        testament: 'old', chapters: 3,  abbreviation: 'hab'  },
  { id: 36, name: 'Zephaniah',       testament: 'old', chapters: 3,  abbreviation: 'zep'  },
  { id: 37, name: 'Haggai',          testament: 'old', chapters: 2,  abbreviation: 'hag'  },
  { id: 38, name: 'Zechariah',       testament: 'old', chapters: 14, abbreviation: 'zec'  },
  { id: 39, name: 'Malachi',         testament: 'old', chapters: 4,  abbreviation: 'mal'  },
];

export const NEW_TESTAMENT_BOOKS: BibleBook[] = [
  { id: 40, name: 'Matthew',          testament: 'new', chapters: 28, abbreviation: 'mat' },
  { id: 41, name: 'Mark',             testament: 'new', chapters: 16, abbreviation: 'mrk' },
  { id: 42, name: 'Luke',             testament: 'new', chapters: 24, abbreviation: 'luk' },
  { id: 43, name: 'John',             testament: 'new', chapters: 21, abbreviation: 'jhn' },
  { id: 44, name: 'Acts',             testament: 'new', chapters: 28, abbreviation: 'act' },
  { id: 45, name: 'Romans',           testament: 'new', chapters: 16, abbreviation: 'rom' },
  { id: 46, name: '1 Corinthians',    testament: 'new', chapters: 16, abbreviation: '1co' },
  { id: 47, name: '2 Corinthians',    testament: 'new', chapters: 13, abbreviation: '2co' },
  { id: 48, name: 'Galatians',        testament: 'new', chapters: 6,  abbreviation: 'gal' },
  { id: 49, name: 'Ephesians',        testament: 'new', chapters: 6,  abbreviation: 'eph' },
  { id: 50, name: 'Philippians',      testament: 'new', chapters: 4,  abbreviation: 'php' },
  { id: 51, name: 'Colossians',       testament: 'new', chapters: 4,  abbreviation: 'col' },
  { id: 52, name: '1 Thessalonians',  testament: 'new', chapters: 5,  abbreviation: '1th' },
  { id: 53, name: '2 Thessalonians',  testament: 'new', chapters: 3,  abbreviation: '2th' },
  { id: 54, name: '1 Timothy',        testament: 'new', chapters: 6,  abbreviation: '1ti' },
  { id: 55, name: '2 Timothy',        testament: 'new', chapters: 4,  abbreviation: '2ti' },
  { id: 56, name: 'Titus',            testament: 'new', chapters: 3,  abbreviation: 'tit' },
  { id: 57, name: 'Philemon',         testament: 'new', chapters: 1,  abbreviation: 'phm' },
  { id: 58, name: 'Hebrews',          testament: 'new', chapters: 13, abbreviation: 'heb' },
  { id: 59, name: 'James',            testament: 'new', chapters: 5,  abbreviation: 'jas' },
  { id: 60, name: '1 Peter',          testament: 'new', chapters: 5,  abbreviation: '1pe' },
  { id: 61, name: '2 Peter',          testament: 'new', chapters: 3,  abbreviation: '2pe' },
  { id: 62, name: '1 John',           testament: 'new', chapters: 5,  abbreviation: '1jn' },
  { id: 63, name: '2 John',           testament: 'new', chapters: 1,  abbreviation: '2jn' },
  { id: 64, name: '3 John',           testament: 'new', chapters: 1,  abbreviation: '3jn' },
  { id: 65, name: 'Jude',             testament: 'new', chapters: 1,  abbreviation: 'jud' },
  { id: 66, name: 'Revelation',       testament: 'new', chapters: 22, abbreviation: 'rev' },
];

export const ALL_BOOKS: BibleBook[] = [
  ...OLD_TESTAMENT_BOOKS,
  ...NEW_TESTAMENT_BOOKS,
];

// Helper maps
const BOOK_NAME_TO_ID: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
  'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
  '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
  'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Psalm': 'PSA',
  'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA',
  'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
  'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC', 'Nahum': 'NAM',
  'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT', 'Romans': 'ROM',
  '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL', 'Ephesians': 'EPH',
  'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH',
  '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB',
  'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
};

const BOOK_ID_TO_NAME: Record<string, string> = {
  'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
  'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  'EZR': 'Ezra', 'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms',
  'PRO': 'Proverbs', 'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah',
  'JER': 'Jeremiah', 'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea',
  'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah', 'MIC': 'Micah', 'NAM': 'Nahum',
  'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi',
  'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'ACT': 'Acts', 'ROM': 'Romans',
  '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians', 'EPH': 'Ephesians',
  'PHP': 'Philippians', 'COL': 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy', 'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews',
  'JAS': 'James', '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
  '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
};

// -----------------------------------------------------------------------
// Daily verse fallback pool (offline)
// -----------------------------------------------------------------------
const FALLBACK_VERSES: DailyVerse[] = [
  {
    reference: 'Proverbs 3:5',
    text: 'Trust in the Lord with all your heart and lean not on your own understanding.',
    book: 'Proverbs', chapter: 3, verse: 5,
    fetchedAt: new Date().toISOString(),
  },
  {
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ who strengthens me.',
    book: 'Philippians', chapter: 4, verse: 13,
    fetchedAt: new Date().toISOString(),
  },
  {
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    book: 'John', chapter: 3, verse: 16,
    fetchedAt: new Date().toISOString(),
  },
  {
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    book: 'Romans', chapter: 8, verse: 28,
    fetchedAt: new Date().toISOString(),
  },
  {
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.',
    book: 'Jeremiah', chapter: 29, verse: 11,
    fetchedAt: new Date().toISOString(),
  },
  {
    reference: 'Isaiah 40:31',
    text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    book: 'Isaiah', chapter: 40, verse: 31,
    fetchedAt: new Date().toISOString(),
  },
  {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd, I lack nothing.',
    book: 'Psalms', chapter: 23, verse: 1,
    fetchedAt: new Date().toISOString(),
  },
];

// NT books mapping
const NT_BOOK_IDS = new Set([
  'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO',
  'GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB',
  'JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'
]);

// -----------------------------------------------------------------------
// New AO Lab Service API
// -----------------------------------------------------------------------

export async function fetchBooks(translationId: string): Promise<AOLabBook[]> {
  const cacheKey = `bible_books_${translationId}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { data: AOLabBook[]; fetchedAt: number };
      if (Date.now() - parsed.fetchedAt < 86400000) {
        return parsed.data;
      }
    }
  } catch {
    // ignore cache read failure
  }

  const url = `${AO_LAB_BASE}/${translationId}/books.json`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Failed to fetch books: ${response.status}`);
  }

  const data = (await response.json()) as { books?: Array<{ id: string; name: string; commonName: string; numberOfChapters: number }> };
  const rawBooks = Array.isArray(data?.books) ? data.books : [];
  const books: AOLabBook[] = rawBooks.map((b) => ({
    id: b.id,
    name: b.name,
    commonName: b.commonName,
    numberOfChapters: b.numberOfChapters,
    testament: NT_BOOK_IDS.has(b.id) ? 'new' : 'old',
  }));

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: books, fetchedAt: Date.now() }));
  } catch {
    // ignore cache write failure
  }

  return books;
}

export async function fetchChapter(
  translationId: string,
  bookId: string,
  chapter: number
): Promise<AOLabChapter> {
  const cacheKey = `bible_cache_${translationId}_${bookId}_${chapter}`;

  try {
    const response = await fetch(`${AO_LAB_BASE}/${translationId}/${bookId}/${chapter}.json`, {
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const raw = (await response.json()) as AOLabApiChapterResponse;
      const content = Array.isArray(raw.chapter?.content) ? raw.chapter.content : [];
      const chapterData: AOLabChapter = {
        book: raw.book,
        chapter: { number: raw.chapter?.number ?? chapter },
        numberOfVerses: raw.numberOfVerses ?? content.length,
        previousChapterApiLink: raw.previousChapterApiLink ?? null,
        nextChapterApiLink: raw.nextChapterApiLink ?? null,
        content,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(chapterData));
      return chapterData;
    }
  } catch {
    // network issue, try offline cache
  }

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as AOLabChapter & { chapter?: { content?: AOLabChapter['content'] } };
      if (!Array.isArray(parsed.content) && Array.isArray(parsed.chapter?.content)) {
        parsed.content = parsed.chapter.content;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(parsed)).catch(() => {});
      }
      return parsed as AOLabChapter;
    }
  } catch {
    // cache read failure
  }

  throw new Error('OFFLINE_NO_CACHE');
}

export async function fetchAvailableTranslations(): Promise<BibleTranslationMeta[]> {
  const cacheKey = 'bible_available_translations';

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { data: BibleTranslationMeta[]; fetchedAt: number };
      if (Date.now() - parsed.fetchedAt < 86400000) {
        return parsed.data;
      }
    }
  } catch {
    // ignore cache read failure
  }

  try {
    const url = `${AO_LAB_BASE}/available_translations.json`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (response.ok) {
      const data = (await response.json()) as { translations: Array<{ id: string; name: string; englishName: string; language: string; shortName: string }> };
      const apiIds = new Set(data.translations.map((t) => t.id));

      const updated = BUNDLED_TRANSLATIONS.map((bt) => ({
        ...bt,
        available: bt.available && apiIds.has(bt.id),
      }));

      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: updated, fetchedAt: Date.now() }));
      return updated;
    }
  } catch {
    // ignore network failure
  }

  return BUNDLED_TRANSLATIONS;
}

export async function saveBiblePreferences(prefs: BiblePreferences): Promise<void> {
  await AsyncStorage.setItem(BIBLE_PREFERENCES_KEY, JSON.stringify(prefs));
}

export async function loadBiblePreferences(): Promise<BiblePreferences> {
  try {
    const raw = await AsyncStorage.getItem(BIBLE_PREFERENCES_KEY);
    if (raw) {
      return JSON.parse(raw) as BiblePreferences;
    }
  } catch {
    // ignore read failure
  }
  return {
    translationId: DEFAULT_TRANSLATION_ID,
    selectedBookId: null,
    selectedChapter: null,
  };
}

export async function getCachedChapterManifest(): Promise<Array<{ translationId: string; bookId: string; chapter: number; bookName: string }>> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith('bible_cache_'));
    const manifest: Array<{ translationId: string; bookId: string; chapter: number; bookName: string }> = [];

    for (const key of cacheKeys) {
      const parts = key.split('_');
      if (parts.length >= 5) {
        const chapter = parseInt(parts.pop() || '', 10);
        const bookId = parts.pop() || '';
        const translationId = parts.slice(2).join('_');
        if (!isNaN(chapter) && bookId && translationId) {
          const bookName = BOOK_ID_TO_NAME[bookId] || bookId;
          manifest.push({ translationId, bookId, chapter, bookName });
        }
      }
    }
    return manifest;
  } catch {
    return [];
  }
}

export async function preCacheEssentialChapters(translationId: string): Promise<void> {
  const doneKey = `bible_precache_done_${translationId}`;
  try {
    const isDone = await AsyncStorage.getItem(doneKey);
    if (isDone) {
      return;
    }

    const essentials = [
      { bookId: 'GEN', chapter: 1 },  // Genesis 1
      { bookId: 'PSA', chapter: 23 }, // Psalm 23
      { bookId: 'JHN', chapter: 1 },  // John 1
      { bookId: 'ROM', chapter: 8 },  // Romans 8
      { bookId: 'PHP', chapter: 4 },  // Philippians 4
    ];

    for (const item of essentials) {
      try {
        await fetchChapter(translationId, item.bookId, item.chapter);
      } catch {
        // silently fail for individual chapter fetching
      }
    }

    await AsyncStorage.setItem(doneKey, '1');
  } catch {
    // silently fail
  }
}

// Helper to map AOLab verses back to legacy formats if needed for daily verses
export async function fetchVerse(reference: string, translationId: string = DEFAULT_TRANSLATION_ID): Promise<BibleVerse> {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)(-\d+)?$/);
  if (!match) {
    throw new Error(`Invalid verse reference format: ${reference}`);
  }

  const bookName = match[1].trim();
  const chapterNum = parseInt(match[2], 10);
  const verseNum = parseInt(match[3], 10);
  const bookId = BOOK_NAME_TO_ID[bookName];

  if (!bookId) {
    throw new Error(`Unknown book name in reference: ${bookName}`);
  }

  const chapterData = await fetchChapter(translationId, bookId, chapterNum);

  const verseItem = chapterData.content.find(
    (item) => item.type === 'verse' && item.number === verseNum
  ) as AOLabVerse | undefined;

  const text = verseItem
    ? verseItem.content
        .map((c) => (typeof c === 'string' ? c : c.text || ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return {
    id: verseNum,
    book: bookName,
    chapter: chapterNum,
    verse: verseNum,
    text,
  };
}

export async function getDailyVerse(): Promise<DailyVerse> {
  const today = new Date().toDateString();

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_DAILY_VERSE);
    if (cached) {
      const parsed = JSON.parse(cached) as DailyVerse;
      if (new Date(parsed.fetchedAt).toDateString() === today) {
        return parsed;
      }
    }
  } catch {
    // Cache miss
  }

  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    ) - 1;

  const DAILY_REFS = [
    'Proverbs 3:5',
    'Philippians 4:13',
    'John 3:16',
    'Romans 8:28',
    'Jeremiah 29:11',
    'Isaiah 40:31',
    'Psalm 23:1',
    'Matthew 5:3',
    'Psalm 46:1',
    'Psalm 121:1',
    'John 14:27',
    'Romans 15:13',
    'Ephesians 2:8',
    'Psalm 139:14',
    'Hebrews 11:1',
  ];

  const ref = DAILY_REFS[dayOfYear % DAILY_REFS.length];

  try {
    const verse = await fetchVerse(ref, DEFAULT_TRANSLATION_ID);
    const daily: DailyVerse = {
      reference: ref,
      text: verse.text,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      fetchedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(CACHE_KEY_DAILY_VERSE, JSON.stringify(daily));
    return daily;
  } catch {
    const fallback = FALLBACK_VERSES[dayOfYear % FALLBACK_VERSES.length];
    return { ...fallback, fetchedAt: new Date().toISOString() };
  }
}
