import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { BibleHighlight, BibleNote, ChapterAnnotations } from '../types/database.types';
import { annotationCacheKey } from '../constants/bibleAnnotations';

// ── Fetch all annotations for a chapter (highlights + notes) ──────────────────
// Strategy: try network, fall back to cache. Always updates cache on success.
export async function getChapterAnnotations(
  userId: string,
  translationId: string,
  bookId: string,
  chapter: number
): Promise<ChapterAnnotations> {
  const cacheKey = annotationCacheKey(userId, translationId, bookId, chapter);

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

    if (hlRes.error) throw hlRes.error;
    if (noteRes.error) throw noteRes.error;

    const result: ChapterAnnotations = {
      highlights: (hlRes.data ?? []) as BibleHighlight[],
      notes:      (noteRes.data ?? []) as BibleNote[],
    };
    // Update cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch {
    // Network failed — try cache
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) return JSON.parse(raw) as ChapterAnnotations;
    return { highlights: [], notes: [] };
  }
}

// ── Upsert highlight ──────────────────────────────────────────────────────────
export async function upsertHighlight(
  userId: string,
  translationId: string,
  bookId: string,
  bookName: string,
  chapter: number,
  verseNumber: number,
  verseText: string,
  color: string
): Promise<void> {
  // Step 1: soft-delete any existing active highlight for this verse
  const { error: softDeleteError } = await supabase
    .from('bible_highlights')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('translation_id', translationId)
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .eq('verse_number', verseNumber)
    .is('deleted_at', null);
  if (softDeleteError) throw softDeleteError;

  // Step 2: insert the new highlight
  const { error: insertError } = await supabase
    .from('bible_highlights')
    .insert({
      user_id: userId,
      translation_id: translationId,
      book_id: bookId,
      book_name: bookName,
      chapter,
      verse_number: verseNumber,
      verse_text: verseText,
      color,
      deleted_at: null,
    });
  if (insertError) throw insertError;
}

// ── Remove highlight ──────────────────────────────────────────────────────────
export async function removeHighlight(
  userId: string,
  translationId: string,
  bookId: string,
  chapter: number,
  verseNumber: number
): Promise<void> {
  const { error } = await supabase
    .from('bible_highlights')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('translation_id', translationId)
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .eq('verse_number', verseNumber)
    .is('deleted_at', null);
  if (error) throw error;
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
