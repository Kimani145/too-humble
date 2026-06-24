// =============================================================================
// TOO HUMBLE - BIBLE SERVICE
// Targets the AO Lab / bible-api.com free Bible API
// https://bible-api.com/
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BibleBook, BibleVerse, BibleChapter, DailyVerse } from '../types/database.types';
import { BIBLE_API_BASE } from '../constants/theme';

// -----------------------------------------------------------------------
// Cache keys
// -----------------------------------------------------------------------
const CACHE_KEY_DAILY_VERSE = '@too_humble:daily_verse';
const CACHE_KEY_CHAPTER_PREFIX = '@too_humble:chapter:';

// -----------------------------------------------------------------------
// Static Bible book list (39 OT + 27 NT = 66 books)
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

// -----------------------------------------------------------------------
// API response shape from bible-api.com
// -----------------------------------------------------------------------
interface BibleApiVerseResponse {
  reference: string;
  verses: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  text: string;
  translation_id: string;
  translation_name: string;
}

// -----------------------------------------------------------------------
// fetchChapter — fetch all verses for a book+chapter
// -----------------------------------------------------------------------
export async function fetchChapter(
  bookName: string,
  chapter: number
): Promise<BibleChapter> {
  const cacheKey = `${CACHE_KEY_CHAPTER_PREFIX}${bookName.toLowerCase()}:${chapter}`;

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as BibleChapter;
    }
  } catch {
    // Cache miss — continue to fetch
  }

  const reference = encodeURIComponent(`${bookName} ${chapter}`);
  const url = `${BIBLE_API_BASE}/${reference}?translation=web`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Bible API error: ${response.status} for ${bookName} ${chapter}`);
  }

  const data = (await response.json()) as BibleApiVerseResponse;

  const verses: BibleVerse[] = data.verses.map((v, idx) => ({
    id: idx + 1,
    book: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.replace(/\n/g, ' ').trim(),
  }));

  const result: BibleChapter = { book: bookName, chapter, verses };

  // Persist to cache
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    // Cache write failed — non-critical
  }

  return result;
}

// -----------------------------------------------------------------------
// fetchVerse — fetch a single verse by reference (e.g., "John 3:16")
// -----------------------------------------------------------------------
export async function fetchVerse(reference: string): Promise<BibleVerse> {
  const encoded = encodeURIComponent(reference);
  const url = `${BIBLE_API_BASE}/${encoded}?translation=web`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Bible API error: ${response.status}`);
  }

  const data = (await response.json()) as BibleApiVerseResponse;
  const v = data.verses[0];

  return {
    id: 1,
    book: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.replace(/\n/g, ' ').trim(),
  };
}

// -----------------------------------------------------------------------
// getDailyVerse — auto-rotates based on day-of-year, with caching
// Falls back to offline pool when network unavailable
// -----------------------------------------------------------------------
export async function getDailyVerse(): Promise<DailyVerse> {
  const today = new Date().toDateString();

  // Check if we already fetched today's verse
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

  // Pick a rotation reference based on day of year
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
    'Psalm 23:1-3',
    'Matthew 5:3',
    'Psalm 46:1',
    'Psalm 121:1-2',
    'John 14:27',
    'Romans 15:13',
    'Ephesians 2:8-9',
    'Psalm 139:14',
    'Hebrews 11:1',
  ];

  const ref = DAILY_REFS[dayOfYear % DAILY_REFS.length];

  try {
    const verse = await fetchVerse(ref);
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
    // Offline fallback
    const fallback = FALLBACK_VERSES[dayOfYear % FALLBACK_VERSES.length];
    return { ...fallback, fetchedAt: new Date().toISOString() };
  }
}

// -----------------------------------------------------------------------
// searchVerses — simple keyword search using bible-api.com
// -----------------------------------------------------------------------
export async function searchVerses(query: string): Promise<BibleVerse[]> {
  if (!query.trim()) return [];

  const encoded = encodeURIComponent(query.trim());
  const url = `${BIBLE_API_BASE}/${encoded}?translation=web`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as BibleApiVerseResponse;

  return data.verses.map((v, idx) => ({
    id: idx + 1,
    book: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.replace(/\n/g, ' ').trim(),
  }));
}

// -----------------------------------------------------------------------
// getBookByAbbreviation — lookup helper
// -----------------------------------------------------------------------
export function getBookByAbbreviation(abbr: string): BibleBook | undefined {
  return ALL_BOOKS.find(
    (b) => b.abbreviation.toLowerCase() === abbr.toLowerCase()
  );
}

// -----------------------------------------------------------------------
// getBookByName — lookup helper
// -----------------------------------------------------------------------
export function getBookByName(name: string): BibleBook | undefined {
  return ALL_BOOKS.find(
    (b) => b.name.toLowerCase() === name.toLowerCase()
  );
}
