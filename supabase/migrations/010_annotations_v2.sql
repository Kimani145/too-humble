-- ============================================================
-- HIGHLIGHTS: soft delete support
-- ============================================================

-- Add soft-delete column
ALTER TABLE public.bible_highlights
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Drop the hard UNIQUE constraint (it blocks soft-delete inserts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bible_highlights_user_id_translation_id_book_id_chapter_verse_nu'
       OR conname LIKE 'bible_highlights_%unique%'
       OR conname LIKE '%highlights%user_id%'
  ) THEN
    ALTER TABLE public.bible_highlights
      DROP CONSTRAINT IF EXISTS
      bible_highlights_user_id_translation_id_book_id_chapter_verse_number_key;
  END IF;
END $$;

-- Partial unique index: only ONE active (non-deleted) highlight per verse
-- Historical (soft-deleted) rows are allowed to accumulate
CREATE UNIQUE INDEX IF NOT EXISTS idx_highlights_active_unique
  ON public.bible_highlights(user_id, translation_id, book_id, chapter, verse_number)
  WHERE deleted_at IS NULL;

-- Index for history queries (user's full highlight history, ordered)
CREATE INDEX IF NOT EXISTS idx_highlights_deleted_at
  ON public.bible_highlights(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================
-- NOTES: multi-verse range support
-- ============================================================

-- verse_number remains the anchor (start) verse
-- verse_end is the last verse in the selection
-- NULL verse_end means single-verse note (verse_end = verse_number implicitly)
ALTER TABLE public.bible_notes
  ADD COLUMN IF NOT EXISTS verse_end INT;

-- Existing notes: backfill verse_end to match verse_number (single-verse)
UPDATE public.bible_notes
  SET verse_end = verse_number
  WHERE verse_end IS NULL;
