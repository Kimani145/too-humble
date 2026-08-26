import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { BibleHighlight, BibleNote, ChapterAnnotations } from '../types/database.types';
import { annotationCacheKey } from '../constants/bibleAnnotations';

// ── Fetch all annotations for a chapter (highlights + notes) ──────────────────
// Strategy: local cache first / fallback + cloud sync when authenticated.
export async function getChapterAnnotations(
  userId: string | null | undefined,
  translationId: string,
  bookId: string,
  chapter: number
): Promise<ChapterAnnotations> {
  const effectiveUserId = userId || 'guest';
  const cacheKey = annotationCacheKey(effectiveUserId, translationId, bookId, chapter);

  if (userId && userId !== 'guest') {
    try {
      const [hlRes, noteRes] = await Promise.all([
        supabase.from('bible_highlights').select('*')
          .eq('user_id', userId)
          .eq('translation_id', translationId)
          .eq('book_id', bookId)
          .eq('chapter', chapter)
          .is('deleted_at', null),
        supabase.from('bible_notes').select('*')
          .eq('user_id', userId)
          .eq('translation_id', translationId)
          .eq('book_id', bookId)
          .eq('chapter', chapter),
      ]);

      if (!hlRes.error && !noteRes.error) {
        const result: ChapterAnnotations = {
          highlights: (hlRes.data ?? []) as BibleHighlight[],
          notes:      (noteRes.data ?? []) as BibleNote[],
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      }
    } catch {
      // Fall through to local cache
    }
  }

  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) return JSON.parse(raw) as ChapterAnnotations;
  } catch {
    // ignore
  }
  return { highlights: [], notes: [] };
}

// ── Upsert highlight (single or range) ────────────────────────────────────────
export async function upsertHighlight(
  userId: string | null | undefined,
  translationId: string,
  bookId: string,
  bookName: string,
  chapter: number,
  verseNumber: number,
  verseText: string,
  color: string
): Promise<void> {
  await upsertHighlightRange(
    userId,
    translationId,
    bookId,
    bookName,
    chapter,
    [{ verseNumber, verseText }],
    color
  );
}

export async function upsertHighlightRange(
  userId: string | null | undefined,
  translationId: string,
  bookId: string,
  bookName: string,
  chapter: number,
  verses: { verseNumber: number; verseText: string }[],
  color: string
): Promise<void> {
  if (verses.length === 0) return;
  const effectiveUserId = userId || 'guest';
  const cacheKey = annotationCacheKey(effectiveUserId, translationId, bookId, chapter);
  const verseNumbers = verses.map((v) => v.verseNumber);

  // 1. Update local AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    const annotations: ChapterAnnotations = cached
      ? JSON.parse(cached)
      : { highlights: [], notes: [] };

    const updatedHighlights = annotations.highlights.filter(
      (h) => !verseNumbers.includes(h.verse_number)
    );

    for (const v of verses) {
      updatedHighlights.push({
        id: `hl-${Date.now()}-${v.verseNumber}`,
        user_id: effectiveUserId,
        translation_id: translationId,
        book_id: bookId,
        book_name: bookName,
        chapter,
        verse_number: v.verseNumber,
        verse_text: v.verseText,
        color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      });
    }

    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ ...annotations, highlights: updatedHighlights })
    );
  } catch {
    // ignore
  }

  // 2. Sync to Supabase if authenticated
  if (userId && userId !== 'guest') {
    try {
      await supabase
        .from('bible_highlights')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('translation_id', translationId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .in('verse_number', verseNumbers)
        .is('deleted_at', null);

      const inserts = verses.map((v) => ({
        user_id: userId,
        translation_id: translationId,
        book_id: bookId,
        book_name: bookName,
        chapter,
        verse_number: v.verseNumber,
        verse_text: v.verseText,
        color,
        deleted_at: null,
      }));

      await supabase.from('bible_highlights').insert(inserts);
    } catch {
      // ignore
    }
  }
}

// ── Remove highlight ──────────────────────────────────────────────────────────
export async function removeHighlight(
  userId: string | null | undefined,
  translationId: string,
  bookId: string,
  chapter: number,
  verseNumber: number
): Promise<void> {
  await removeHighlightRange(userId, translationId, bookId, chapter, [verseNumber]);
}

export async function removeHighlightRange(
  userId: string | null | undefined,
  translationId: string,
  bookId: string,
  chapter: number,
  verseNumbers: number[]
): Promise<void> {
  if (verseNumbers.length === 0) return;
  const effectiveUserId = userId || 'guest';
  const cacheKey = annotationCacheKey(effectiveUserId, translationId, bookId, chapter);

  // 1. Update local AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const annotations: ChapterAnnotations = JSON.parse(cached);
      const updatedHighlights = annotations.highlights.filter(
        (h) => !verseNumbers.includes(h.verse_number)
      );
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ ...annotations, highlights: updatedHighlights })
      );
    }
  } catch {
    // ignore
  }

  // 2. Sync to Supabase if authenticated
  if (userId && userId !== 'guest') {
    try {
      await supabase
        .from('bible_highlights')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('translation_id', translationId)
        .eq('book_id', bookId)
        .eq('chapter', chapter)
        .in('verse_number', verseNumbers)
        .is('deleted_at', null);
    } catch {
      // ignore
    }
  }
}

// ── Upsert note ───────────────────────────────────────────────────────────────
export async function upsertNote(
  userId: string,
  translationId: string,
  bookId: string,
  bookName: string,
  chapter: number,
  verseNumber: number,
  verseText: string,
  noteText: string,
  verseEnd?: number
): Promise<void> {
  const { error } = await supabase.from('bible_notes').upsert(
    {
      user_id: userId,
      translation_id: translationId,
      book_id: bookId,
      book_name: bookName,
      chapter,
      verse_number: verseNumber,
      verse_text: verseText,
      note_text: noteText,
      verse_end: verseEnd ?? verseNumber,
    },
    { onConflict: 'user_id,translation_id,book_id,chapter,verse_number' }
  );
  if (error) throw error;
}

// ── Remove note ───────────────────────────────────────────────────────────────
export async function removeNote(
  userId: string,
  translationId: string,
  bookId: string,
  chapter: number,
  verseNumber: number
): Promise<void> {
  const { error } = await supabase.from('bible_notes').delete()
    .eq('user_id', userId).eq('translation_id', translationId)
    .eq('book_id', bookId).eq('chapter', chapter)
    .eq('verse_number', verseNumber);
  if (error) throw error;
}

// ── Get all annotations for the user (My Notes screen) ───────────────────────
export async function getUserAnnotations(userId: string): Promise<{
  highlights: BibleHighlight[];
  notes: BibleNote[];
}> {
  const [hlRes, noteRes] = await Promise.all([
    supabase.from('bible_highlights').select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('book_id').order('chapter').order('verse_number'),
    supabase.from('bible_notes').select('*')
      .eq('user_id', userId).order('book_id').order('chapter').order('verse_number'),
  ]);
  return {
    highlights: (hlRes.data ?? []) as BibleHighlight[],
    notes:      (noteRes.data ?? []) as BibleNote[],
  };
}
