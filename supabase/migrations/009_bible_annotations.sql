-- ============================================================
-- BIBLE ANNOTATIONS — user highlights and notes per verse
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bible_highlights (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  translation_id TEXT NOT NULL DEFAULT 'BSB',
  book_id        TEXT NOT NULL,
  book_name      TEXT NOT NULL,
  chapter        INT  NOT NULL,
  verse_number   INT  NOT NULL,
  verse_text     TEXT NOT NULL,
  color          TEXT NOT NULL DEFAULT '#FFD166',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, translation_id, book_id, chapter, verse_number)
);

CREATE TABLE IF NOT EXISTS public.bible_notes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  translation_id TEXT NOT NULL DEFAULT 'BSB',
  book_id        TEXT NOT NULL,
  book_name      TEXT NOT NULL,
  chapter        INT  NOT NULL,
  verse_number   INT  NOT NULL,
  verse_text     TEXT NOT NULL,
  note_text      TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, translation_id, book_id, chapter, verse_number)
);

CREATE INDEX IF NOT EXISTS idx_highlights_user_book
  ON public.bible_highlights(user_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_notes_user_book
  ON public.bible_notes(user_id, book_id, chapter);

ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_notes      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_highlights" ON public.bible_highlights;
DROP POLICY IF EXISTS "owner_notes"      ON public.bible_notes;

CREATE POLICY "owner_highlights" ON public.bible_highlights
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_notes" ON public.bible_notes
  FOR ALL USING (auth.uid() = user_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS set_highlights_updated_at ON public.bible_highlights;
DROP TRIGGER IF EXISTS set_notes_updated_at      ON public.bible_notes;
CREATE TRIGGER set_highlights_updated_at
  BEFORE UPDATE ON public.bible_highlights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.bible_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
